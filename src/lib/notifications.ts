import type { PortInfo } from "@/types/port";

/**
 * Check if a port is a protected Portboard port
 */
function isProtectedPort(port: number): boolean {
	// Portboard API server (default 3033) and Vite dev server (3000)
	return port === 3033 || port === 3000;
}

/**
 * Send a browser notification for newly opened ports
 */
export function notifyNewPorts(
	newPorts: PortInfo[],
	t: (key: string, options?: Record<string, unknown>) => string,
): void {
	if (!("Notification" in window)) {
		return;
	}

	if (Notification.permission !== "granted") {
		return;
	}

	// Filter out protected ports
	const filteredPorts = newPorts.filter((p) => !isProtectedPort(p.port));

	if (filteredPorts.length === 0) {
		return;
	}

	// Create notification body
	let body: string;
	if (filteredPorts.length === 1) {
		const port = filteredPorts[0];
		body = t("notifications.newPort.single", {
			port: port.port,
			process: port.processName,
		});
	} else {
		const portList = filteredPorts.map((p) => `${p.port} (${p.processName})`).join(", ");
		body = t("notifications.newPort.multiple", {
			count: filteredPorts.length,
			ports: portList,
		});
	}

	const notification = new Notification(t("notifications.newPort.title"), {
		body,
		tag: "portboard-new-ports",
		requireInteraction: false,
	});

	// Auto-close after 5 seconds
	setTimeout(() => notification.close(), 5000);
}

/**
 * Detect newly opened ports by comparing with previous port list
 */
export function detectNewPorts(currentPorts: PortInfo[], previousPorts: Set<number>): PortInfo[] {
	// First load - don't notify
	if (previousPorts.size === 0) {
		return [];
	}

	// Find ports that weren't in the previous list
	return currentPorts.filter((port) => !previousPorts.has(port.port));
}

/**
 * Create a Set of port numbers from PortInfo array
 */
export function createPortSet(ports: PortInfo[]): Set<number> {
	return new Set(ports.map((p) => p.port));
}
