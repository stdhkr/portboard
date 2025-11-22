/**
 * Linux Process Provider
 * Uses ps, kill (similar to macOS)
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { IProcessProvider, ProcessMetadata } from "../types";

const execAsync = promisify(exec);

export class LinuxProcessProvider implements IProcessProvider {
	async killProcess(pid: number): Promise<void> {
		try {
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

	async getProcessMetadata(_pid: number, _processName: string): Promise<ProcessMetadata> {
		// TODO: Implement process metadata collection for Linux (similar to macOS)
		return {};
	}

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
		const [resourceUsageMap, startTimeMap, commandPathMap, cwdMap] = await Promise.all([
			this.getBatchResourceUsage(uniquePids),
			this.getBatchProcessStartTimes(uniquePids),
			this.getBatchCommandPaths(uniquePids),
			this.getBatchWorkingDirectories(uniquePids),
		]);

		// Build metadata for each requested PID
		for (const { pid } of pidProcessPairs) {
			const metadata: ProcessMetadata = {};

			// Get resource usage
			const resourceUsage = resourceUsageMap.get(pid);
			if (resourceUsage) {
				metadata.cpuUsage = resourceUsage.cpuUsage;
				metadata.memoryUsage = resourceUsage.memoryUsage;
				metadata.memoryRSS = resourceUsage.memoryRSS;
			}

			// Get start time
			const startTime = startTimeMap.get(pid);
			if (startTime) {
				metadata.processStartTime = startTime;
			}

			// Get command path and cwd
			metadata.commandPath = commandPathMap.get(pid);
			metadata.cwd = cwdMap.get(pid);

			result.set(pid, metadata);
		}

		return result;
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
	 * Get command paths for multiple PIDs (batch operation)
	 */
	private async getBatchCommandPaths(pids: number[]): Promise<Map<number, string>> {
		const result = new Map<number, string>();

		if (pids.length === 0) {
			return result;
		}

		try {
			const pidList = pids.join(",");
			const { stdout } = await execAsync(`ps -p ${pidList} -o pid=,command= 2>/dev/null || true`);

			if (!stdout.trim()) {
				return result;
			}

			const lines = stdout.trim().split("\n");
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
		} catch {
			// Ignore errors
		}

		return result;
	}

	/**
	 * Get working directories for multiple PIDs (batch operation)
	 */
	private async getBatchWorkingDirectories(pids: number[]): Promise<Map<number, string>> {
		const result = new Map<number, string>();

		if (pids.length === 0) {
			return result;
		}

		try {
			const pidList = pids.join(",");
			const { stdout } = await execAsync(`lsof -p ${pidList} -a -d cwd -F pn 2>/dev/null || true`);

			if (!stdout.trim()) {
				return result;
			}

			const lines = stdout.trim().split("\n");
			let currentPid: number | undefined;

			for (const line of lines) {
				if (line.startsWith("p")) {
					// Process ID line
					currentPid = Number.parseInt(line.substring(1), 10);
				} else if (line.startsWith("n") && currentPid) {
					// File name line (working directory)
					const cwd = line.substring(1);
					if (cwd !== "/") {
						// Ignore "/" as it's usually meaningless
						result.set(currentPid, cwd);
					}
				}
			}
		} catch {
			// Ignore errors
		}

		return result;
	}

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
}
