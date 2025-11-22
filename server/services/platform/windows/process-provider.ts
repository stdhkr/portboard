/**
 * Windows Process Provider
 * Uses taskkill, wmic for process management
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { IProcessProvider, ProcessMetadata } from "../types";

const execAsync = promisify(exec);

export class WindowsProcessProvider implements IProcessProvider {
	async killProcess(pid: number): Promise<void> {
		await execAsync(`taskkill /PID ${pid} /F`);
	}

	async getProcessMetadata(_pid: number, _processName: string): Promise<ProcessMetadata> {
		// TODO: Implement process metadata collection for Windows
		return {};
	}

	async getBatchProcessMetadata(
		pidProcessPairs: Array<{ pid: number; processName: string }>,
	): Promise<Map<number, ProcessMetadata>> {
		const result = new Map<number, ProcessMetadata>();

		if (pidProcessPairs.length === 0) {
			return result;
		}

		try {
			// Batch operation: Get all process info using wmic
			// Format: CSV with columns CreationDate,ExecutablePath,ProcessId,WorkingSetSize,KernelModeTime,UserModeTime
			const { stdout } = await execAsync(
				"wmic process get CreationDate,ExecutablePath,ProcessId,WorkingSetSize,KernelModeTime,UserModeTime /format:csv",
			);

			const processInfoMap = new Map<
				number,
				{
					executablePath?: string;
					workingSetSize?: number;
					creationDate?: string;
					kernelTime?: number;
					userTime?: number;
				}
			>();

			// Parse wmic CSV output (format: Node,CreationDate,ExecutablePath,ProcessId,WorkingSetSize,...)
			const lines = stdout.trim().split("\n").slice(1); // Skip header
			for (const line of lines) {
				const parts = line.trim().split(",");
				if (parts.length >= 6) {
					const pid = Number.parseInt(parts[3], 10);
					if (!Number.isNaN(pid)) {
						processInfoMap.set(pid, {
							creationDate: parts[1] || undefined,
							executablePath: parts[2] || undefined,
							workingSetSize: Number.parseInt(parts[4], 10) || undefined,
							kernelTime: Number.parseInt(parts[5], 10) || undefined,
							userTime: Number.parseInt(parts[6], 10) || undefined,
						});
					}
				}
			}

			// Build metadata for each requested PID
			for (const { pid } of pidProcessPairs) {
				const metadata: ProcessMetadata = {};
				const info = processInfoMap.get(pid);

				if (info) {
					// Set command path
					if (info.executablePath) {
						metadata.commandPath = info.executablePath;
					}

					// Calculate memory usage (WorkingSetSize is in bytes)
					if (info.workingSetSize) {
						metadata.memoryRSS = Math.floor(info.workingSetSize / 1024); // Convert to KB
					}

					// Parse WMI datetime format (e.g., "20250115143000.500000+540")
					if (info.creationDate) {
						try {
							const year = Number.parseInt(info.creationDate.substring(0, 4), 10);
							const month = Number.parseInt(info.creationDate.substring(4, 6), 10) - 1;
							const day = Number.parseInt(info.creationDate.substring(6, 8), 10);
							const hour = Number.parseInt(info.creationDate.substring(8, 10), 10);
							const minute = Number.parseInt(info.creationDate.substring(10, 12), 10);
							const second = Number.parseInt(info.creationDate.substring(12, 14), 10);

							metadata.processStartTime = new Date(year, month, day, hour, minute, second);
						} catch {
							// Ignore parse errors
						}
					}

					// Note: CPU percentage calculation would require sampling over time
					// For now, we don't set cpuUsage and memoryUsage percentage
					// to avoid showing misleading data
				}

				result.set(pid, metadata);
			}
		} catch (error) {
			console.debug("Failed to get batch process metadata:", error);
			// Return empty metadata on error
			for (const { pid } of pidProcessPairs) {
				result.set(pid, {});
			}
		}

		return result;
	}

	async isProcessOwnedByCurrentUser(_pid: number): Promise<boolean> {
		// TODO: Implement ownership check for Windows
		return true;
	}
}
