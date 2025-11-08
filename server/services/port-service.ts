import { exec } from "node:child_process";
import { promisify } from "node:util";
import {
	categorizeProcess,
	type DockerContainerInfo,
	type ProcessCategory,
} from "./category-service";
import { getConnectionCount } from "./connection-service";
import { getDockerPortMappings } from "./docker-service";
import { collectProcessMetadata } from "./process-metadata-service";
import { parseLsofOutput } from "./unix-port-parser";

const execAsync = promisify(exec);

export type ConnectionStatus = "active" | "idle";

export type { DockerContainerInfo, ProcessCategory };

export interface PortInfo {
	port: number;
	pid: number;
	processName: string;
	protocol: string;
	address: string;
	connectionStatus: ConnectionStatus;
	connectionCount: number;
	lastAccessed?: Date;
	commandPath?: string;
	cwd?: string;
	user?: string;
	appName?: string;
	appIconPath?: string;
	category: ProcessCategory;
	dockerContainer?: DockerContainerInfo;
	cpuUsage?: number;
	memoryUsage?: number;
	memoryRSS?: number;
	processStartTime?: Date;
}

/**
 * Get all listening ports on the system
 * Uses lsof on macOS/Linux, netstat on Windows
 */
export async function getListeningPorts(): Promise<PortInfo[]> {
	const platform = process.platform;

	try {
		if (platform === "darwin" || platform === "linux") {
			return await getPortsUnix();
		}
		if (platform === "win32") {
			return await getPortsWindows();
		}
		throw new Error(`Unsupported platform: ${platform}`);
	} catch (error) {
		console.error("Error getting ports:", error);
		throw new Error(
			`Failed to retrieve port information: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Get ports on Unix-like systems (macOS, Linux) using lsof
 */
async function getPortsUnix(): Promise<PortInfo[]> {
	// Get Docker container port mappings first
	const dockerPortMap = await getDockerPortMappings();

	// Use lsof to get listening TCP and UDP ports
	const { stdout } = await execAsync("lsof +c 0 -i -P -n | grep LISTEN || true");

	// Parse lsof output to extract basic info
	const basicPortInfo = parseLsofOutput(stdout);

	// Collect metadata for all processes in parallel
	const metadataPromises = basicPortInfo.map(async (info) => {
		const { processName, pid, user, protocol, port, bindAddress } = info;

		// Get connection count for this port and PID (server-side connections only)
		const connectionCount = await getConnectionCount(port, pid);
		const connectionStatus: ConnectionStatus = connectionCount > 0 ? "active" : "idle";
		const lastAccessed = connectionCount > 0 ? new Date() : undefined;

		// Collect process metadata (including resource usage and start time)
		const { commandPath, cwd, appName, appIconPath, cpuUsage, memoryUsage, memoryRSS, processStartTime } = await collectProcessMetadata(pid, processName);

		// Check if this port belongs to a Docker container
		let dockerContainer: DockerContainerInfo | undefined;
		let finalAppName = appName;

		if (processName === "com.docker.backend" || appName === "Docker") {
			dockerContainer = dockerPortMap.get(port);
			if (dockerContainer) {
				finalAppName = dockerContainer.name;
			}
		}

		// Determine process category
		const category = categorizeProcess(processName, finalAppName, commandPath, dockerContainer);

		return {
			port,
			pid,
			processName,
			protocol,
			address: bindAddress,
			connectionStatus,
			connectionCount,
			lastAccessed,
			commandPath,
			cwd,
			user,
			appName: finalAppName,
			appIconPath,
			category,
			dockerContainer,
			cpuUsage,
			memoryUsage,
			memoryRSS,
			processStartTime,
		} as PortInfo;
	});

	// Wait for all metadata collection to complete
	const ports = await Promise.all(metadataPromises);

	// Remove duplicates (same port/pid combination from IPv4/IPv6)
	const uniquePorts = new Map<string, PortInfo>();
	for (const port of ports) {
		const key = `${port.port}-${port.pid}`;
		if (!uniquePorts.has(key)) {
			uniquePorts.set(key, port);
		}
	}

	// Sort by port number
	return Array.from(uniquePorts.values()).sort((a, b) => a.port - b.port);
}

/**
 * Get ports on Windows using netstat
 */
async function getPortsWindows(): Promise<PortInfo[]> {
	const { stdout } = await execAsync('netstat -ano | findstr "LISTENING" || echo.');

	const lines = stdout.trim().split("\n").filter(Boolean);
	const ports: PortInfo[] = [];

	for (const line of lines) {
		const parts = line.trim().split(/\s+/);
		if (parts.length < 5) continue;

		const protocol = parts[0];
		const localAddress = parts[1];
		const pid = Number.parseInt(parts[4], 10);

		const [address, portStr] = localAddress.split(":");
		const port = Number.parseInt(portStr, 10);

		if (Number.isNaN(port) || Number.isNaN(pid)) continue;

		// Get process name from PID
		let processName = "unknown";
		try {
			const { stdout: taskOutput } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
			const taskParts = taskOutput.split(",");
			if (taskParts.length > 0) {
				processName = taskParts[0].replace(/"/g, "");
			}
		} catch {
			// If tasklist fails, leave as "unknown"
		}

		const category = categorizeProcess(processName, undefined, undefined);

		ports.push({
			port,
			pid,
			processName,
			protocol,
			address,
			connectionStatus: "idle",
			connectionCount: 0,
			category,
		});
	}

	return ports.sort((a, b) => a.port - b.port);
}

/**
 * Kill a process by PID
 * Only kills processes owned by the current user for security
 */
export async function killProcess(pid: number): Promise<void> {
	const platform = process.platform;

	try {
		if (platform === "win32") {
			await execAsync(`taskkill /PID ${pid} /F`);
		} else {
			// Check if we own the process
			try {
				const { stdout } = await execAsync(`ps -p ${pid} -o user=`);
				const processUser = stdout.trim();
				const currentUser = process.env.USER || process.env.USERNAME || "";

				if (processUser !== currentUser) {
					throw new Error("Cannot kill process: insufficient permissions (own processes only)");
				}
			} catch (error) {
				if (error instanceof Error && error.message.includes("insufficient")) {
					throw error;
				}
				throw new Error(`Process ${pid} not found`);
			}

			await execAsync(`kill ${pid}`);
		}
	} catch (error) {
		if (error instanceof Error && error.message.includes("insufficient")) {
			throw error;
		}
		throw new Error(
			`Failed to kill process ${pid}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
