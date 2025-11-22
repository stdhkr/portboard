/**
 * Windows Application Provider
 * Detects installed IDEs and terminals, opens applications
 */

import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import type { ApplicationInfo, IApplicationProvider } from "../types";

const execAsync = promisify(exec);

// IDE definitions with common installation paths
const IDE_DEFINITIONS = [
	{
		name: "Visual Studio Code",
		commands: ["code"],
		paths: [
			"%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe",
			"%ProgramFiles%\\Microsoft VS Code\\Code.exe",
		],
	},
	{
		name: "Cursor",
		commands: ["cursor"],
		paths: ["%LOCALAPPDATA%\\Programs\\Cursor\\Cursor.exe"],
	},
	{
		name: "Visual Studio 2022",
		commands: [],
		paths: [
			"%ProgramFiles%\\Microsoft Visual Studio\\2022\\Community\\Common7\\IDE\\devenv.exe",
			"%ProgramFiles%\\Microsoft Visual Studio\\2022\\Professional\\Common7\\IDE\\devenv.exe",
			"%ProgramFiles%\\Microsoft Visual Studio\\2022\\Enterprise\\Common7\\IDE\\devenv.exe",
		],
	},
	{
		name: "IntelliJ IDEA",
		commands: ["idea64", "idea"],
		paths: ["%ProgramFiles%\\JetBrains\\IntelliJ IDEA *\\bin\\idea64.exe"],
	},
	{
		name: "PyCharm",
		commands: ["pycharm64", "pycharm"],
		paths: ["%ProgramFiles%\\JetBrains\\PyCharm *\\bin\\pycharm64.exe"],
	},
	{
		name: "WebStorm",
		commands: ["webstorm64", "webstorm"],
		paths: ["%ProgramFiles%\\JetBrains\\WebStorm *\\bin\\webstorm64.exe"],
	},
	{
		name: "GoLand",
		commands: ["goland64", "goland"],
		paths: ["%ProgramFiles%\\JetBrains\\GoLand *\\bin\\goland64.exe"],
	},
	{
		name: "CLion",
		commands: ["clion64", "clion"],
		paths: ["%ProgramFiles%\\JetBrains\\CLion *\\bin\\clion64.exe"],
	},
	{
		name: "Rider",
		commands: ["rider64", "rider"],
		paths: ["%ProgramFiles%\\JetBrains\\Rider *\\bin\\rider64.exe"],
	},
	{
		name: "PhpStorm",
		commands: ["phpstorm64", "phpstorm"],
		paths: ["%ProgramFiles%\\JetBrains\\PhpStorm *\\bin\\phpstorm64.exe"],
	},
	{
		name: "RubyMine",
		commands: ["rubymine64", "rubymine"],
		paths: ["%ProgramFiles%\\JetBrains\\RubyMine *\\bin\\rubymine64.exe"],
	},
	{
		name: "Sublime Text",
		commands: ["subl"],
		paths: [
			"%ProgramFiles%\\Sublime Text\\sublime_text.exe",
			"%ProgramFiles%\\Sublime Text 3\\sublime_text.exe",
		],
	},
	{
		name: "Notepad++",
		commands: ["notepad++"],
		paths: [
			"%ProgramFiles%\\Notepad++\\notepad++.exe",
			"%ProgramFiles(x86)%\\Notepad++\\notepad++.exe",
		],
	},
	{
		name: "Atom",
		commands: ["atom"],
		paths: ["%LOCALAPPDATA%\\atom\\atom.exe"],
	},
	{
		name: "Vim",
		commands: ["vim", "gvim"],
		paths: ["%ProgramFiles%\\Vim\\vim*\\gvim.exe"],
	},
	{
		name: "Neovim",
		commands: ["nvim"],
		paths: ["%ProgramFiles%\\Neovim\\bin\\nvim.exe"],
	},
];

// Terminal definitions
const TERMINAL_DEFINITIONS = [
	{
		name: "Windows Terminal",
		commands: ["wt"],
		paths: [],
		openCommand: (cwd: string) => `wt -d "${cwd}"`,
	},
	{
		name: "PowerShell 7",
		commands: ["pwsh"],
		paths: ["%ProgramFiles%\\PowerShell\\7\\pwsh.exe"],
		openCommand: (cwd: string) => `pwsh -NoExit -Command "cd '${cwd}'"`,
	},
	{
		name: "Windows PowerShell",
		commands: ["powershell"],
		paths: ["%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"],
		openCommand: (cwd: string) => `powershell -NoExit -Command "cd '${cwd}'"`,
	},
	{
		name: "Command Prompt",
		commands: ["cmd"],
		paths: ["%SystemRoot%\\System32\\cmd.exe"],
		openCommand: (cwd: string) => `cmd /K "cd /D ${cwd}"`,
	},
	{
		name: "Git Bash",
		commands: ["bash"],
		paths: ["%ProgramFiles%\\Git\\bin\\bash.exe", "%ProgramFiles(x86)%\\Git\\bin\\bash.exe"],
		openCommand: (cwd: string) => `bash --login -c "cd '${cwd}'; exec bash"`,
	},
	{
		name: "Cmder",
		commands: [],
		paths: ["%CMDER_ROOT%\\Cmder.exe"],
		openCommand: (cwd: string) => `Cmder.exe /START "${cwd}"`,
	},
	{
		name: "Hyper",
		commands: ["hyper"],
		paths: ["%LOCALAPPDATA%\\Programs\\Hyper\\Hyper.exe"],
		openCommand: (_cwd: string) => "hyper",
	},
	{
		name: "Alacritty",
		commands: ["alacritty"],
		paths: ["%APPDATA%\\alacritty\\alacritty.exe"],
		openCommand: (cwd: string) => `alacritty --working-directory "${cwd}"`,
	},
	{
		name: "Tabby",
		commands: ["tabby"],
		paths: ["%LOCALAPPDATA%\\Programs\\Tabby\\Tabby.exe"],
		openCommand: (_cwd: string) => "tabby",
	},
];

export class WindowsApplicationProvider implements IApplicationProvider {
	async detectIDEs(): Promise<ApplicationInfo[]> {
		const detectedIDEs: ApplicationInfo[] = [];

		for (const ide of IDE_DEFINITIONS) {
			const path = await this.findApplication(ide.commands, ide.paths);
			if (path) {
				detectedIDEs.push({
					name: ide.name,
					command: path,
					available: true,
					iconPath: undefined,
				});
			}
		}

		// Add Explorer as "Finder" for cross-platform compatibility with frontend
		// (frontend checks for ide.name === "Finder" to show file manager section)
		return [
			{
				id: "explorer",
				name: "Finder", // Use "Finder" for frontend compatibility
				command: "explorer",
				available: true,
				iconPath: undefined,
			},
			...detectedIDEs,
		];
	}

	async detectTerminals(): Promise<ApplicationInfo[]> {
		const detectedTerminals: ApplicationInfo[] = [];

		for (const terminal of TERMINAL_DEFINITIONS) {
			const path = await this.findApplication(terminal.commands, terminal.paths);
			if (path) {
				detectedTerminals.push({
					name: terminal.name,
					command: path,
					available: true,
					iconPath: undefined,
				});
			}
		}

		return detectedTerminals;
	}

	async openInIDE(idePath: string, directoryPath: string): Promise<void> {
		try {
			// Special handling for Explorer (file manager)
			// Check for both "explorer" and "open" (macOS command that frontend might send)
			if (idePath === "explorer" || idePath === "open") {
				await execAsync(`explorer "${directoryPath}"`);
				return;
			}

			// Most IDEs accept directory path as argument
			await execAsync(`start "" "${idePath}" "${directoryPath}"`);
		} catch (error) {
			throw new Error(
				`Failed to open IDE: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async openInTerminal(terminalPath: string, directoryPath: string): Promise<void> {
		try {
			const terminalName = terminalPath.split("\\").pop()?.toLowerCase() || "";

			// Find the terminal definition to get the correct open command
			const terminalDef = TERMINAL_DEFINITIONS.find(
				(t) =>
					t.paths.some((p) => this.expandEnvVars(p).toLowerCase().includes(terminalName)) ||
					t.commands.some((c) => terminalName.includes(c)),
			);

			if (terminalDef?.openCommand) {
				const command = terminalDef.openCommand(directoryPath);
				await execAsync(`start "" ${command}`);
			} else {
				// Generic fallback
				await execAsync(`start "" "${terminalPath}" "${directoryPath}"`);
			}
		} catch (error) {
			throw new Error(
				`Failed to open terminal: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async openContainerShell(
		terminalPath: string,
		containerId: string,
		shell: string,
	): Promise<void> {
		try {
			const terminalName = terminalPath.split("\\").pop()?.toLowerCase() || "";

			if (terminalName.includes("wt")) {
				// Windows Terminal
				await execAsync(`wt docker exec -it ${containerId} ${shell}`);
			} else if (terminalName.includes("pwsh") || terminalName.includes("powershell")) {
				// PowerShell
				await execAsync(
					`start "" "${terminalPath}" -NoExit -Command "docker exec -it ${containerId} ${shell}"`,
				);
			} else if (terminalName.includes("cmd")) {
				// Command Prompt
				await execAsync(`start "" cmd /K "docker exec -it ${containerId} ${shell}"`);
			} else {
				// Generic fallback
				await execAsync(`start "" "${terminalPath}" docker exec -it ${containerId} ${shell}`);
			}
		} catch (error) {
			throw new Error(
				`Failed to open container shell: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	isSupported(): boolean {
		return true;
	}

	/**
	 * Find an application by checking commands in PATH and common installation paths
	 */
	private async findApplication(commands: string[], paths: string[]): Promise<string | null> {
		// First, try to find via command in PATH
		for (const cmd of commands) {
			try {
				const { stdout } = await execAsync(`where ${cmd} 2>nul`);
				const foundPath = stdout.trim().split("\n")[0];
				if (foundPath && existsSync(foundPath)) {
					return foundPath;
				}
			} catch {
				// Command not found in PATH
			}
		}

		// Then check common installation paths
		for (const pathTemplate of paths) {
			const expandedPath = this.expandEnvVars(pathTemplate);

			// Handle wildcard paths
			if (expandedPath.includes("*")) {
				const foundPath = await this.findWildcardPath(expandedPath);
				if (foundPath) {
					return foundPath;
				}
			} else if (existsSync(expandedPath)) {
				return expandedPath;
			}
		}

		return null;
	}

	/**
	 * Expand Windows environment variables in a path
	 */
	private expandEnvVars(path: string): string {
		return path.replace(/%([^%]+)%/g, (_, envVar) => {
			return process.env[envVar] || "";
		});
	}

	/**
	 * Find a file matching a wildcard path pattern
	 */
	private async findWildcardPath(pathPattern: string): Promise<string | null> {
		try {
			// Convert wildcard to PowerShell pattern
			const psPath = pathPattern.replace(/\*/g, "*");
			const { stdout } = await execAsync(
				`powershell -Command "Get-Item '${psPath}' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName"`,
				{ timeout: 5000 },
			);
			const foundPath = stdout.trim();
			if (foundPath && existsSync(foundPath)) {
				return foundPath;
			}
		} catch {
			// Pattern not found
		}
		return null;
	}
}
