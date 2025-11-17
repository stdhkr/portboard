import { getProtectedPorts } from "../config/server-state";
import {
	categorizeProcess,
	type DockerContainerInfo,
	type ProcessCategory,
} from "./category-service";
import { getDockerPortMappings } from "./docker-service";
import { getPlatformProviderSingleton } from "./platform";

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
	isSelfPort?: boolean;
}

/**
 * Get all listening ports on the system
 * Uses platform abstraction layer for cross-platform support
 */
export async function getListeningPorts(): Promise<PortInfo[]> {
	try {
		const platformProvider = getPlatformProviderSingleton();

		// Run Docker and port info in parallel (independent operations)
		const [dockerPortMap, basicPortInfo] = await Promise.all([
			getDockerPortMappings(),
			platformProvider.portProvider.getListeningPorts(),
		]);

		// Batch collect connection counts and process metadata in parallel
		const portPidPairs: Array<[number, number]> = basicPortInfo.map((info) => [
			info.port,
			info.pid,
		]);
		const pidProcessPairs = basicPortInfo.map((info) => ({
			pid: info.pid,
			processName: info.processName,
		}));

		const [connectionCountMap, metadataMap] = await Promise.all([
			platformProvider.portProvider.getBatchConnectionCounts(portPidPairs),
			platformProvider.processProvider.getBatchProcessMetadata(pidProcessPairs),
		]);

		// Get all protected Portboard ports (API server + Vite dev server)
		const protectedPorts = getProtectedPorts();

		// Combine all the data
		const ports: PortInfo[] = basicPortInfo.map((info) => {
			const { processName, pid, protocol, port, bindAddress } = info;

			// Get connection count from batch results
			const connectionCount = connectionCountMap.get(`${port}-${pid}`) || 0;
			const connectionStatus: ConnectionStatus = connectionCount > 0 ? "active" : "idle";
			const lastAccessed = connectionCount > 0 ? new Date() : undefined;

			// Get metadata from batch results
			const metadata = metadataMap.get(pid) || {};
			const {
				commandPath,
				cwd,
				appName,
				appIconPath,
				cpuUsage,
				memoryUsage,
				memoryRSS,
				processStartTime,
			} = metadata;

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

			// Check if this is a Portboard protected port (API server or Vite dev server)
			const isSelfPort = protectedPorts.includes(port);

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
				appName: finalAppName,
				appIconPath,
				category,
				dockerContainer,
				cpuUsage,
				memoryUsage,
				memoryRSS,
				processStartTime,
				isSelfPort,
			} as PortInfo;
		});

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
	} catch (error) {
		console.error("Error getting ports:", error);
		throw new Error(
			`Failed to retrieve port information: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Kill a process by PID
 * Only kills processes owned by the current user for security
 */
export async function killProcess(pid: number): Promise<void> {
	const platformProvider = getPlatformProviderSingleton();
	await platformProvider.processProvider.killProcess(pid);
}
