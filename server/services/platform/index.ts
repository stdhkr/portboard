/**
 * Platform Service Factory
 *
 * Automatically detects the current platform and provides the appropriate
 * platform-specific implementations.
 */

import { LinuxPlatformProvider } from "./linux";
import { MacOSPlatformProvider } from "./macos";
import type { IPlatformProvider, Platform } from "./types";
import { WindowsPlatformProvider } from "./windows";

/**
 * Detect the current platform
 */
export function detectPlatform(): Platform {
	const platform = process.platform;

	if (platform === "darwin" || platform === "win32" || platform === "linux") {
		return platform;
	}

	throw new Error(`Unsupported platform: ${platform}`);
}

/**
 * Get the platform-specific provider
 * Uses static imports for better performance (no lazy loading)
 */
export function getPlatformProvider(): IPlatformProvider {
	const platform = detectPlatform();

	switch (platform) {
		case "darwin":
			return new MacOSPlatformProvider();
		case "win32":
			return new WindowsPlatformProvider();
		case "linux":
			return new LinuxPlatformProvider();
		default:
			throw new Error(`Unsupported platform: ${platform}`);
	}
}

/**
 * Singleton instance for platform provider
 */
let platformProviderInstance: IPlatformProvider | null = null;

/**
 * Get or create the platform provider singleton
 */
export function getPlatformProviderSingleton(): IPlatformProvider {
	if (!platformProviderInstance) {
		platformProviderInstance = getPlatformProvider();
	}
	return platformProviderInstance;
}

// Re-export types for convenience
export type * from "./types";
