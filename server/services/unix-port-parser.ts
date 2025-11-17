export interface BasicPortInfo {
	processName: string;
	pid: number;
	user: string;
	protocol: string;
	port: number;
	bindAddress: string;
}

/**
 * Parse lsof output to extract basic port information
 * Format: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
 * Example: node    1234 user   23u  IPv4 0x1234      0t0  TCP 127.0.0.1:3000 (LISTEN)
 */
export function parseLsofOutput(lsofOutput: string): BasicPortInfo[] {
	const lines = lsofOutput.trim().split("\n").filter(Boolean);
	const basicPortInfo: BasicPortInfo[] = [];

	for (const line of lines) {
		const parts = line.split(/\s+/);
		if (parts.length < 10) continue;

		// Decode escape sequences in process name (e.g., \x20 -> space)
		const rawProcessName = parts[0];
		const processName = rawProcessName.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) =>
			String.fromCharCode(Number.parseInt(hex, 16)),
		);
		const pid = Number.parseInt(parts[1], 10);
		const user = parts[2]; // USER field
		const protocol = parts[7]; // TCP or UDP
		const addressWithState = parts[8]; // e.g., 127.0.0.1:3000 or *:3000

		// Extract port and address from the NAME field
		// Remove (LISTEN) suffix if present
		const address = addressWithState.replace(/\(LISTEN\)$/, "");

		// Extract port from address (format: address:port)
		const portMatch = address.match(/:(\d+)$/);
		if (!portMatch) continue;

		const port = Number.parseInt(portMatch[1], 10);
		if (Number.isNaN(port)) continue;

		// Extract bind address (everything before the last colon)
		const bindAddress = address.substring(0, address.lastIndexOf(":")) || "*";

		basicPortInfo.push({ processName, pid, user, protocol, port, bindAddress });
	}

	return basicPortInfo;
}
