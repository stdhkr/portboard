import type { PortInfo } from "../types/port";

const API_BASE_URL = "http://127.0.0.1:3033/api";

export interface ApiResponse<T> {
	data: T | null;
	error: string | null;
}

export interface KillResponse {
	success: boolean;
	error: string | null;
}

/**
 * Fetch all listening ports
 */
export async function fetchPorts(): Promise<PortInfo[]> {
	const response = await fetch(`${API_BASE_URL}/ports`);
	if (!response.ok) {
		throw new Error(`Failed to fetch ports: ${response.statusText}`);
	}

	const result: ApiResponse<PortInfo[]> = await response.json();
	if (result.error) {
		throw new Error(result.error);
	}

	return result.data || [];
}

/**
 * Kill a process by PID
 */
export async function killProcess(pid: number): Promise<void> {
	const response = await fetch(`${API_BASE_URL}/ports/kill`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ pid }),
	});

	if (!response.ok) {
		const result: KillResponse = await response.json();
		throw new Error(result.error || `Failed to kill process: ${response.statusText}`);
	}

	const result: KillResponse = await response.json();
	if (!result.success || result.error) {
		throw new Error(result.error || "Failed to kill process");
	}
}
