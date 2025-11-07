import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface PortInfo {
	port: number;
	pid: number;
	processName: string;
	protocol: string;
	address: string;
	state: string;
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
	// Use lsof to get listening TCP and UDP ports
	// -i: internet connections
	// -P: show port numbers instead of service names
	// -n: don't resolve hostnames
	// -sTCP:LISTEN: show only listening TCP connections
	const { stdout } = await execAsync(
		"lsof -i -P -n | grep LISTEN || true",
	);

	const lines = stdout.trim().split("\n").filter(Boolean);
	const ports: PortInfo[] = [];

	for (const line of lines) {
		// Parse lsof output
		// Format: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
		// Example: node    1234 user   23u  IPv4 0x1234      0t0  TCP 127.0.0.1:3000 (LISTEN)
		const parts = line.split(/\s+/);
		if (parts.length < 10) continue;

		const processName = parts[0];
		const pid = Number.parseInt(parts[1], 10);
		const protocol = parts[7]; // TCP or UDP
		const addressWithState = parts[8]; // e.g., 127.0.0.1:3000 or *:3000

		// Extract port and address from the NAME field
		// Remove (LISTEN) suffix if present
		const address = addressWithState.replace(/\(LISTEN\)$/, "");

		// Extract port from address (format: address:port)
		const portMatch = address.match(/:(\d+)$/);
		if (!portMatch) continue;

		const port = Number.parseInt(portMatch[1], 10);
		if (Number.isNaN(port)) continue;

		// Extract bind address (everything before the last colon)
		const bindAddress = address.substring(0, address.lastIndexOf(":")) || "*";

		ports.push({
			port,
			pid,
			processName,
			protocol,
			address: bindAddress,
			state: "LISTEN",
		});
	}

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
	// netstat -ano shows all connections with PID
	// findstr LISTENING filters for listening connections
	const { stdout } = await execAsync(
		'netstat -ano | findstr "LISTENING" || echo.',
	);

	const lines = stdout.trim().split("\n").filter(Boolean);
	const ports: PortInfo[] = [];

	for (const line of lines) {
		// Parse netstat output
		// Format: Proto  Local Address          Foreign Address        State           PID
		// Example: TCP    127.0.0.1:3000         0.0.0.0:0              LISTENING       1234
		const parts = line.trim().split(/\s+/);
		if (parts.length < 5) continue;

		const protocol = parts[0];
		const localAddress = parts[1];
		const pid = Number.parseInt(parts[4], 10);

		// Extract port and address
		const [address, portStr] = localAddress.split(":");
		const port = Number.parseInt(portStr, 10);

		if (Number.isNaN(port) || Number.isNaN(pid)) continue;

		// Get process name from PID (using tasklist)
		let processName = "unknown";
		try {
			const { stdout: taskOutput } = await execAsync(
				`tasklist /FI "PID eq ${pid}" /FO CSV /NH`,
			);
			const taskParts = taskOutput.split(",");
			if (taskParts.length > 0) {
				processName = taskParts[0].replace(/"/g, "");
			}
		} catch {
			// If tasklist fails, leave as "unknown"
		}

		ports.push({
			port,
			pid,
			processName,
			protocol,
			address,
			state: "LISTENING",
		});
	}

	// Sort by port number
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
			// Windows: use taskkill
			await execAsync(`taskkill /PID ${pid} /F`);
		} else {
			// Unix: use kill
			// First check if we own the process
			try {
				const { stdout } = await execAsync(`ps -p ${pid} -o user=`);
				const processUser = stdout.trim();
				const currentUser = process.env.USER || process.env.USERNAME || "";

				if (processUser !== currentUser) {
					throw new Error(
						"Cannot kill process: insufficient permissions (own processes only)",
					);
				}
			} catch (error) {
				if (error instanceof Error && error.message.includes("insufficient")) {
					throw error;
				}
				throw new Error(`Process ${pid} not found`);
			}

			// Kill the process
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
