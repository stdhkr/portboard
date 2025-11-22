/**
 * Windows Port Provider
 * Uses netstat for port listing and connection counting
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { BasicPortInfo, IPortProvider } from "../types";

const execAsync = promisify(exec);

export class WindowsPortProvider implements IPortProvider {
	async getListeningPorts(): Promise<BasicPortInfo[]> {
		// Batch operation: Get all process info upfront using PowerShell (wmic is deprecated in Windows 11)
		const processMap = new Map<number, string>();

		try {
			const { stdout: psOutput } = await execAsync(
				'powershell -Command "Get-Process | Select-Object Id,ProcessName | ConvertTo-Csv -NoTypeInformation"',
				{ timeout: 10000 },
			);

			// Parse PowerShell CSV output (format: "Id","ProcessName")
			const psLines = psOutput.trim().split("\n").slice(1); // Skip header
			for (const line of psLines) {
				// Parse CSV: "1234","processname"
				const match = line.match(/"(\d+)","([^"]+)"/);
				if (match) {
					const pid = Number.parseInt(match[1], 10);
					const name = match[2];
					if (!Number.isNaN(pid) && name) {
						processMap.set(pid, name);
					}
				}
			}
		} catch (error) {
			console.debug("Failed to get process list via PowerShell:", error);
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

	async getBatchConnectionCounts(portPidPairs: [number, number][]): Promise<Map<string, number>> {
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
