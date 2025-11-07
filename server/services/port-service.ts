import { exec } from "node:child_process";
import { promisify } from "node:util";
import { extractAppIcon } from "./icon-service";

const execAsync = promisify(exec);

export type ProcessCategory =
	| "system"
	| "development"
	| "database"
	| "web-server"
	| "user";

export interface DockerContainerInfo {
	id: string;
	name: string;
	image: string;
	containerPort?: number;
	composeConfigFiles?: string;
}

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
	appIconPath?: string;
	category: ProcessCategory;
	dockerContainer?: DockerContainerInfo;
}

/**
 * Get Docker container port mappings
 * Returns a Map of host port -> container info
 */
async function getDockerPortMappings(): Promise<Map<number, DockerContainerInfo>> {
	const portMap = new Map<number, DockerContainerInfo>();

	try {
		// Check if Docker CLI is available
		await execAsync("which docker");

		// Get container info with port mappings
		const { stdout } = await execAsync(
			'docker ps --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Ports}}"',
		);

		const containerIds: string[] = [];
		const containerData = new Map<string, { name: string; image: string; ports: string }>();

		for (const line of stdout.trim().split("\n").filter(Boolean)) {
			const [id, name, image, ports] = line.split("\t");
			containerIds.push(id);
			containerData.set(id, { name, image, ports });
		}

		// Get compose metadata via docker inspect
		const containerLabels = new Map<string, Record<string, string>>();
		if (containerIds.length > 0) {
			try {
				const { stdout: inspectOutput } = await execAsync(
					`docker inspect ${containerIds.join(" ")}`,
				);
				const inspectData = JSON.parse(inspectOutput);

				for (const container of inspectData) {
					// Use short ID (first 12 chars) to match with docker ps output
					const shortId = container.Id.substring(0, 12);
					containerLabels.set(shortId, container.Config?.Labels || {});
				}
			} catch (error) {
				console.debug("Failed to inspect containers for labels:", error);
			}
		}

		// Build port mappings with compose metadata
		for (const [id, data] of containerData.entries()) {
			const { name, image, ports } = data;
			const labels = containerLabels.get(id) || {};
			const composeConfigFiles = labels["com.docker.compose.project.config_files"];

			// Extract host ports from format: "0.0.0.0:5433->5432/tcp"
			const portMatches = [...ports.matchAll(/0\.0\.0\.0:(\d+)->(\d+)/g)];

			for (const match of portMatches) {
				const hostPort = Number.parseInt(match[1], 10);
				const containerPort = Number.parseInt(match[2], 10);

				portMap.set(hostPort, {
					id,
					name,
					image,
					containerPort,
					composeConfigFiles,
				});
			}

			// Also handle *:port->port format
			const wildcardMatches = [...ports.matchAll(/\*:(\d+)->(\d+)/g)];
			for (const match of wildcardMatches) {
				const hostPort = Number.parseInt(match[1], 10);
				const containerPort = Number.parseInt(match[2], 10);

				if (!portMap.has(hostPort)) {
					portMap.set(hostPort, {
						id,
						name,
						image,
						containerPort,
						composeConfigFiles,
					});
				}
			}
		}
	} catch {
		// Docker not available or not running - return empty map
		console.debug("Docker not available, skipping container detection");
	}

	return portMap;
}

/**
 * Determine the category of a process based on its name, app name, and command path
 */
function categorizeProcess(
	processName: string,
	appName: string | undefined,
	commandPath: string | undefined,
	dockerContainer?: DockerContainerInfo,
): ProcessCategory {
	// If it's a Docker container, categorize by image name
	if (dockerContainer) {
		const image = dockerContainer.image.toLowerCase();

		// Database containers
		if (
			image.includes("postgres") ||
			image.includes("mysql") ||
			image.includes("mariadb") ||
			image.includes("redis") ||
			image.includes("mongo") ||
			image.includes("cassandra") ||
			image.includes("elasticsearch")
		) {
			return "database";
		}

		// Web server containers
		if (
			image.includes("nginx") ||
			image.includes("apache") ||
			image.includes("caddy") ||
			image.includes("traefik")
		) {
			return "web-server";
		}

		// Default Docker containers to user category
		return "user";
	}

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
	// Get Docker container port mappings first
	const dockerPortMap = await getDockerPortMappings();

	// Use lsof to get listening TCP and UDP ports
	// +c 0: show full command names (no width limit)
	// -i: internet connections
	// -P: show port numbers instead of service names
	// -n: don't resolve hostnames
	const { stdout } = await execAsync(
		"lsof +c 0 -i -P -n | grep LISTEN || true",
	);

	const lines = stdout.trim().split("\n").filter(Boolean);

	// First pass: parse lsof output to extract basic info
	const basicPortInfo: Array<{
		processName: string;
		pid: number;
		user: string;
		protocol: string;
		port: number;
		bindAddress: string;
	}> = [];

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

		basicPortInfo.push({ processName, pid, user, protocol, port, bindAddress });
	}

	// Second pass: collect metadata for all processes in parallel
	const metadataPromises = basicPortInfo.map(async (info) => {
		const { processName, pid, user, protocol, port, bindAddress } = info;

		// Get full command path using ps and lsof
		let commandPath: string | undefined;
		let appName: string | undefined;
		let appIconPath: string | undefined;
		let cwd: string | undefined;
		try {
			// Try to get the full executable path using lsof first (more reliable for .app bundles)
			try {
				const { stdout: lsofOutput } = await execAsync(
					`lsof -p ${pid} 2>/dev/null | grep "txt.*REG" | head -1 | awk '{for(i=9;i<=NF;i++) printf $i" "; print ""}'`,
				);
				const executablePath = lsofOutput.trim();
				if (executablePath && executablePath.startsWith("/")) {
					commandPath = executablePath;
				}
			} catch {
				// Fall back to ps if lsof fails
			}

			// If lsof didn't work, fall back to ps
			if (!commandPath) {
				const { stdout: psOutput } = await execAsync(
					`ps -p ${pid} -o command= 2>/dev/null || true`,
				);
				commandPath = psOutput.trim() || undefined;
			}

			// Get the working directory of the process (used for both relative path resolution and package.json lookup)
			try {
				const { stdout: cwdOutput } = await execAsync(
					`lsof -a -p ${pid} -d cwd -F n 2>/dev/null | grep '^n' | head -1`,
				);
				cwd = cwdOutput.trim().substring(1); // Remove 'n' prefix
			} catch {
				// If getting cwd fails, continue without it
			}

			// Convert relative paths to absolute paths and extract file path only
			if (commandPath && cwd && !commandPath.startsWith("/")) {
				// Check if command starts with a relative file path (not just a command name)
				const parts = commandPath.split(/\s+/);
				if (parts.length > 0 && parts[0].includes("/")) {
					// First part looks like a path, resolve it
					const resolvedPath = `${cwd}/${parts[0]}`;
					commandPath = [resolvedPath, ...parts.slice(1)].join(" ");
				} else if (parts.length > 1) {
					// Check if any argument is a relative path
					const resolvedParts = parts.map((part, index) => {
						if (index > 0 && part.includes("/") && !part.startsWith("/") && !part.startsWith("-")) {
							return `${cwd}/${part}`;
						}
						return part;
					});
					commandPath = resolvedParts.join(" ");
				}
			}

			// Extract application name from .app bundle path BEFORE simplifying commandPath
			let appBundlePath: string | undefined;
			if (commandPath) {
				const appMatch = commandPath.match(/\/([^/]+\.app)\//);
				if (appMatch) {
					// Extract the first (outermost) .app bundle path
					// For nested apps like "Cursor.app/.../Cursor Helper (Plugin).app",
					// we want the parent Cursor.app
					const firstAppIndex = commandPath.indexOf(appMatch[1]);
					appBundlePath = commandPath.substring(0, firstAppIndex + appMatch[1].length);

					// Remove .app extension to get clean app name
					appName = appMatch[1].replace(/\.app$/, "");
				}
			}

			// Extract app icon if we have an .app bundle path
			if (appBundlePath) {
				try {
					appIconPath = await extractAppIcon(appBundlePath) || undefined;
				} catch (error) {
					// Icon extraction failed, continue without icon
					console.debug(`Failed to extract icon for ${appBundlePath}:`, error);
				}
			}

			// Special handling for Cursor - extract from process name
			if (!appName && processName.toLowerCase().includes("cursor")) {
				appName = "Cursor";
			}

			// Extract only the file path from the command (remove command name and options)
			if (commandPath) {
				const parts = commandPath.split(/\s+/);
				// Find the first part that looks like a file path (contains / and doesn't start with -)
				const filePath = parts.find(part => part.includes("/") && !part.startsWith("-"));
				if (filePath) {
					commandPath = filePath;
				}
			}

			// If no app name found, try to get project name from package.json
			if (!appName && commandPath && cwd) {
				try {
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
				} catch {
					// If reading package.json fails, continue without app name
				}
			}
		} catch {
			// If ps fails, leave commandPath undefined
		}

		// Check if this port belongs to a Docker container
		let dockerContainer: DockerContainerInfo | undefined;
		if (processName === "com.docker.backend" || appName === "Docker") {
			dockerContainer = dockerPortMap.get(port);

			// Override appName with container name for better display
			if (dockerContainer) {
				appName = dockerContainer.name;
			}
		}

		// Determine process category
		const category = categorizeProcess(processName, appName, commandPath, dockerContainer);

		return {
			port,
			pid,
			processName,
			protocol,
			address: bindAddress,
			state: "LISTEN",
			commandPath,
			user,
			appName,
			appIconPath,
			category,
			dockerContainer,
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
