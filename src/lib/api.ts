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

export interface OpenDirectoryResponse {
	success: boolean;
	error: string | null;
}

export interface IDEInfo {
	id: string;
	name: string;
	command: string;
	available: boolean;
	iconPath?: string;
}

export interface TerminalInfo {
	id: string;
	name: string;
	command: string;
	available: boolean;
	iconPath?: string;
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

/**
 * Fetch available IDEs
 */
export async function fetchAvailableIDEs(): Promise<IDEInfo[]> {
	const response = await fetch(`${API_BASE_URL}/ports/available-ides`);
	if (!response.ok) {
		throw new Error(`Failed to fetch available IDEs: ${response.statusText}`);
	}

	const result: ApiResponse<IDEInfo[]> = await response.json();
	if (result.error) {
		throw new Error(result.error);
	}

	return result.data || [];
}

/**
 * Fetch available terminals
 */
export async function fetchAvailableTerminals(): Promise<TerminalInfo[]> {
	const response = await fetch(`${API_BASE_URL}/ports/available-terminals`);
	if (!response.ok) {
		throw new Error(`Failed to fetch available terminals: ${response.statusText}`);
	}

	const result: ApiResponse<TerminalInfo[]> = await response.json();
	if (result.error) {
		throw new Error(result.error);
	}

	return result.data || [];
}

/**
 * Open directory in IDE
 */
export async function openInIDE(path: string, ideCommand: string): Promise<void> {
	const response = await fetch(`${API_BASE_URL}/ports/open-in-ide`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ path, ideCommand }),
	});

	if (!response.ok) {
		const result: OpenDirectoryResponse = await response.json();
		throw new Error(result.error || `Failed to open in IDE: ${response.statusText}`);
	}

	const result: OpenDirectoryResponse = await response.json();
	if (!result.success || result.error) {
		throw new Error(result.error || "Failed to open in IDE");
	}
}

/**
 * Open directory in terminal
 */
export async function openInTerminal(path: string, terminalCommand: string): Promise<void> {
	const response = await fetch(`${API_BASE_URL}/ports/open-in-terminal`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ path, terminalCommand }),
	});

	if (!response.ok) {
		const result: OpenDirectoryResponse = await response.json();
		throw new Error(result.error || `Failed to open in terminal: ${response.statusText}`);
	}

	const result: OpenDirectoryResponse = await response.json();
	if (!result.success || result.error) {
		throw new Error(result.error || "Failed to open in terminal");
	}
}
