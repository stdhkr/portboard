import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { extractAppIcon } from "./icon-service";

const execAsync = promisify(exec);

export interface IDEInfo {
	id: string;
	name: string;
	command: string;
	available: boolean;
	iconPath?: string; // Optional path to the icon (e.g., /api/icons/cursor.png)
}

export interface TerminalInfo {
	id: string;
	name: string;
	command: string;
	available: boolean;
	iconPath?: string; // Optional path to the icon (e.g., /api/icons/ghostty.png)
}

interface IDEConfig {
	id: string;
	name: string;
	command: string;
	macAppPath?: string; // Fallback path for macOS .app bundles
}

interface TerminalConfig {
	id: string;
	name: string;
	command: string;
	macAppPath?: string;
}

// Popular IDE commands to check
// Note: Terminal-based editors (vim, nvim, emacs) are excluded as they don't work well with directory opening
const IDE_COMMANDS: IDEConfig[] = [
	{
		id: "cursor",
		name: "Cursor",
		command: "cursor",
		macAppPath: "/Applications/Cursor.app",
	},
	{
		id: "vscode",
		name: "VS Code",
		command: "code",
		macAppPath: "/Applications/Visual Studio Code.app",
	},
	{
		id: "vscode-insiders",
		name: "VS Code Insiders",
		command: "code-insiders",
		macAppPath: "/Applications/Visual Studio Code - Insiders.app",
	},
	{ id: "webstorm", name: "WebStorm", command: "webstorm" },
	{ id: "idea", name: "IntelliJ IDEA", command: "idea" },
	{ id: "phpstorm", name: "PhpStorm", command: "phpstorm" },
	{ id: "pycharm", name: "PyCharm", command: "pycharm" },
	{ id: "goland", name: "GoLand", command: "goland" },
	{ id: "rider", name: "Rider", command: "rider" },
	{ id: "clion", name: "CLion", command: "clion" },
	{ id: "rubymine", name: "RubyMine", command: "rubymine" },
	{ id: "fleet", name: "Fleet", command: "fleet" },
	{ id: "sublime", name: "Sublime Text", command: "subl" },
	{ id: "atom", name: "Atom", command: "atom" },
	{ id: "zed", name: "Zed", command: "zed" },
];

// Popular terminal applications to check
const TERMINAL_COMMANDS: TerminalConfig[] = [
	{
		id: "ghostty",
		name: "Ghostty",
		command: "ghostty",
		macAppPath: "/Applications/Ghostty.app",
	},
	{
		id: "iterm2",
		name: "iTerm2",
		command: "iterm",
		macAppPath: "/Applications/iTerm.app",
	},
	{
		id: "warp",
		name: "Warp",
		command: "warp",
		macAppPath: "/Applications/Warp.app",
	},
	{
		id: "alacritty",
		name: "Alacritty",
		command: "alacritty",
		macAppPath: "/Applications/Alacritty.app",
	},
	{
		id: "kitty",
		name: "Kitty",
		command: "kitty",
		macAppPath: "/Applications/kitty.app",
	},
	{
		id: "hyper",
		name: "Hyper",
		command: "hyper",
		macAppPath: "/Applications/Hyper.app",
	},
	{
		id: "terminal",
		name: "Terminal",
		command: "open -a Terminal",
		macAppPath: "/System/Applications/Utilities/Terminal.app",
	},
];

/**
 * Find .app bundle path using macOS Spotlight (mdfind)
 * @param appName The application name (e.g., "Cursor", "Visual Studio Code")
 * @returns Path to .app bundle, or null if not found
 */
async function findAppPath(appName: string): Promise<string | null> {
	if (process.platform !== "darwin") {
		return null;
	}

	try {
		// Use mdfind to search for .app bundles by name
		const { stdout } = await execAsync(
			`mdfind "kMDItemKind == 'Application' && kMDItemFSName == '${appName}.app'"`,
		);
		const paths = stdout.trim().split("\n").filter(Boolean);

		if (paths.length > 0) {
			// Prefer /Applications/ over ~/Applications/
			const appPath = paths.find((p) => p.startsWith("/Applications/"));
			return appPath || paths[0];
		}
	} catch (error) {
		console.debug(`Failed to find ${appName}.app using mdfind:`, error);
	}

	return null;
}

/**
 * Check if a command is available in the system PATH or via .app path
 */
async function isCommandAvailable(
	command: string,
	macAppPath?: string,
): Promise<boolean> {
	// First, try the command in PATH
	try {
		const checkCommand =
			process.platform === "win32" ? `where ${command}` : `which ${command}`;
		await execAsync(checkCommand);
		return true;
	} catch {
		// If command not found in PATH and we're on macOS, try the .app path
		if (process.platform === "darwin" && macAppPath && existsSync(macAppPath)) {
			return true;
		}
		return false;
	}
}

/**
 * Get the actual command to use (PATH command or .app path)
 */
async function getActualCommand(
	command: string,
	macAppPath?: string,
	isTerminal = false,
): Promise<string> {
	// Special handling for Terminal - always use "open -a" command
	if (isTerminal && command.includes("open -a")) {
		return command;
	}

	// First, try the command in PATH
	try {
		const checkCommand = `which ${command}`;
		await execAsync(checkCommand);
		return command;
	} catch {
		// If command not found in PATH and we're on macOS, use the .app path
		if (process.platform === "darwin" && macAppPath && existsSync(macAppPath)) {
			return macAppPath;
		}
		return command;
	}
}

/**
 * Detect all available IDEs on the system
 */
export async function detectAvailableIDEs(): Promise<IDEInfo[]> {
	const results = await Promise.all(
		IDE_COMMANDS.map(async (ide) => {
			// First, try to find .app path dynamically using mdfind
			let resolvedAppPath = ide.macAppPath;
			if (process.platform === "darwin" && !resolvedAppPath) {
				resolvedAppPath = (await findAppPath(ide.name)) || undefined;
			}

			const available = await isCommandAvailable(ide.command, resolvedAppPath);
			const actualCommand = available
				? await getActualCommand(ide.command, resolvedAppPath)
				: ide.command;

			// Extract icon if available (macOS only)
			let iconPath: string | undefined;
			if (available && resolvedAppPath && process.platform === "darwin") {
				try {
					iconPath = (await extractAppIcon(resolvedAppPath)) || undefined;
				} catch (error) {
					console.debug(`Failed to extract icon for ${ide.name}:`, error);
				}
			}

			return {
				id: ide.id,
				name: ide.name,
				command: actualCommand, // Use the actual path (either PATH command or .app path)
				available,
				iconPath,
			};
		}),
	);

	return results;
}

/**
 * Detect all available terminals on the system
 */
export async function detectAvailableTerminals(): Promise<TerminalInfo[]> {
	const results = await Promise.all(
		TERMINAL_COMMANDS.map(async (terminal) => {
			// First, try to find .app path dynamically using mdfind
			let resolvedAppPath = terminal.macAppPath;
			if (process.platform === "darwin" && !resolvedAppPath) {
				resolvedAppPath = (await findAppPath(terminal.name)) || undefined;
			}

			const available = await isCommandAvailable(
				terminal.command,
				resolvedAppPath,
			);
			const actualCommand = available
				? await getActualCommand(terminal.command, resolvedAppPath, true)
				: terminal.command;

			// Extract icon if available (macOS only)
			let iconPath: string | undefined;
			if (available && resolvedAppPath && process.platform === "darwin") {
				try {
					iconPath = (await extractAppIcon(resolvedAppPath)) || undefined;
				} catch (error) {
					console.debug(`Failed to extract icon for ${terminal.name}:`, error);
				}
			}

			return {
				id: terminal.id,
				name: terminal.name,
				command: actualCommand,
				available,
				iconPath,
			};
		}),
	);

	return results;
}

/**
 * Get only available IDEs (cached for performance)
 */
let cachedAvailableIDEs: IDEInfo[] | null = null;

export async function getAvailableIDEs(): Promise<IDEInfo[]> {
	if (!cachedAvailableIDEs) {
		const allIDEs = await detectAvailableIDEs();
		cachedAvailableIDEs = allIDEs.filter((ide) => ide.available);
		console.log(
			`Detected ${cachedAvailableIDEs.length} available IDEs:`,
			cachedAvailableIDEs.map((ide) => ide.name).join(", "),
		);
	}
	return cachedAvailableIDEs;
}

/**
 * Get only available terminals (cached for performance)
 */
let cachedAvailableTerminals: TerminalInfo[] | null = null;

export async function getAvailableTerminals(): Promise<TerminalInfo[]> {
	if (!cachedAvailableTerminals) {
		const allTerminals = await detectAvailableTerminals();
		cachedAvailableTerminals = allTerminals.filter(
			(terminal) => terminal.available,
		);
		console.log(
			`Detected ${cachedAvailableTerminals.length} available terminals:`,
			cachedAvailableTerminals.map((terminal) => terminal.name).join(", "),
		);
	}
	return cachedAvailableTerminals;
}

/**
 * Refresh the IDE cache (useful for testing or manual refresh)
 */
export function refreshIDECache(): void {
	cachedAvailableIDEs = null;
}

/**
 * Refresh the terminal cache (useful for testing or manual refresh)
 */
export function refreshTerminalCache(): void {
	cachedAvailableTerminals = null;
}

/**
 * Open a directory in the specified IDE
 */
export async function openInIDE(
	path: string,
	ideCommand: string,
): Promise<void> {
	// If ideCommand contains spaces (like .app paths), quote it
	const command = ideCommand.includes(" ")
		? `"${ideCommand}" "${path}"`
		: `${ideCommand} "${path}"`;

	await execAsync(command);
}

/**
 * Open a directory in the specified terminal
 */
export async function openInTerminal(
	path: string,
	terminalCommand: string,
): Promise<void> {
	// Special handling for different terminals
	if (terminalCommand.includes("Ghostty.app") || terminalCommand === "ghostty") {
		// Ghostty - create a shell script that changes directory and execute it
		await execAsync(`open -n -a Ghostty --args -e sh -c "cd '${path}' && exec \\$SHELL"`);
	} else if (terminalCommand.includes("open -a Terminal")) {
		// macOS Terminal
		await execAsync(`open -a Terminal "${path}"`);
	} else if (terminalCommand.includes("iTerm.app") || terminalCommand === "iterm") {
		// iTerm2
		await execAsync(`open -a iTerm "${path}"`);
	} else if (terminalCommand.includes("Warp.app") || terminalCommand === "warp") {
		// Warp
		await execAsync(`open -a Warp "${path}"`);
	} else if (terminalCommand.includes("Alacritty.app") || terminalCommand === "alacritty") {
		// Alacritty
		await execAsync(`open -a Alacritty --args --working-directory "${path}"`);
	} else if (terminalCommand.includes("kitty.app") || terminalCommand === "kitty") {
		// Kitty
		await execAsync(`open -a kitty --args --directory="${path}"`);
	} else if (terminalCommand.includes("Hyper.app") || terminalCommand === "hyper") {
		// Hyper
		await execAsync(`open -a Hyper "${path}"`);
	} else {
		// Generic fallback
		const command = terminalCommand.includes(" ")
			? `"${terminalCommand}" "${path}"`
			: `${terminalCommand} "${path}"`;
		await execAsync(command);
	}
}
