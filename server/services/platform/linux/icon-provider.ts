/**
 * Linux Icon Provider
 * Extracts icons from .desktop files and system icon directories
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { IIconProvider } from "../types";

const execAsync = promisify(exec);

export class LinuxIconProvider implements IIconProvider {
	private readonly ICON_SEARCH_PATHS = [
		"/usr/share/pixmaps",
		"/usr/share/icons/hicolor",
		"/usr/share/icons/Humanity",
		"/usr/share/icons/gnome",
		"~/.local/share/icons",
	];

	private readonly DESKTOP_FILE_PATHS = ["/usr/share/applications", "~/.local/share/applications"];

	async extractIcon(appPath: string): Promise<string | null> {
		try {
			// appPath is the command path (e.g., "/usr/bin/code")
			const appName = appPath.split("/").pop() || "";

			// Try to find .desktop file for this application
			const iconName = await this.findIconNameFromDesktopFile(appName);
			if (!iconName) {
				return null;
			}

			// Find the actual icon file
			const iconPath = await this.findIconFile(iconName);
			return iconPath;
		} catch {
			return null;
		}
	}

	getCachedIconPath(_appPath: string): string | null {
		// Linux doesn't need caching in the same way as macOS
		// Icons are already in standard locations
		return null;
	}

	isSupported(): boolean {
		return true;
	}

	/**
	 * Find Icon= field from .desktop file
	 */
	private async findIconNameFromDesktopFile(appName: string): Promise<string | null> {
		for (const basePath of this.DESKTOP_FILE_PATHS) {
			const desktopFilePath = `${basePath}/${appName}.desktop`;
			try {
				const { stdout } = await execAsync(`cat "${desktopFilePath}" 2>/dev/null || true`);
				if (!stdout) continue;

				// Parse Icon= line
				const iconMatch = stdout.match(/^Icon=(.+)$/m);
				if (iconMatch?.[1]) {
					return iconMatch[1].trim();
				}
			} catch {
				// Ignore errors and try next path
			}
		}

		// Fallback: use app name as icon name
		return appName;
	}

	/**
	 * Find actual icon file from icon name
	 * Prioritizes PNG files, falls back to SVG
	 */
	private async findIconFile(iconName: string): Promise<string | null> {
		// If iconName is already an absolute path, use it
		if (iconName.startsWith("/") && (iconName.endsWith(".png") || iconName.endsWith(".svg"))) {
			try {
				await execAsync(`test -f "${iconName}"`);
				return iconName;
			} catch {
				return null;
			}
		}

		// Search in standard icon directories
		for (const basePath of this.ICON_SEARCH_PATHS) {
			// Try PNG first (preferred)
			try {
				const pngPath = await this.searchIconInPath(basePath, iconName, "png");
				if (pngPath) return pngPath;
			} catch {
				// Continue searching
			}

			// Try SVG as fallback
			try {
				const svgPath = await this.searchIconInPath(basePath, iconName, "svg");
				if (svgPath) return svgPath;
			} catch {
				// Continue searching
			}
		}

		return null;
	}

	/**
	 * Search for icon file in a specific path
	 */
	private async searchIconInPath(
		basePath: string,
		iconName: string,
		extension: string,
	): Promise<string | null> {
		try {
			// Search for exact match or in subdirectories
			const { stdout } = await execAsync(
				`find "${basePath}" -name "${iconName}.${extension}" 2>/dev/null | head -1`,
			);
			const iconPath = stdout.trim();
			return iconPath || null;
		} catch {
			return null;
		}
	}
}
