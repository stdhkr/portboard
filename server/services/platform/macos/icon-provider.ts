/**
 * macOS Icon Provider
 * Uses sips to extract icons from .app bundles
 */

import { extractAppIcon } from "../../icon-service";
import type { IIconProvider } from "../types";

export class MacOSIconProvider implements IIconProvider {
	/**
	 * Extract icon from .app bundle
	 */
	async extractIcon(appPath: string): Promise<string | null> {
		return extractAppIcon(appPath);
	}

	/**
	 * Get cached icon path
	 * Note: Current icon-service doesn't expose a sync getCached function,
	 * so we return null. Icon extraction handles caching internally.
	 */
	getCachedIconPath(_appPath: string): string | null {
		return null;
	}

	/**
	 * macOS supports icon extraction
	 */
	isSupported(): boolean {
		return true;
	}
}
