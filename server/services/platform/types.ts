/**
 * Platform-specific service interfaces
 *
 * This file defines the common interfaces that all platform implementations must follow.
 * Each platform (macOS, Windows, Linux) provides its own implementation.
 */

/**
 * Basic port information from platform-specific command
 */
export interface BasicPortInfo {
	port: number;
	pid: number;
	processName: string;
	protocol: string;
	bindAddress: string;
	user?: string;
}

/**
 * Process metadata (command path, working directory, etc.)
 */
export interface ProcessMetadata {
	commandPath?: string;
	cwd?: string;
	appName?: string;
	appIconPath?: string;
	cpuUsage?: number;
	memoryUsage?: number;
	memoryRSS?: number;
	processStartTime?: Date;
}

/**
 * Application/IDE information
 */
export interface ApplicationInfo {
	name: string;
	path: string;
	iconPath?: string;
	bundleId?: string; // macOS only
}

/**
 * Port Provider Interface
 * Responsible for listing listening ports on the system
 */
export interface IPortProvider {
	/**
	 * Get all listening ports
	 * @returns Array of basic port information
	 */
	getListeningPorts(): Promise<BasicPortInfo[]>;

	/**
	 * Get connection count for a specific port/PID combination
	 * @param port Port number
	 * @param pid Process ID
	 * @returns Number of active connections
	 */
	getConnectionCount(port: number, pid: number): Promise<number>;

	/**
	 * Get connection counts for multiple ports (batch operation)
	 * @param portPidPairs Array of [port, pid] tuples
	 * @returns Map of "port-pid" -> connection count
	 */
	getBatchConnectionCounts(portPidPairs: Array<[number, number]>): Promise<Map<string, number>>;
}

/**
 * Process Provider Interface
 * Responsible for process management and metadata collection
 */
export interface IProcessProvider {
	/**
	 * Kill a process by PID
	 * @param pid Process ID
	 * @throws Error if process cannot be killed
	 */
	killProcess(pid: number): Promise<void>;

	/**
	 * Get metadata for a single process
	 * @param pid Process ID
	 * @param processName Process name (for optimization)
	 * @returns Process metadata
	 */
	getProcessMetadata(pid: number, processName: string): Promise<ProcessMetadata>;

	/**
	 * Get metadata for multiple processes (batch operation)
	 * @param pidProcessPairs Array of {pid, processName} objects
	 * @returns Map of pid -> ProcessMetadata
	 */
	getBatchProcessMetadata(
		pidProcessPairs: Array<{ pid: number; processName: string }>,
	): Promise<Map<number, ProcessMetadata>>;

	/**
	 * Check if current user owns a process
	 * @param pid Process ID
	 * @returns true if current user owns the process
	 */
	isProcessOwnedByCurrentUser(pid: number): Promise<boolean>;
}

/**
 * Icon Provider Interface
 * Responsible for extracting and caching application icons
 */
export interface IIconProvider {
	/**
	 * Extract icon from application bundle/executable
	 * @param appPath Path to application (.app, .exe, etc.)
	 * @returns Path to extracted icon (in cache directory)
	 */
	extractIcon(appPath: string): Promise<string | null>;

	/**
	 * Get cached icon path if available
	 * @param appPath Path to application
	 * @returns Cached icon path or null
	 */
	getCachedIconPath(appPath: string): string | null;

	/**
	 * Check if platform supports icon extraction
	 * @returns true if icon extraction is supported
	 */
	isSupported(): boolean;
}

/**
 * IDE/Application Provider Interface
 * Responsible for detecting installed IDEs and applications
 */
export interface IApplicationProvider {
	/**
	 * Detect installed IDEs
	 * @returns Array of detected IDEs
	 */
	detectIDEs(): Promise<ApplicationInfo[]>;

	/**
	 * Detect installed terminal applications
	 * @returns Array of detected terminals
	 */
	detectTerminals(): Promise<ApplicationInfo[]>;

	/**
	 * Open a directory in an IDE
	 * @param idePath Path to IDE executable
	 * @param directoryPath Directory to open
	 */
	openInIDE(idePath: string, directoryPath: string): Promise<void>;

	/**
	 * Open a directory in a terminal
	 * @param terminalPath Path to terminal executable
	 * @param directoryPath Directory to open
	 */
	openInTerminal(terminalPath: string, directoryPath: string): Promise<void>;

	/**
	 * Open a shell inside a Docker container in a terminal
	 * @param terminalPath Path to terminal executable
	 * @param containerId Docker container ID
	 * @param shell Shell to use (bash, sh, etc.)
	 */
	openContainerShell(terminalPath: string, containerId: string, shell: string): Promise<void>;

	/**
	 * Check if platform supports IDE/Terminal detection
	 * @returns true if detection is supported
	 */
	isSupported(): boolean;
}

/**
 * Browser Provider Interface
 * Responsible for opening URLs in the default browser
 */
export interface IBrowserProvider {
	/**
	 * Open a URL in the default browser
	 * @param url URL to open
	 */
	openURL(url: string): Promise<void>;

	/**
	 * Get the local network IP address
	 * @returns Local IP address (e.g., 192.168.1.100)
	 */
	getLocalIPAddress(): string | null;
}

/**
 * Platform Service Provider
 * Aggregates all platform-specific providers
 */
export interface IPlatformProvider {
	readonly portProvider: IPortProvider;
	readonly processProvider: IProcessProvider;
	readonly iconProvider: IIconProvider;
	readonly applicationProvider: IApplicationProvider;
	readonly browserProvider: IBrowserProvider;
}

/**
 * Supported platforms
 */
export type Platform = "darwin" | "win32" | "linux";
