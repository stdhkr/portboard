import { exec } from "node:child_process";
import { promisify } from "node:util";
import { extractAppIcon } from "./icon-service";

const execAsync = promisify(exec);

interface ResourceUsage {
	cpuUsage: number;
	memoryUsage: number;
	memoryRSS: number;
}

/**
 * Get resource usage (CPU and memory) for a process
 */
async function getProcessResourceUsage(pid: number): Promise<ResourceUsage | null> {
	try {
		const { stdout } = await execAsync(`ps -p ${pid} -o %cpu=,%mem=,rss= 2>/dev/null`);
		const values = stdout.trim().split(/\s+/);

		if (values.length >= 3) {
			return {
				cpuUsage: Number.parseFloat(values[0]) || 0,
				memoryUsage: Number.parseFloat(values[1]) || 0,
				memoryRSS: Number.parseInt(values[2], 10) || 0,
			};
		}
	} catch (error) {
		// If ps fails, return null
		console.debug(`Failed to get resource usage for PID ${pid}:`, error);
	}
	return null;
}

/**
 * Get resource usage for multiple PIDs in a single batch operation
 */
async function getBatchResourceUsage(pids: number[]): Promise<Map<number, ResourceUsage>> {
	const result = new Map<number, ResourceUsage>();

	if (pids.length === 0) {
		return result;
	}

	try {
		// Get all PIDs in one ps command
		const pidList = pids.join(",");
		const { stdout } = await execAsync(
			`ps -p ${pidList} -o pid=,%cpu=,%mem=,rss= 2>/dev/null || true`,
		);

		if (!stdout.trim()) {
			return result;
		}

		const lines = stdout.trim().split("\n");
		for (const line of lines) {
			const values = line.trim().split(/\s+/);
			if (values.length >= 4) {
				const pid = Number.parseInt(values[0], 10);
				if (!Number.isNaN(pid)) {
					result.set(pid, {
						cpuUsage: Number.parseFloat(values[1]) || 0,
						memoryUsage: Number.parseFloat(values[2]) || 0,
						memoryRSS: Number.parseInt(values[3], 10) || 0,
					});
				}
			}
		}
	} catch (error) {
		console.debug("Failed to get batch resource usage:", error);
	}

	return result;
}

/**
 * Get process start time
 */
async function getProcessStartTime(pid: number): Promise<Date | null> {
	try {
		// Use lstart for full timestamp on macOS/Linux
		const { stdout } = await execAsync(`ps -p ${pid} -o lstart= 2>/dev/null`);
		const startTimeStr = stdout.trim();

		if (startTimeStr) {
			// Parse the date string (format: "Mon Jan  8 14:30:15 2025")
			const date = new Date(startTimeStr);
			if (!Number.isNaN(date.getTime())) {
				return date;
			}
		}
	} catch (error) {
		console.debug(`Failed to get process start time for PID ${pid}:`, error);
	}
	return null;
}

/**
 * Get process start times for multiple PIDs in a single batch operation
 */
async function getBatchProcessStartTimes(pids: number[]): Promise<Map<number, Date>> {
	const result = new Map<number, Date>();

	if (pids.length === 0) {
		return result;
	}

	try {
		const pidList = pids.join(",");
		const { stdout } = await execAsync(`ps -p ${pidList} -o pid=,lstart= 2>/dev/null || true`);

		if (!stdout.trim()) {
			return result;
		}

		const lines = stdout.trim().split("\n");
		for (const line of lines) {
			// Format: "  PID  Mon Jan  8 14:30:15 2025"
			const match = line.trim().match(/^(\d+)\s+(.+)$/);
			if (match) {
				const pid = Number.parseInt(match[1], 10);
				const startTimeStr = match[2].trim();

				if (!Number.isNaN(pid) && startTimeStr) {
					const date = new Date(startTimeStr);
					if (!Number.isNaN(date.getTime())) {
						result.set(pid, date);
					}
				}
			}
		}
	} catch (error) {
		console.debug("Failed to get batch process start times:", error);
	}

	return result;
}

export interface ProcessMetadata {
	commandPath?: string;
	cwd?: string;
	appName?: string;
	appIconPath?: string;
	cpuUsage?: number; // CPU usage percentage
	memoryUsage?: number; // Memory usage percentage
	memoryRSS?: number; // Resident Set Size in KB
	processStartTime?: Date; // Process start time
}

/**
 * Collect metadata for a process (command path, app name, icon, resource usage)
 */
export async function collectProcessMetadata(
	pid: number,
	processName: string,
): Promise<ProcessMetadata> {
	let commandPath: string | undefined;
	let appName: string | undefined;
	let appIconPath: string | undefined;
	let cwd: string | undefined;
	let cpuUsage: number | undefined;
	let memoryUsage: number | undefined;
	let memoryRSS: number | undefined;
	let processStartTime: Date | undefined;

	try {
		// Get resource usage (CPU and memory) and start time in parallel with other metadata
		const resourcePromise = getProcessResourceUsage(pid);
		const startTimePromise = getProcessStartTime(pid);

		// Continue with existing metadata collection
		// Try to get the full executable path using lsof first (more reliable for .app bundles)
		try {
			// Use -F flag for parseable output: n = file name
			// This handles paths with spaces correctly
			const { stdout: lsofOutput } = await execAsync(
				`lsof -p ${pid} -a -d txt -F n 2>/dev/null | grep '^n/' | head -1`,
			);
			// -F output format: each field starts with a letter prefix (n = name/path)
			if (lsofOutput.startsWith("n")) {
				const executablePath = lsofOutput.substring(1).trim(); // Remove 'n' prefix
				if (executablePath.startsWith("/")) {
					commandPath = executablePath;
				}
			}
		} catch {
			// Fall back to ps if lsof fails
		}

		// If lsof didn't work, fall back to ps
		if (!commandPath) {
			const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o command= 2>/dev/null || true`);
			commandPath = psOutput.trim() || undefined;
		}

		// Get the working directory of the process
		try {
			const { stdout: cwdOutput } = await execAsync(
				`lsof -a -p ${pid} -d cwd -F n 2>/dev/null | grep '^n' | head -1`,
			);
			cwd = cwdOutput.trim().substring(1); // Remove 'n' prefix
		} catch {
			// If getting cwd fails, continue without it
		}

		// Convert relative paths to absolute paths
		if (commandPath && cwd && !commandPath.startsWith("/")) {
			commandPath = resolveRelativePaths(commandPath, cwd);
		}

		// Extract application name from .app bundle path
		let appBundlePath: string | undefined;
		if (commandPath) {
			const appMatch = commandPath.match(/\/([^/]+\.app)\//);
			if (appMatch) {
				const firstAppIndex = commandPath.indexOf(appMatch[1]);
				appBundlePath = commandPath.substring(0, firstAppIndex + appMatch[1].length);
				appName = appMatch[1].replace(/\.app$/, "");
			}
		}

		// Extract app icon if we have an .app bundle path
		if (appBundlePath) {
			try {
				appIconPath = (await extractAppIcon(appBundlePath)) || undefined;
			} catch (error) {
				console.debug(`Failed to extract icon for ${appBundlePath}:`, error);
			}
		}

		// Special handling for Cursor
		if (!appName && processName.toLowerCase().includes("cursor")) {
			appName = "Cursor";
		}

		// For .app bundles, shorten commandPath to just the .app path (more user-friendly)
		if (commandPath && appBundlePath && commandPath.includes(".app/")) {
			commandPath = appBundlePath;
		}

		// Try to get project name from package.json
		if (!appName && commandPath && cwd) {
			try {
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

		// Wait for resource usage and start time collection
		const [resourceUsage, procStartTime] = await Promise.all([resourcePromise, startTimePromise]);

		if (resourceUsage) {
			cpuUsage = resourceUsage.cpuUsage;
			memoryUsage = resourceUsage.memoryUsage;
			memoryRSS = resourceUsage.memoryRSS;
		}

		if (procStartTime) {
			processStartTime = procStartTime;
		}
	} catch {
		// If collection fails, return empty metadata
	}

	return {
		commandPath,
		cwd,
		appName,
		appIconPath,
		cpuUsage,
		memoryUsage,
		memoryRSS,
		processStartTime,
	};
}

/**
 * Resolve relative paths to absolute paths
 */
function resolveRelativePaths(commandPath: string, cwd: string): string {
	const parts = commandPath.split(/\s+/);

	if (parts.length > 0 && parts[0].includes("/")) {
		// First part looks like a path, resolve it
		const resolvedPath = `${cwd}/${parts[0]}`;
		return [resolvedPath, ...parts.slice(1)].join(" ");
	}

	if (parts.length > 1) {
		// Check if any argument is a relative path
		const resolvedParts = parts.map((part, index) => {
			if (index > 0 && part.includes("/") && !part.startsWith("/") && !part.startsWith("-")) {
				return `${cwd}/${part}`;
			}
			return part;
		});
		return resolvedParts.join(" ");
	}

	return commandPath;
}

/**
 * Collect metadata for multiple processes in an optimized batch operation
 * Much faster than calling collectProcessMetadata for each process individually
 */
export async function collectBatchProcessMetadata(
	pidProcessPairs: Array<{ pid: number; processName: string }>,
): Promise<Map<number, ProcessMetadata>> {
	const result = new Map<number, ProcessMetadata>();

	if (pidProcessPairs.length === 0) {
		return result;
	}

	const pids = pidProcessPairs.map((p) => p.pid);

	// Batch fetch all data in parallel
	const [resourceUsageMap, startTimeMap, commandPathMap, cwdMap] = await Promise.all([
		getBatchResourceUsage(pids),
		getBatchProcessStartTimes(pids),
		getBatchCommandPaths(pids),
		getBatchWorkingDirectories(pids),
	]);

	// Process metadata extraction and icon loading
	const iconPromises = pidProcessPairs.map(async ({ pid, processName }) => {
		let commandPath = commandPathMap.get(pid);
		const cwd = cwdMap.get(pid);
		let appName: string | undefined;
		let appIconPath: string | undefined;

		// Convert relative paths to absolute paths
		if (commandPath && cwd && !commandPath.startsWith("/")) {
			commandPath = resolveRelativePaths(commandPath, cwd);
		}

		// Extract application name from .app bundle path
		let appBundlePath: string | undefined;
		if (commandPath) {
			const appMatch = commandPath.match(/\/([^/]+\.app)\//);
			if (appMatch) {
				const firstAppIndex = commandPath.indexOf(appMatch[1]);
				appBundlePath = commandPath.substring(0, firstAppIndex + appMatch[1].length);
				appName = appMatch[1].replace(/\.app$/, "");
			}
		}

		// Extract app icon if we have an .app bundle path
		if (appBundlePath) {
			try {
				appIconPath = (await extractAppIcon(appBundlePath)) || undefined;
			} catch (error) {
				console.debug(`Failed to extract icon for ${appBundlePath}:`, error);
			}
		}

		// Special handling for Cursor
		if (!appName && processName.toLowerCase().includes("cursor")) {
			appName = "Cursor";
		}

		// For .app bundles, shorten commandPath to just the .app path
		if (commandPath && appBundlePath && commandPath.includes(".app/")) {
			commandPath = appBundlePath;
		}

		// Try to get project name from package.json if no app name yet
		if (!appName && commandPath && cwd) {
			try {
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

		// Get resource usage and start time from batch results
		const resourceUsage = resourceUsageMap.get(pid);
		const processStartTime = startTimeMap.get(pid);

		return {
			pid,
			metadata: {
				commandPath,
				cwd,
				appName,
				appIconPath,
				cpuUsage: resourceUsage?.cpuUsage,
				memoryUsage: resourceUsage?.memoryUsage,
				memoryRSS: resourceUsage?.memoryRSS,
				processStartTime,
			} as ProcessMetadata,
		};
	});

	const metadataResults = await Promise.all(iconPromises);

	for (const { pid, metadata } of metadataResults) {
		result.set(pid, metadata);
	}

	return result;
}

/**
 * Get command paths for multiple PIDs in a single batch operation
 */
async function getBatchCommandPaths(pids: number[]): Promise<Map<number, string>> {
	const result = new Map<number, string>();

	if (pids.length === 0) {
		return result;
	}

	try {
		// First try lsof for all PIDs at once
		const pidList = pids.join(",");
		const { stdout } = await execAsync(`lsof -p ${pidList} -a -d txt -F pn 2>/dev/null || true`);

		if (stdout.trim()) {
			const lines = stdout.trim().split("\n");
			let currentPid: number | undefined;

			for (const line of lines) {
				if (line.startsWith("p")) {
					// Process ID line
					currentPid = Number.parseInt(line.substring(1), 10);
				} else if (line.startsWith("n") && currentPid) {
					// File name line
					const path = line.substring(1);
					if (path.startsWith("/") && !result.has(currentPid)) {
						result.set(currentPid, path);
					}
				}
			}
		}

		// For PIDs not found with lsof, fall back to ps
		const missingPids = pids.filter((pid) => !result.has(pid));
		if (missingPids.length > 0) {
			const pidListPs = missingPids.join(",");
			const { stdout: psOutput } = await execAsync(
				`ps -p ${pidListPs} -o pid=,command= 2>/dev/null || true`,
			);

			if (psOutput.trim()) {
				const lines = psOutput.trim().split("\n");
				for (const line of lines) {
					const match = line.trim().match(/^(\d+)\s+(.+)$/);
					if (match) {
						const pid = Number.parseInt(match[1], 10);
						const command = match[2].trim();
						if (!Number.isNaN(pid) && command) {
							result.set(pid, command);
						}
					}
				}
			}
		}
	} catch (error) {
		console.debug("Failed to get batch command paths:", error);
	}

	return result;
}

/**
 * Get working directories for multiple PIDs in a single batch operation
 */
async function getBatchWorkingDirectories(pids: number[]): Promise<Map<number, string>> {
	const result = new Map<number, string>();

	if (pids.length === 0) {
		return result;
	}

	try {
		const pidList = pids.join(",");
		const { stdout } = await execAsync(`lsof -p ${pidList} -a -d cwd -F pn 2>/dev/null || true`);

		if (stdout.trim()) {
			const lines = stdout.trim().split("\n");
			let currentPid: number | undefined;

			for (const line of lines) {
				if (line.startsWith("p")) {
					// Process ID line
					currentPid = Number.parseInt(line.substring(1), 10);
				} else if (line.startsWith("n") && currentPid) {
					// File name line (working directory)
					const cwd = line.substring(1);
					result.set(currentPid, cwd);
				}
			}
		}
	} catch (error) {
		console.debug("Failed to get batch working directories:", error);
	}

	return result;
}
