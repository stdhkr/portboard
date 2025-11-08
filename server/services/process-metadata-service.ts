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
		const [resourceUsage, startTime] = await Promise.all([resourcePromise, startTimePromise]);

		if (resourceUsage) {
			cpuUsage = resourceUsage.cpuUsage;
			memoryUsage = resourceUsage.memoryUsage;
			memoryRSS = resourceUsage.memoryRSS;
		}

		if (startTime) {
			processStartTime = startTime;
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
