/**
 * Server-side configuration constants
 *
 * This file centralizes all hardcoded values used in the backend.
 * Values can be overridden via environment variables.
 */

/**
 * Server configuration
 */
export const SERVER_CONFIG = {
	/** Default port for the server (can be overridden by PORT env var) */
	DEFAULT_PORT: Number(process.env.DEFAULT_PORT) || 3033,
	/** Maximum number of port attempts when default port is unavailable */
	MAX_PORT_ATTEMPTS: Number(process.env.MAX_PORT_ATTEMPTS) || 10,
	/** Default host binding address (localhost-only for security) */
	DEFAULT_HOST: process.env.DEFAULT_HOST || "127.0.0.1",
	/** Vite dev server port (for self-port protection) */
	DEV_SERVER_PORT: Number(process.env.VITE_DEV_PORT) || 3000,
} as const;

/**
 * Timing configuration for intervals and timeouts
 */
export const TIMING = {
	/** Auto-refresh interval for port list (milliseconds) */
	AUTO_REFRESH_INTERVAL: Number(process.env.AUTO_REFRESH_INTERVAL) || 5000, // 5 seconds
	/** Docker logs auto-refresh interval (milliseconds) */
	DOCKER_LOGS_REFRESH: Number(process.env.DOCKER_LOGS_REFRESH) || 5000, // 5 seconds
	/** Timeout for copy button feedback display (milliseconds) */
	COPY_FEEDBACK_TIMEOUT: Number(process.env.COPY_FEEDBACK_TIMEOUT) || 2000, // 2 seconds
	/** Delay before closing dialog for animation (milliseconds) */
	DIALOG_CLOSE_DELAY: Number(process.env.DIALOG_CLOSE_DELAY) || 200, // 200ms
} as const;

/**
 * Docker-related configuration
 */
export const DOCKER = {
	/** Default number of log lines to fetch */
	DEFAULT_LOG_LINES: Number(process.env.DOCKER_DEFAULT_LOG_LINES) || 20,
	/** Available log line count options */
	LOG_LINE_OPTIONS: [20, 50, 100, 200] as const,
	/** Maximum buffer size for docker logs command (10MB) */
	LOGS_MAX_BUFFER: Number(process.env.DOCKER_LOGS_MAX_BUFFER) || 10 * 1024 * 1024,
} as const;

/**
 * Icon extraction and caching configuration
 */
export const ICON = {
	/** Directory name for icon cache (relative to system temp dir) */
	CACHE_DIR: process.env.ICON_CACHE_DIR || "portboard-icons",
	/** Icon resize dimensions (width and height) */
	RESIZE_SIZE: Number(process.env.ICON_RESIZE_SIZE) || 64,
	/** Default icon file names to search for in .app bundles */
	DEFAULT_NAMES: ["AppIcon.icns", "app.icns", "icon.icns", "Icon.icns"] as const,
} as const;

/**
 * Network-related constants
 */
export const NETWORK = {
	/** HTTPS default port number */
	HTTPS_PORT: 443,
} as const;
