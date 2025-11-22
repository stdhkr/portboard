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
			// Batch operation: Get all process info using PowerShell (wmic is deprecated in Windows 11)
			// Use Get-CimInstance for process information
			const { stdout } = await execAsync(
				'powershell -Command "Get-CimInstance Win32_Process | Select-Object ProcessId,ExecutablePath,WorkingSetSize,CreationDate | ConvertTo-Csv -NoTypeInformation"',
				{ timeout: 15000 },
			);

			const processInfoMap = new Map<
				number,
				{
					executablePath?: string;
					workingSetSize?: number;
					creationDate?: Date;
				}
			>();

			// Parse PowerShell CSV output (format: "ProcessId","ExecutablePath","WorkingSetSize","CreationDate")
			const lines = stdout.trim().split("\n").slice(1); // Skip header
			for (const line of lines) {
				// Parse CSV with potential empty fields and dates
				const match = line.match(/"(\d+)","([^"]*)","(\d*)","([^"]*)"/);
				if (match) {
					const pid = Number.parseInt(match[1], 10);
					if (!Number.isNaN(pid)) {
						let creationDate: Date | undefined;
						if (match[4]) {
							try {
								// PowerShell date format varies, try to parse it
								creationDate = new Date(match[4]);
								if (Number.isNaN(creationDate.getTime())) {
									creationDate = undefined;
								}
							} catch {
								// Ignore parse errors
							}
						}

						processInfoMap.set(pid, {
							executablePath: match[2] || undefined,
							workingSetSize: match[3] ? Number.parseInt(match[3], 10) : undefined,
							creationDate,
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

					// Set process start time
					if (info.creationDate) {
						metadata.processStartTime = info.creationDate;
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
