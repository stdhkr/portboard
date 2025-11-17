/**
 * Windows Platform Provider (Stub Implementation)
 *
 * This is a stub implementation for Windows support.
 * Full implementation will be added in Phase 2.
 */

import { exec } from "node:child_process";
import { networkInterfaces } from "node:os";
import { promisify } from "node:util";
import type {
	ApplicationInfo,
	BasicPortInfo,
	IApplicationProvider,
	IBrowserProvider,
	IIconProvider,
	IPlatformProvider,
	IPortProvider,
	IProcessProvider,
	ProcessMetadata,
} from "../types";

const execAsync = promisify(exec);

/**
 * Windows Port Provider
 * Uses netstat for port listing
 */
class WindowsPortProvider implements IPortProvider {
	async getListeningPorts(): Promise<BasicPortInfo[]> {
		// Batch operation: Get all process info upfront using wmic
		const { stdout: wmicOutput } = await execAsync("wmic process get ProcessId,Name /format:csv");
		const processMap = new Map<number, string>();

		// Parse wmic CSV output (format: Node,Name,ProcessId)
		const wmicLines = wmicOutput.trim().split("\n").slice(1); // Skip header
		for (const line of wmicLines) {
			const parts = line.trim().split(",");
			if (parts.length >= 3) {
				const pid = Number.parseInt(parts[2], 10);
				const name = parts[1];
				if (!Number.isNaN(pid) && name) {
					processMap.set(pid, name);
				}
			}
		}

		// Get listening ports from netstat
		const { stdout } = await execAsync('netstat -ano | findstr "LISTENING" || echo.');
		const lines = stdout.trim().split("\n").filter(Boolean);
		const ports: BasicPortInfo[] = [];

		for (const line of lines) {
			const parts = line.trim().split(/\s+/);
			if (parts.length < 5) continue;

			const protocol = parts[0];
			const localAddress = parts[1];
			const pid = Number.parseInt(parts[4], 10);

			const [address, portStr] = localAddress.split(":");
			const port = Number.parseInt(portStr, 10);

			if (Number.isNaN(port) || Number.isNaN(pid)) continue;

			// Get process name from preloaded map
			const processName = processMap.get(pid) || "unknown";

			ports.push({
				port,
				pid,
				processName,
				protocol,
				bindAddress: address,
			});
		}

		return ports.sort((a, b) => a.port - b.port);
	}

	async getConnectionCount(_port: number, _pid: number): Promise<number> {
		// TODO: Implement connection counting for Windows
		return 0;
	}

	async getBatchConnectionCounts(
		portPidPairs: Array<[number, number]>,
	): Promise<Map<string, number>> {
		const result = new Map<string, number>();

		if (portPidPairs.length === 0) {
			return result;
		}

		try {
			// Get all ESTABLISHED connections from netstat
			const { stdout } = await execAsync('netstat -ano | findstr "ESTABLISHED" || echo.');
			const lines = stdout.trim().split("\n").filter(Boolean);

			// Count connections per port-pid pair
			for (const [port, pid] of portPidPairs) {
				let count = 0;

				for (const line of lines) {
					const parts = line.trim().split(/\s+/);
					if (parts.length < 5) continue;

					const localAddress = parts[1];
					const linePid = Number.parseInt(parts[4], 10);

					if (Number.isNaN(linePid)) continue;

					// Extract port from local address (format: IP:PORT)
					const [, portStr] = localAddress.split(":");
					const linePort = Number.parseInt(portStr, 10);

					if (linePort === port && linePid === pid) {
						count++;
					}
				}

				result.set(`${port}-${pid}`, count);
			}
		} catch (error) {
			console.debug("Failed to get batch connection counts:", error);
			// Return zeros on error
			for (const [port, pid] of portPidPairs) {
				result.set(`${port}-${pid}`, 0);
			}
		}

		return result;
	}
}

/**
 * Windows Process Provider
 * Uses taskkill, wmic for process management
 */
class WindowsProcessProvider implements IProcessProvider {
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

/**
 * Windows Icon Provider (Not Supported)
 */
class WindowsIconProvider implements IIconProvider {
	async extractIcon(_appPath: string): Promise<string | null> {
		// TODO: Implement .ico extraction for Windows
		return null;
	}

	getCachedIconPath(_appPath: string): string | null {
		return null;
	}

	isSupported(): boolean {
		return false; // Not yet supported
	}
}

/**
 * Windows Application Provider (Not Supported)
 */
class WindowsApplicationProvider implements IApplicationProvider {
	async detectIDEs(): Promise<ApplicationInfo[]> {
		// TODO: Implement IDE detection for Windows
		return [];
	}

	async detectTerminals(): Promise<ApplicationInfo[]> {
		// TODO: Implement terminal detection for Windows
		return [];
	}

	async openInIDE(_idePath: string, _directoryPath: string): Promise<void> {
		throw new Error("Not yet implemented for Windows");
	}

	async openInTerminal(_terminalPath: string, _directoryPath: string): Promise<void> {
		throw new Error("Not yet implemented for Windows");
	}

	async openContainerShell(
		_terminalPath: string,
		_containerId: string,
		_shell: string,
	): Promise<void> {
		throw new Error("Not yet implemented for Windows");
	}

	isSupported(): boolean {
		return false; // Not yet supported
	}
}

/**
 * Windows Browser Provider
 */
class WindowsBrowserProvider implements IBrowserProvider {
	async openURL(url: string): Promise<void> {
		await execAsync(`start "" "${url}"`);
	}

	getLocalIPAddress(): string | null {
		const interfaces = networkInterfaces();

		for (const name of Object.keys(interfaces)) {
			const iface = interfaces[name];
			if (!iface) continue;

			for (const addr of iface) {
				if (addr.family === "IPv4" && !addr.internal) {
					return addr.address;
				}
			}
		}

		return null;
	}
}

/**
 * Windows Platform Provider
 */
export class WindowsPlatformProvider implements IPlatformProvider {
	readonly portProvider = new WindowsPortProvider();
	readonly processProvider = new WindowsProcessProvider();
	readonly iconProvider = new WindowsIconProvider();
	readonly applicationProvider = new WindowsApplicationProvider();
	readonly browserProvider = new WindowsBrowserProvider();
}
