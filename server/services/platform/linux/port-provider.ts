/**
 * Linux Port Provider
 * Uses lsof (similar to macOS)
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { parseLsofOutput } from "../../unix-port-parser";
import type { BasicPortInfo, IPortProvider } from "../types";

const execAsync = promisify(exec);

export class LinuxPortProvider implements IPortProvider {
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

	async getBatchConnectionCounts(portPidPairs: [number, number][]): Promise<Map<string, number>> {
		const result = new Map<string, number>();

		if (portPidPairs.length === 0) {
			return result;
		}

		// Build a single lsof command filtering by all PIDs
		const pids = [...new Set(portPidPairs.map(([, pid]) => pid))];
		const pidList = pids.join(",");

		try {
			const { stdout } = await execAsync(`lsof -P -n -i -a -p ${pidList} 2>/dev/null || true`);

			if (!stdout) {
				for (const [port, pid] of portPidPairs) {
					result.set(`${port}-${pid}`, 0);
				}
				return result;
			}

			const lines = stdout.trim().split("\n");

			// Count ESTABLISHED connections for each port-PID pair
			for (const [port, pid] of portPidPairs) {
				let count = 0;
				for (const line of lines) {
					if (!line.includes("ESTABLISHED")) continue;

					const parts = line.trim().split(/\s+/);
					if (parts.length < 9) continue;

					const linePid = Number.parseInt(parts[1], 10);
					if (linePid !== pid) continue;

					const localAddr = parts[8];
					const localPort = localAddr.split(":").pop();

					if (localPort === port.toString()) {
						count++;
					}
				}
				result.set(`${port}-${pid}`, count);
			}
		} catch {
			for (const [port, pid] of portPidPairs) {
				result.set(`${port}-${pid}`, 0);
			}
		}

		return result;
	}
}
