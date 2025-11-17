/**
 * Frontend configuration constants
 *
 * This file centralizes all hardcoded values used in the frontend.
 * These values are used for UI behavior, timing, and display preferences.
 */

/**
 * Timing configuration for intervals and timeouts
 */
export const TIMING = {
	/** Auto-refresh interval for port list (milliseconds) */
	AUTO_REFRESH_INTERVAL: 5000, // 5 seconds
	/** Docker logs auto-refresh interval (milliseconds) */
	DOCKER_LOGS_REFRESH: 5000, // 5 seconds
	/** Timeout for copy button feedback display (milliseconds) */
	COPY_FEEDBACK_TIMEOUT: 2000, // 2 seconds
	/** Delay before closing dialog for animation (milliseconds) */
	DIALOG_CLOSE_DELAY: 200, // 200ms
} as const;

/**
 * Docker-related configuration
 */
export const DOCKER = {
	/** Default number of log lines to fetch */
	DEFAULT_LOG_LINES: 20,
	/** Available log line count options */
	LOG_LINE_OPTIONS: [20, 50, 100, 200] as const,
} as const;

/**
 * UI configuration
 */
export const UI = {
	/** Maximum layout width (Tailwind CSS class) */
	MAX_LAYOUT_WIDTH: "max-w-6xl",
	/** Default locale for date/time formatting */
	LOCALE: "ja-JP",
} as const;
