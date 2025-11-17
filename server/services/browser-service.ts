import { NETWORK } from "../config/constants";
import { getPlatformProviderSingleton } from "./platform";

/**
 * Get local IP address (for network URL)
 * Returns the first non-internal IPv4 address found
 */
export function getLocalIPAddress(): string | null {
	const provider = getPlatformProviderSingleton();
	return provider.browserProvider.getLocalIPAddress();
}

/**
 * Get network URL for a port (e.g., http://192.168.1.100:3000)
 */
export function getNetworkURL(port: number): string | null {
	const localIP = getLocalIPAddress();
	if (!localIP) {
		return null;
	}

	const protocol = port === NETWORK.HTTPS_PORT ? "https" : "http";
	return `${protocol}://${localIP}:${port}`;
}

/**
 * Get localhost URL for a port (e.g., http://localhost:3000)
 */
export function getLocalhostURL(port: number): string {
	const protocol = port === NETWORK.HTTPS_PORT ? "https" : "http";
	return `${protocol}://localhost:${port}`;
}

/**
 * Open URL in default browser
 * Cross-platform support via platform abstraction layer
 */
export async function openInBrowser(url: string): Promise<void> {
	const provider = getPlatformProviderSingleton();
	await provider.browserProvider.openURL(url);
}
