import { exec } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// Icon cache directory
const ICON_CACHE_DIR = path.join(os.tmpdir(), "portboard-icons");

/**
 * Initialize icon cache directory
 */
async function ensureCacheDir(): Promise<void> {
	try {
		await fs.mkdir(ICON_CACHE_DIR, { recursive: true });
	} catch (error) {
		console.error("Failed to create icon cache directory:", error);
	}
}

/**
 * Generate a cache key for an app path
 */
function getCacheKey(appPath: string): string {
	return crypto.createHash("md5").update(appPath).digest("hex");
}

/**
 * Extract icon from .app bundle and convert to PNG
 * @param appPath Path to .app bundle (e.g., "/Applications/Visual Studio Code.app")
 * @returns Path to extracted PNG icon, or null if extraction failed
 */
export async function extractAppIcon(appPath: string): Promise<string | null> {
	// Only handle macOS .app bundles for now
	if (!appPath.endsWith(".app")) {
		return null;
	}

	// Check if app exists
	try {
		await fs.access(appPath);
	} catch {
		return null;
	}

	// Ensure cache directory exists
	await ensureCacheDir();

	// Check cache first
	const cacheKey = getCacheKey(appPath);
	const cachedIconPath = path.join(ICON_CACHE_DIR, `${cacheKey}.png`);

	try {
		await fs.access(cachedIconPath);
		// Cache hit - return cached icon path
		return `/api/icons/${cacheKey}.png`;
	} catch {
		// Cache miss - extract icon
	}

	try {
		// Find .icns file in Contents/Resources/
		const resourcesDir = path.join(appPath, "Contents", "Resources");

		// Try to find the icon file referenced in Info.plist
		let icnsFileName = "AppIcon.icns"; // Default
		try {
			const infoPlistPath = path.join(appPath, "Contents", "Info.plist");
			const { stdout } = await execAsync(
				`/usr/libexec/PlistBuddy -c "Print :CFBundleIconFile" "${infoPlistPath}"`,
			);
			const iconFile = stdout.trim();
			if (iconFile) {
				icnsFileName = iconFile.endsWith(".icns") ? iconFile : `${iconFile}.icns`;
			}
		} catch {
			// If we can't read Info.plist, try common names
		}

		// Try the specified icon file first, then fallback to common names
		const iconCandidates = [icnsFileName, "AppIcon.icns", "app.icns", "icon.icns", "Icon.icns"];

		let icnsPath: string | null = null;
		for (const candidate of iconCandidates) {
			const candidatePath = path.join(resourcesDir, candidate);
			try {
				await fs.access(candidatePath);
				icnsPath = candidatePath;
				break;
			} catch {
				// Try next candidate
			}
		}

		if (!icnsPath) {
			// Try to find any .icns file
			try {
				const files = await fs.readdir(resourcesDir);
				const icnsFile = files.find((f) => f.endsWith(".icns"));
				if (icnsFile) {
					icnsPath = path.join(resourcesDir, icnsFile);
				}
			} catch {
				return null;
			}
		}

		if (!icnsPath) {
			return null;
		}

		// Convert .icns to PNG using sips (macOS built-in tool)
		// Extract the largest representation (usually 512x512 or 1024x1024)
		await execAsync(
			`sips -s format png "${icnsPath}" --out "${cachedIconPath}" --resampleHeightWidthMax 64`,
		);

		// Verify the output file exists
		await fs.access(cachedIconPath);

		return `/api/icons/${cacheKey}.png`;
	} catch (error) {
		console.debug(`Failed to extract icon from ${appPath}:`, error);
		return null;
	}
}

/**
 * Get cached icon by cache key
 */
export async function getCachedIcon(cacheKey: string): Promise<Buffer | null> {
	const iconPath = path.join(ICON_CACHE_DIR, cacheKey);

	try {
		return await fs.readFile(iconPath);
	} catch {
		return null;
	}
}

/**
 * Clear icon cache (optional maintenance function)
 */
export async function clearIconCache(): Promise<void> {
	try {
		const files = await fs.readdir(ICON_CACHE_DIR);
		await Promise.all(files.map((file) => fs.unlink(path.join(ICON_CACHE_DIR, file))));
	} catch (error) {
		console.error("Failed to clear icon cache:", error);
	}
}
