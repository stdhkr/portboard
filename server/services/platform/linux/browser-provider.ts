/**
 * Linux Browser Provider
 * Uses xdg-open for opening URLs
 */

import { exec } from "node:child_process";
import { networkInterfaces } from "node:os";
import { promisify } from "node:util";
import type { IBrowserProvider } from "../types";

const execAsync = promisify(exec);

export class LinuxBrowserProvider implements IBrowserProvider {
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
