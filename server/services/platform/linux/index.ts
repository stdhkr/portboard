/**
 * Linux Platform Provider (Stub Implementation)
 *
 * This is a stub implementation for Linux support.
 * Full implementation will be added in Phase 2.
 * Many Unix commands (lsof, ps) work similarly to macOS.
 */

import { exec } from "node:child_process";
import { networkInterfaces } from "node:os";
import { promisify } from "node:util";
import { parseLsofOutput } from "../../unix-port-parser";
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
 * Linux Port Provider
 * Uses lsof (similar to macOS)
 */
class LinuxPortProvider implements IPortProvider {
	async getListeningPorts(): Promise<BasicPortInfo[]> {
		try {
			const { stdout } = await execAsync("lsof +c 0 -i -P -n | grep LISTEN || true");
			return parseLsofOutput(stdout);
		} catch (error) {
			console.error("Error getting listening ports:", error);
			throw new Error(
				`Failed to get listening ports: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async getConnectionCount(port: number, pid: number): Promise<number> {
		try {
			const { stdout } = await execAsync(
				`lsof -i :${port} -n -a -p ${pid} 2>/dev/null | grep ESTABLISHED | wc -l || echo 0`,
			);
			const count = Number.parseInt(stdout.trim(), 10);
			return Number.isNaN(count) ? 0 : count;
		} catch {
			return 0;
		}
	}

	async getBatchConnectionCounts(
		portPidPairs: Array<[number, number]>,
	): Promise<Map<string, number>> {
		const result = new Map<string, number>();

		if (portPidPairs.length === 0) {
			return result;
		}

		try {
			// Get all PIDs for a single lsof call
			const uniquePids = [...new Set(portPidPairs.map(([, pid]) => pid))];
			const pidList = uniquePids.join(",");

			// Single lsof call for all PIDs
			// -P: numeric ports (prevents "pdb" → 3033 confusion)
			// -n: numeric IPs (faster, no DNS lookups)
			// -i: internet connections only
			const { stdout } = await execAsync(
				`lsof -P -n -i -a -p ${pidList} 2>/dev/null | grep ESTABLISHED || true`,
			);

			if (!stdout.trim()) {
				// No connections - return zeros
				for (const [port, pid] of portPidPairs) {
					result.set(`${port}-${pid}`, 0);
				}
				return result;
			}

			// Parse lsof output and count connections per port-pid
			const lines = stdout.trim().split("\n");
			const connectionCounts = new Map<string, number>();

			for (const line of lines) {
				const parts = line.trim().split(/\s+/);
				if (parts.length < 9) continue;

				const pidStr = parts[1];
				const nameField = parts[8]; // Format: host:port->remote:port

				const pid = Number.parseInt(pidStr, 10);
				if (Number.isNaN(pid)) continue;

				// Extract local port from name field
				// Format examples: "*:3000 (LISTEN)" or "localhost:3000->remote:12345 (ESTABLISHED)"
				const localMatch = nameField.match(/:(\d+)(?:->|$|\s)/);
				if (!localMatch) continue;

				const port = Number.parseInt(localMatch[1], 10);
				if (Number.isNaN(port)) continue;

				const key = `${port}-${pid}`;
				connectionCounts.set(key, (connectionCounts.get(key) || 0) + 1);
			}

			// Set counts for all requested port-pid pairs
			for (const [port, pid] of portPidPairs) {
				const key = `${port}-${pid}`;
				result.set(key, connectionCounts.get(key) || 0);
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
 * Linux Process Provider
 * Uses ps, kill (similar to macOS)
 */
class LinuxProcessProvider implements IProcessProvider {
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

/**
 * Linux Icon Provider (Not Supported)
 */
class LinuxIconProvider implements IIconProvider {
	async extractIcon(_appPath: string): Promise<string | null> {
		// TODO: Implement icon extraction from .desktop files for Linux
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
 * Linux Application Provider (Not Supported)
 */
class LinuxApplicationProvider implements IApplicationProvider {
	async detectIDEs(): Promise<ApplicationInfo[]> {
		// TODO: Implement IDE detection for Linux (check /usr/share/applications/*.desktop)
		return [];
	}

	async detectTerminals(): Promise<ApplicationInfo[]> {
		// TODO: Implement terminal detection for Linux
		return [];
	}

	async openInIDE(_idePath: string, _directoryPath: string): Promise<void> {
		throw new Error("Not yet implemented for Linux");
	}

	async openInTerminal(_terminalPath: string, _directoryPath: string): Promise<void> {
		throw new Error("Not yet implemented for Linux");
	}

	async openContainerShell(
		_terminalPath: string,
		_containerId: string,
		_shell: string,
	): Promise<void> {
		throw new Error("Not yet implemented for Linux");
	}

	isSupported(): boolean {
		return false; // Not yet supported
	}
}

/**
 * Linux Browser Provider
 */
class LinuxBrowserProvider implements IBrowserProvider {
	async openURL(url: string): Promise<void> {
		await execAsync(`xdg-open "${url}"`);
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
 * Linux Platform Provider
 */
export class LinuxPlatformProvider implements IPlatformProvider {
	readonly portProvider = new LinuxPortProvider();
	readonly processProvider = new LinuxProcessProvider();
	readonly iconProvider = new LinuxIconProvider();
	readonly applicationProvider = new LinuxApplicationProvider();
	readonly browserProvider = new LinuxBrowserProvider();
}
