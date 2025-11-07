import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Get the number of active connections for a port
 * Returns the count of ESTABLISHED connections
 */
export async function getConnectionCount(port: number): Promise<number> {
	try {
		const { stdout } = await execAsync(
			`lsof -i :${port} -n 2>/dev/null | grep ESTABLISHED | wc -l || echo 0`,
		);
		const count = Number.parseInt(stdout.trim(), 10);
		return Number.isNaN(count) ? 0 : count;
	} catch {
		return 0;
	}
}
