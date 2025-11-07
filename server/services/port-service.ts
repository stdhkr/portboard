import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export type ProcessCategory =
	| "system"
	| "development"
	| "database"
	| "web-server"
	| "user";

export interface PortInfo {
	port: number;
	pid: number;
	processName: string;
	protocol: string;
	address: string;
	state: string;
	commandPath?: string;
	user?: string;
	appName?: string;
	category: ProcessCategory;
}

/**
 * Determine the category of a process based on its name, app name, and command path
 */
function categorizeProcess(
	processName: string,
	appName: string | undefined,
	commandPath: string | undefined,
): ProcessCategory {
	const name = (appName || processName).toLowerCase();
	const path = (commandPath || "").toLowerCase();

	// System processes
	if (
		path.startsWith("/system/") ||
		processName === "rapportd" ||
		processName === "ControlCenter" ||
		name.includes("kernel") ||
		name.includes("launchd")
	) {
		return "system";
	}

	// Development tools
	if (
		name.includes("visual studio code") ||
		name.includes("code") ||
		name.includes("vscode") ||
		name.includes("cursor") ||
		name.includes("raycast") ||
		name.includes("figma") ||
		name.includes("exosphere") ||
		name.includes("intellij") ||
		name.includes("pycharm") ||
		name.includes("webstorm") ||
		name.includes("goland") ||
		name.includes("android studio") ||
		name.includes("xcode") ||
		name.includes("sublime") ||
		name.includes("atom") ||
		name.includes("vim") ||
		name.includes("emacs") ||
		name.includes("postman") ||
		name.includes("insomnia") ||
		name.includes("docker desktop")
	) {
		return "development";
	}

	// Database servers
	if (
		name.includes("postgres") ||
		name.includes("mysql") ||
		name.includes("mariadb") ||
		name.includes("redis") ||
		name.includes("mongodb") ||
		name.includes("mongo") ||
		name.includes("cassandra") ||
		name.includes("elasticsearch") ||
		name.includes("sqlite")
	) {
		return "database";
	}

	// Web servers
	if (
		name.includes("nginx") ||
		name.includes("apache") ||
		name.includes("httpd") ||
		name.includes("caddy") ||
		name.includes("traefik")
	) {
		return "web-server";
	}

	// Default to user application
	return "user";
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
	// +c 0: show full command names (no width limit)
	// -i: internet connections
	// -P: show port numbers instead of service names
	// -n: don't resolve hostnames
	const { stdout } = await execAsync(
		"lsof +c 0 -i -P -n | grep LISTEN || true",
	);

	const lines = stdout.trim().split("\n").filter(Boolean);
	const ports: PortInfo[] = [];

	for (const line of lines) {
		// Parse lsof output
		// Format: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
		// Example: node    1234 user   23u  IPv4 0x1234      0t0  TCP 127.0.0.1:3000 (LISTEN)
		const parts = line.split(/\s+/);
		if (parts.length < 10) continue;

		// Decode escape sequences in process name (e.g., \x20 -> space)
		const rawProcessName = parts[0];
		const processName = rawProcessName.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) =>
			String.fromCharCode(Number.parseInt(hex, 16)),
		);
		const pid = Number.parseInt(parts[1], 10);
		const user = parts[2]; // USER field
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

		// Get full command path using ps
		let commandPath: string | undefined;
		let appName: string | undefined;
		try {
			const { stdout: psOutput } = await execAsync(
				`ps -p ${pid} -o command= 2>/dev/null || true`,
			);
			commandPath = psOutput.trim() || undefined;

			// Extract application name from .app bundle path
			if (commandPath) {
				const appMatch = commandPath.match(/\/([^/]+\.app)\//);
				if (appMatch) {
					// Remove .app extension to get clean app name
					appName = appMatch[1].replace(/\.app$/, "");
				}
			}

			// If no app name found, try to get project name from package.json
			if (!appName && commandPath) {
				try {
					// Get the working directory of the process
					const { stdout: cwdOutput } = await execAsync(
						`lsof -a -p ${pid} -d cwd -F n 2>/dev/null | grep '^n' | head -1`,
					);
					const cwd = cwdOutput.trim().substring(1); // Remove 'n' prefix

					if (cwd) {
						// Try to read package.json from the working directory
						const { stdout: packageJson } = await execAsync(
							`cat "${cwd}/package.json" 2>/dev/null || echo ""`,
						);

						if (packageJson) {
							const pkg = JSON.parse(packageJson);
							if (pkg.name) {
								appName = pkg.name;
							}
						}
					}
				} catch {
					// If reading package.json fails, continue without app name
				}
			}
		} catch {
			// If ps fails, leave commandPath undefined
		}

		// Determine process category
		const category = categorizeProcess(processName, appName, commandPath);

		ports.push({
			port,
			pid,
			processName,
			protocol,
			address: bindAddress,
			state: "LISTEN",
			commandPath,
			user,
			appName,
			category,
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

		// Determine process category
		const category = categorizeProcess(processName, undefined, undefined);

		ports.push({
			port,
			pid,
			processName,
			protocol,
			address,
			state: "LISTENING",
			category,
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
