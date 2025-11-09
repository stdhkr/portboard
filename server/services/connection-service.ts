import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Get the number of active connections for a port and PID
 * Returns the count of ESTABLISHED connections for the server process
 * @param port - The port number to check
 * @param pid - The process ID of the server to filter by
 */
export async function getConnectionCount(port: number, pid: number): Promise<number> {
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
 * Get connection counts for all ports in a single batch operation
 * Much faster than calling getConnectionCount for each port individually
 * @param portPidPairs - Array of [port, pid] tuples to check
 * @returns Map of "port-pid" -> connection count
 */
export async function getBatchConnectionCounts(
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
			portPidPairs.forEach(([port, pid]) => {
				result.set(`${port}-${pid}`, 0);
			});
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
			const name = parts[8]; // e.g., "localhost:3000->localhost:51234" or "127.0.0.1:pdb->127.0.0.1:51584"

			if (Number.isNaN(pid)) continue;

			// Extract LOCAL port from the connection string (before the arrow)
			// Format: "host:port->host:port" - we want the first port (local/server side)
			// Split by -> and take the left side, then extract port
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
		portPidPairs.forEach(([port, pid]) => {
			result.set(`${port}-${pid}`, 0);
		});
	}

	return result;
}
