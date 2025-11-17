/**
 * macOS Port Provider
 * Uses lsof to get listening ports and connection information
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { parseLsofOutput } from "../../unix-port-parser";
import type { BasicPortInfo, IPortProvider } from "../types";

const execAsync = promisify(exec);

export class MacOSPortProvider implements IPortProvider {
	/**
	 * Get all listening ports using lsof
	 */
	async getListeningPorts(): Promise<BasicPortInfo[]> {
		try {
			// Use lsof to get listening TCP and UDP ports
			// +c 0: show full command names (no truncation)
			// -i: network files
			// -P: show port numbers (not service names)
			// -n: don't resolve hostnames
			const { stdout } = await execAsync("lsof +c 0 -i -P -n | grep LISTEN || true");

			// Parse lsof output to extract basic info
			return parseLsofOutput(stdout);
		} catch (error) {
			console.error("Error getting listening ports:", error);
			throw new Error(
				`Failed to get listening ports: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get connection count for a specific port/PID combination
	 */
	async getConnectionCount(port: number, pid: number): Promise<number> {
		try {
			// Filter by PID to only count server-side ESTABLISHED connections
			const { stdout } = await execAsync(
				`lsof -i :${port} -n -a -p ${pid} 2>/dev/null | grep ESTABLISHED | wc -l || echo 0`,
			);
			const count = Number.parseInt(stdout.trim(), 10);
			return Number.isNaN(count) ? 0 : count;
		} catch {
			return 0;
		}
	}

	/**
	 * Get connection counts for multiple ports (batch operation)
	 * Much faster than calling getConnectionCount for each port individually
	 */
	async getBatchConnectionCounts(
		portPidPairs: Array<[number, number]>,
	): Promise<Map<string, number>> {
		const result = new Map<string, number>();

		if (portPidPairs.length === 0) {
			return result;
		}

		try {
			// Get all ESTABLISHED connections at once
			// -P: show port numbers instead of service names (e.g., 3033 instead of "pdb")
			const { stdout } = await execAsync("lsof -i -n -P 2>/dev/null | grep ESTABLISHED || true");

			if (!stdout.trim()) {
				// No established connections
				for (const [port, pid] of portPidPairs) {
					result.set(`${port}-${pid}`, 0);
				}
				return result;
			}

			// Parse the output to count connections per port-pid combination
			const lines = stdout.trim().split("\n");
			const connectionCounts = new Map<string, number>();

			for (const line of lines) {
				// lsof output format: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
				const parts = line.trim().split(/\s+/);
				if (parts.length < 9) continue;

				const pid = Number.parseInt(parts[1], 10);
				const name = parts[8]; // e.g., "localhost:3000->localhost:51234"

				if (Number.isNaN(pid)) continue;

				// Extract LOCAL port from the connection string (before the arrow)
				const localPart = name.split("->")[0];
				const portMatch = localPart.match(/:(\d+)$/);
				if (!portMatch) continue;

				const port = Number.parseInt(portMatch[1], 10);
				if (Number.isNaN(port)) continue;

				const key = `${port}-${pid}`;
				connectionCounts.set(key, (connectionCounts.get(key) || 0) + 1);
			}

			// Initialize all requested port-pid pairs
			for (const [port, pid] of portPidPairs) {
				const key = `${port}-${pid}`;
				result.set(key, connectionCounts.get(key) || 0);
			}
		} catch {
			// If lsof fails, return 0 for all ports
			for (const [port, pid] of portPidPairs) {
				result.set(`${port}-${pid}`, 0);
			}
		}

		return result;
	}
}
