import { exec } from "node:child_process";
import { promisify } from "node:util";
import { extractAppIcon } from "./icon-service";

const execAsync = promisify(exec);

export interface ProcessMetadata {
	commandPath?: string;
	appName?: string;
	appIconPath?: string;
}

/**
 * Collect metadata for a process (command path, app name, icon)
 */
export async function collectProcessMetadata(
	pid: number,
	processName: string,
): Promise<ProcessMetadata> {
	let commandPath: string | undefined;
	let appName: string | undefined;
	let appIconPath: string | undefined;
	let cwd: string | undefined;

	try {
		// Try to get the full executable path using lsof first (more reliable for .app bundles)
		try {
			const { stdout: lsofOutput } = await execAsync(
				`lsof -p ${pid} 2>/dev/null | grep "txt.*REG" | head -1 | awk '{for(i=9;i<=NF;i++) printf $i" "; print ""}'`,
			);
			const executablePath = lsofOutput.trim();
			if (executablePath && executablePath.startsWith("/")) {
				commandPath = executablePath;
			}
		} catch {
			// Fall back to ps if lsof fails
		}

		// If lsof didn't work, fall back to ps
		if (!commandPath) {
			const { stdout: psOutput } = await execAsync(
				`ps -p ${pid} -o command= 2>/dev/null || true`,
			);
			commandPath = psOutput.trim() || undefined;
		}

		// Get the working directory of the process
		try {
			const { stdout: cwdOutput } = await execAsync(
				`lsof -a -p ${pid} -d cwd -F n 2>/dev/null | grep '^n' | head -1`,
			);
			cwd = cwdOutput.trim().substring(1); // Remove 'n' prefix
		} catch {
			// If getting cwd fails, continue without it
		}

		// Convert relative paths to absolute paths
		if (commandPath && cwd && !commandPath.startsWith("/")) {
			commandPath = resolveRelativePaths(commandPath, cwd);
		}

		// Extract application name from .app bundle path
		let appBundlePath: string | undefined;
		if (commandPath) {
			const appMatch = commandPath.match(/\/([^/]+\.app)\//);
			if (appMatch) {
				const firstAppIndex = commandPath.indexOf(appMatch[1]);
				appBundlePath = commandPath.substring(0, firstAppIndex + appMatch[1].length);
				appName = appMatch[1].replace(/\.app$/, "");
			}
		}

		// Extract app icon if we have an .app bundle path
		if (appBundlePath) {
			try {
				appIconPath = (await extractAppIcon(appBundlePath)) || undefined;
			} catch (error) {
				console.debug(`Failed to extract icon for ${appBundlePath}:`, error);
			}
		}

		// Special handling for Cursor
		if (!appName && processName.toLowerCase().includes("cursor")) {
			appName = "Cursor";
		}

		// Extract only the file path from the command
		if (commandPath) {
			const parts = commandPath.split(/\s+/);
			const filePath = parts.find((part) => part.includes("/") && !part.startsWith("-"));
			if (filePath) {
				commandPath = filePath;
			}
		}

		// Try to get project name from package.json
		if (!appName && commandPath && cwd) {
			try {
				const { stdout: packageJson } = await execAsync(
					`cat "${cwd}/package.json" 2>/dev/null || echo ""`,
				);
				if (packageJson) {
					const pkg = JSON.parse(packageJson);
					if (pkg.name) {
						appName = pkg.name;
					}
				}
			} catch {
				// If reading package.json fails, continue without app name
			}
		}
	} catch {
		// If collection fails, return empty metadata
	}

	return { commandPath, appName, appIconPath };
}

/**
 * Resolve relative paths to absolute paths
 */
function resolveRelativePaths(commandPath: string, cwd: string): string {
	const parts = commandPath.split(/\s+/);

	if (parts.length > 0 && parts[0].includes("/")) {
		// First part looks like a path, resolve it
		const resolvedPath = `${cwd}/${parts[0]}`;
		return [resolvedPath, ...parts.slice(1)].join(" ");
	}

	if (parts.length > 1) {
		// Check if any argument is a relative path
		const resolvedParts = parts.map((part, index) => {
			if (index > 0 && part.includes("/") && !part.startsWith("/") && !part.startsWith("-")) {
				return `${cwd}/${part}`;
			}
			return part;
		});
		return resolvedParts.join(" ");
	}

	return commandPath;
}
