/**
 * macOS Process Provider
 * Uses ps, lsof, and other Unix commands for process management
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { extractAppIcon } from "../../icon-service";
import type { IProcessProvider, ProcessMetadata } from "../types";

const execAsync = promisify(exec);

export class MacOSProcessProvider implements IProcessProvider {
	/**
	 * Kill a process by PID
	 * Only kills processes owned by the current user for security
	 */
	async killProcess(pid: number): Promise<void> {
		try {
			// Check if we own the process
			const isOwned = await this.isProcessOwnedByCurrentUser(pid);
			if (!isOwned) {
				throw new Error("Cannot kill process: insufficient permissions (own processes only)");
			}

			await execAsync(`kill ${pid}`);
		} catch (error) {
			if (error instanceof Error && error.message.includes("insufficient")) {
				throw error;
			}
			throw new Error(
				`Failed to kill process ${pid}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get metadata for a single process
	 */
	async getProcessMetadata(pid: number, _processName: string): Promise<ProcessMetadata> {
		const metadata: ProcessMetadata = {};

		// Get command path and working directory using lsof
		try {
			const { stdout } = await execAsync(
				`lsof +c 0 -p ${pid} -a -d cwd,txt -Fn 2>/dev/null || true`,
			);
			const lines = stdout.trim().split("\n");

			let nextIsPath = false;
			let pathType: "cwd" | "txt" | null = null;

			for (const line of lines) {
				if (line.startsWith("f")) {
					const fdType = line.substring(1);
					if (fdType === "cwd") {
						pathType = "cwd";
						nextIsPath = true;
					} else if (fdType === "txt") {
						pathType = "txt";
						nextIsPath = true;
					}
				} else if (nextIsPath && line.startsWith("n")) {
					const path = line.substring(1);
					if (pathType === "cwd" && !metadata.cwd) {
						// Ignore "/" as it's usually meaningless
						if (path !== "/") {
							metadata.cwd = path;
						}
					} else if (pathType === "txt" && !metadata.commandPath) {
						metadata.commandPath = path;

						// Check if this is a macOS .app bundle
						if (path.includes(".app/")) {
							const appMatch = path.match(/^(.+\.app)\//);
							if (appMatch) {
								const appPath = appMatch[1];
								const appNameMatch = appPath.match(/\/([^/]+\.app)$/);
								if (appNameMatch) {
									metadata.appName = appNameMatch[1].replace(".app", "");
									// Extract icon
									const iconPath = await extractAppIcon(appPath);
									if (iconPath) {
										metadata.appIconPath = iconPath;
									}
								}
							}
						}
					}
					nextIsPath = false;
					pathType = null;
				}
			}
		} catch (error) {
			console.debug(`Failed to get metadata for PID ${pid}:`, error);
		}

		// Get resource usage
		try {
			const { stdout } = await execAsync(`ps -p ${pid} -o %cpu=,%mem=,rss= 2>/dev/null`);
			const values = stdout.trim().split(/\s+/);
			if (values.length >= 3) {
				metadata.cpuUsage = Number.parseFloat(values[0]) || 0;
				metadata.memoryUsage = Number.parseFloat(values[1]) || 0;
				metadata.memoryRSS = Number.parseInt(values[2], 10) || 0;
			}
		} catch {
			// Ignore errors
		}

		// Get process start time
		try {
			const { stdout } = await execAsync(`ps -p ${pid} -o lstart= 2>/dev/null`);
			const startTimeStr = stdout.trim();
			if (startTimeStr) {
				const date = new Date(startTimeStr);
				if (!Number.isNaN(date.getTime())) {
					metadata.processStartTime = date;
				}
			}
		} catch {
			// Ignore errors
		}

		return metadata;
	}

	/**
	 * Get metadata for multiple processes (batch operation)
	 */
	async getBatchProcessMetadata(
		pidProcessPairs: Array<{ pid: number; processName: string }>,
	): Promise<Map<number, ProcessMetadata>> {
		const result = new Map<number, ProcessMetadata>();

		if (pidProcessPairs.length === 0) {
			return result;
		}

		const pids = pidProcessPairs.map((p) => p.pid);
		const uniquePids = [...new Set(pids)];

		// Run all batch operations in parallel
		const [resourceUsageMap, startTimeMap, pathMap] = await Promise.all([
			this.getBatchResourceUsage(uniquePids),
			this.getBatchProcessStartTimes(uniquePids),
			this.getBatchCommandPathsAndCwd(uniquePids),
		]);

		// Process icon extraction in parallel for all .app bundles
		const iconExtractionPromises: Array<Promise<{ pid: number; iconPath: string }>> = [];

		for (const { pid } of pidProcessPairs) {
			const metadata: ProcessMetadata = {};

			// Get resource usage from batch results
			const resourceUsage = resourceUsageMap.get(pid);
			if (resourceUsage) {
				metadata.cpuUsage = resourceUsage.cpuUsage;
				metadata.memoryUsage = resourceUsage.memoryUsage;
				metadata.memoryRSS = resourceUsage.memoryRSS;
			}

			// Get start time from batch results
			const startTime = startTimeMap.get(pid);
			if (startTime) {
				metadata.processStartTime = startTime;
			}

			// Get command path and cwd from batch results
			const pathData = pathMap.get(pid);
			if (pathData) {
				metadata.commandPath = pathData.commandPath;
				metadata.cwd = pathData.cwd;
				metadata.appName = pathData.appName;

				// Queue icon extraction for .app bundles
				if (pathData.appPath) {
					iconExtractionPromises.push(
						extractAppIcon(pathData.appPath).then((iconPath) => ({
							pid,
							iconPath: iconPath || "",
						})),
					);
				}
			}

			result.set(pid, metadata);
		}

		// Wait for all icon extractions to complete (in parallel)
		if (iconExtractionPromises.length > 0) {
			const iconResults = await Promise.all(iconExtractionPromises);
			for (const { pid, iconPath } of iconResults) {
				if (iconPath) {
					const metadata = result.get(pid);
					if (metadata) {
						metadata.appIconPath = iconPath;
					}
				}
			}
		}

		// For processes without appName, try to get project name from package.json
		const packageJsonPromises: Array<Promise<{ pid: number; appName: string }>> = [];
		for (const { pid } of pidProcessPairs) {
			const metadata = result.get(pid);
			if (metadata && !metadata.appName && metadata.cwd) {
				packageJsonPromises.push(
					this.getProjectNameFromPackageJson(metadata.cwd).then((appName: string | null) => ({
						pid,
						appName: appName || "",
					})),
				);
			}
		}

		if (packageJsonPromises.length > 0) {
			const packageJsonResults = await Promise.all(packageJsonPromises);
			for (const { pid, appName } of packageJsonResults) {
				if (appName) {
					const metadata = result.get(pid);
					if (metadata) {
						metadata.appName = appName;
					}
				}
			}
		}

		return result;
	}

	/**
	 * Check if current user owns a process
	 */
	async isProcessOwnedByCurrentUser(pid: number): Promise<boolean> {
		try {
			const { stdout } = await execAsync(`ps -p ${pid} -o user=`);
			const processUser = stdout.trim();
			const currentUser = process.env.USER || process.env.USERNAME || "";
			return processUser === currentUser;
		} catch {
			return false;
		}
	}

	/**
	 * Get project name from package.json in the given directory
	 */
	private async getProjectNameFromPackageJson(cwd: string): Promise<string | null> {
		try {
			const { stdout } = await execAsync(`cat "${cwd}/package.json" 2>/dev/null || echo ""`);
			if (stdout.trim()) {
				const pkg = JSON.parse(stdout);
				return pkg.name || null;
			}
		} catch {
			// Ignore errors
		}
		return null;
	}

	/**
	 * Get resource usage for multiple PIDs (batch operation)
	 */
	private async getBatchResourceUsage(
		pids: number[],
	): Promise<Map<number, { cpuUsage: number; memoryUsage: number; memoryRSS: number }>> {
		const result = new Map();

		if (pids.length === 0) {
			return result;
		}

		try {
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
		} catch {
			// Ignore errors
		}

		return result;
	}

	/**
	 * Get process start times for multiple PIDs (batch operation)
	 */
	private async getBatchProcessStartTimes(pids: number[]): Promise<Map<number, Date>> {
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
		} catch {
			// Ignore errors
		}

		return result;
	}

	/**
	 * Get command paths and working directories for multiple PIDs (batch operation)
	 * Uses a single lsof call for all PIDs to improve performance
	 */
	private async getBatchCommandPathsAndCwd(
		pids: number[],
	): Promise<
		Map<number, { commandPath?: string; cwd?: string; appName?: string; appPath?: string }>
	> {
		const result = new Map<
			number,
			{ commandPath?: string; cwd?: string; appName?: string; appPath?: string }
		>();

		if (pids.length === 0) {
			return result;
		}

		try {
			const pidList = pids.join(",");
			const { stdout } = await execAsync(
				`lsof +c 0 -p ${pidList} -a -d cwd,txt -Fpfn 2>/dev/null || true`,
			);

			if (!stdout.trim()) {
				return result;
			}

			const lines = stdout.trim().split("\n");
			let currentPid: number | null = null;
			let nextIsPath = false;
			let pathType: "cwd" | "txt" | null = null;

			for (const line of lines) {
				if (line.startsWith("p")) {
					// New process - format: pPID
					currentPid = Number.parseInt(line.substring(1), 10);
					if (!result.has(currentPid)) {
						result.set(currentPid, {});
					}
				} else if (line.startsWith("f")) {
					// File descriptor type - format: fcwd or ftxt
					const fdType = line.substring(1);
					if (fdType === "cwd") {
						pathType = "cwd";
						nextIsPath = true;
					} else if (fdType === "txt") {
						pathType = "txt";
						nextIsPath = true;
					}
				} else if (line.startsWith("n") && nextIsPath && currentPid !== null) {
					// Path name - format: nPATH
					const path = line.substring(1);
					const metadata = result.get(currentPid);

					if (metadata) {
						if (pathType === "cwd" && !metadata.cwd) {
							// Ignore "/" as it's usually meaningless
							if (path !== "/") {
								metadata.cwd = path;
							}
						} else if (pathType === "txt") {
							// For txt paths, prioritize .app bundles or take first valid path
							const shouldSetPath =
								!metadata.commandPath || // No path yet
								(path.includes(".app/") && !metadata.commandPath.includes(".app/")); // Better path found

							if (shouldSetPath && path.startsWith("/")) {
								metadata.commandPath = path;

								// Check for .app bundle
								if (path.includes(".app/")) {
									// Extract the first .app in the path (main application)
									const appMatch = path.match(/\/([^/]+\.app)/);
									if (appMatch) {
										const appName = appMatch[1].replace(".app", "");
										// Extract full path to the .app
										const appPathMatch = path.match(/^(.+?\.app)/);
										if (appPathMatch) {
											metadata.appName = appName;
											metadata.appPath = appPathMatch[1];
										}
									}
								}
							}
						}
					}

					nextIsPath = false;
					pathType = null;
				}
			}
		} catch {
			// Ignore errors
		}

		return result;
	}
}
