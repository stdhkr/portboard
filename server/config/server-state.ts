import { SERVER_CONFIG } from "./constants";

/**
 * Server runtime state
 * Stores the actual ports that Portboard is using
 */

let serverPort: number | null = null;

export function setServerPort(port: number): void {
	serverPort = port;
}

export function getServerPort(): number | null {
	return serverPort;
}

/**
 * Get all protected Portboard ports (API server + Vite dev server)
 */
export function getProtectedPorts(): number[] {
	const ports: number[] = [];

	// Add API server port
	if (serverPort !== null) {
		ports.push(serverPort);
	}

	// Add Vite dev server port (from constants)
	ports.push(SERVER_CONFIG.DEV_SERVER_PORT);

	return ports;
}
