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
