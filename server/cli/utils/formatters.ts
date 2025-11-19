/**
 * Format memory in bytes to human-readable format
 */
export function formatMemory(bytes: number | undefined): string {
	if (bytes === undefined) return "-";
	if (bytes < 10000) return "~0 MB"; // Less than 10KB

	const mb = bytes / 1024 / 1024;
	return `${mb.toFixed(0)} MB`;
}

/**
 * Format CPU usage percentage
 */
export function formatCPU(cpu: number | undefined): string {
	if (cpu === undefined) return "-";
	return `${cpu.toFixed(1)}%`;
}

/**
 * Format uptime duration
 */
export function formatUptime(startTime: Date | undefined): string {
	if (!startTime) return "-";

	const now = new Date();
	const uptimeMs = now.getTime() - startTime.getTime();
	const uptimeSec = Math.floor(uptimeMs / 1000);

	const days = Math.floor(uptimeSec / 86400);
	const hours = Math.floor((uptimeSec % 86400) / 3600);
	const minutes = Math.floor((uptimeSec % 3600) / 60);

	if (days > 0) {
		return `${days}d ${hours}h`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
}
