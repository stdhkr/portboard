/**
 * API configuration with environment variable support
 *
 * This module provides API URLs that can be configured via environment variables
 * or auto-detected from the current window location.
 *
 * Priority:
 * 1. VITE_API_BASE_URL (explicit override)
 * 2. Auto-detection from window.location (production)
 * 3. Default: http://127.0.0.1:3033/api (development)
 */

/**
 * Get the base URL for API requests
 *
 * @returns The API base URL (e.g., "http://127.0.0.1:3033/api")
 */
const getApiBaseUrl = (): string => {
	// Priority 1: Use explicit environment variable if provided
	if (import.meta.env.VITE_API_BASE_URL) {
		return import.meta.env.VITE_API_BASE_URL;
	}

	// Priority 2: Auto-detect from current location (for production builds)
	if (typeof window !== "undefined") {
		const protocol = window.location.protocol;
		const hostname = window.location.hostname;
		const port = import.meta.env.VITE_API_PORT || "3033";

		return `${protocol}//${hostname}:${port}/api`;
	}

	// Priority 3: Fallback to default (development)
	return "http://127.0.0.1:3033/api";
};

/**
 * Get the base URL for static assets (icons, images)
 *
 * @returns The assets base URL (e.g., "http://127.0.0.1:3033")
 */
const getAssetsBaseUrl = (): string => {
	const apiUrl = getApiBaseUrl();
	return apiUrl.replace("/api", "");
};

/**
 * Base URL for API requests
 *
 * Example: "http://127.0.0.1:3033/api"
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Base URL for static assets (icons, images)
 *
 * Example: "http://127.0.0.1:3033"
 */
export const ASSETS_BASE_URL = getAssetsBaseUrl();
