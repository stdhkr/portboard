/**
 * macOS Browser Provider
 * Uses 'open' command and os.networkInterfaces()
 */

import { exec } from "node:child_process";
import { networkInterfaces } from "node:os";
import { promisify } from "node:util";
import type { IBrowserProvider } from "../types";

const execAsync = promisify(exec);

export class MacOSBrowserProvider implements IBrowserProvider {
	/**
	 * Open URL in default browser using 'open' command
	 */
	async openURL(url: string): Promise<void> {
		try {
			await execAsync(`open "${url}"`);
		} catch (error) {
			throw new Error(
				`Failed to open URL: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get local network IP address
	 */
	getLocalIPAddress(): string | null {
		const interfaces = networkInterfaces();

		for (const name of Object.keys(interfaces)) {
			const iface = interfaces[name];
			if (!iface) continue;

			for (const addr of iface) {
				// Skip internal (loopback) and non-IPv4 addresses
				if (addr.family === "IPv4" && !addr.internal) {
					return addr.address;
				}
			}
		}

		return null;
	}
}
