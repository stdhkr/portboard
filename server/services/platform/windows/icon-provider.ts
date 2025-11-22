/**
 * Windows Icon Provider
 * Extracts icons from .exe files using PowerShell
 */

import { exec } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { IIconProvider } from "../types";

const execAsync = promisify(exec);

export class WindowsIconProvider implements IIconProvider {
	private readonly ICON_CACHE_DIR = join(tmpdir(), "portboard-icons");

	constructor() {
		// Ensure cache directory exists
		if (!existsSync(this.ICON_CACHE_DIR)) {
			try {
				mkdirSync(this.ICON_CACHE_DIR, { recursive: true });
			} catch {
				// Ignore if we can't create it
			}
		}
	}

	async extractIcon(appPath: string): Promise<string | null> {
		try {
			// Check if executable exists
			if (!appPath || !appPath.endsWith(".exe")) {
				return null;
			}

			// Generate cache filename based on exe path
			const cacheKey = this.generateCacheKey(appPath);
			const cachedPath = join(this.ICON_CACHE_DIR, `${cacheKey}.png`);

			// Check if already cached
			if (existsSync(cachedPath)) {
				return cachedPath;
			}

			// Use PowerShell to extract icon
			// This creates a bitmap from the associated icon and saves as PNG
			const psScript = `
				Add-Type -AssemblyName System.Drawing
				$icon = [System.Drawing.Icon]::ExtractAssociatedIcon("${appPath.replace(/\\/g, "\\\\")}")
				if ($icon) {
					$bitmap = $icon.ToBitmap()
					$bitmap.Save("${cachedPath.replace(/\\/g, "\\\\")}")
					Write-Output "success"
				}
			`.replace(/\n/g, " ");

			const { stdout } = await execAsync(`powershell -Command "${psScript}"`, {
				timeout: 10000,
			});

			if (stdout.trim().includes("success") && existsSync(cachedPath)) {
				return cachedPath;
			}

			return null;
		} catch {
			return null;
		}
	}

	getCachedIconPath(appPath: string): string | null {
		if (!appPath) return null;

		const cacheKey = this.generateCacheKey(appPath);
		const cachedPath = join(this.ICON_CACHE_DIR, `${cacheKey}.png`);

		if (existsSync(cachedPath)) {
			return cachedPath;
		}

		return null;
	}

	isSupported(): boolean {
		return true;
	}

	/**
	 * Generate a cache key from the executable path
	 */
	private generateCacheKey(appPath: string): string {
		// Simple hash: replace invalid filename chars and limit length
		return appPath.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 100);
	}
}
