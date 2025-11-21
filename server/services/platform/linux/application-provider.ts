/**
 * Linux Application Provider
 * Detects IDEs and terminals using `which` command
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { ApplicationInfo, IApplicationProvider } from "../types";

const execAsync = promisify(exec);

export class LinuxApplicationProvider implements IApplicationProvider {
	private readonly IDE_COMMANDS = [
		"code",
		"cursor",
		"idea",
		"pycharm",
		"webstorm",
		"phpstorm",
		"goland",
		"clion",
		"rubymine",
		"sublime_text",
		"atom",
		"emacs",
		"vim",
		"nvim",
		"nano",
		"gedit",
		"kate",
		"geany",
	];

	private readonly TERMINAL_COMMANDS = [
		"gnome-terminal",
		"konsole",
		"xterm",
		"tilix",
		"terminator",
		"alacritty",
		"kitty",
		"xfce4-terminal",
		"mate-terminal",
	];

	async detectIDEs(): Promise<ApplicationInfo[]> {
		const results: ApplicationInfo[] = [];

		// Check using `which` command
		for (const cmd of this.IDE_COMMANDS) {
			try {
				const { stdout } = await execAsync(`which ${cmd} 2>/dev/null || true`);
				const command = stdout.trim();
				if (command) {
					results.push({
						name: this.formatName(cmd),
						command,
						available: true,
						iconPath: undefined,
					});
				}
			} catch {
				// Ignore errors
			}
		}

		return results;
	}

	async detectTerminals(): Promise<ApplicationInfo[]> {
		const results: ApplicationInfo[] = [];

		// Check using `which` command
		for (const cmd of this.TERMINAL_COMMANDS) {
			try {
				const { stdout } = await execAsync(`which ${cmd} 2>/dev/null || true`);
				const command = stdout.trim();
				if (command) {
					results.push({
						name: this.formatName(cmd),
						command,
						available: true,
						iconPath: undefined,
					});
				}
			} catch {
				// Ignore errors
			}
		}

		return results;
	}

	async openInIDE(idePath: string, directoryPath: string): Promise<void> {
		try {
			await execAsync(`"${idePath}" "${directoryPath}" &`);
		} catch (error) {
			throw new Error(
				`Failed to open IDE: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async openInTerminal(terminalPath: string, directoryPath: string): Promise<void> {
		try {
			const terminalName = terminalPath.split("/").pop() || "";

			// Handle different terminal emulators
			if (terminalName.includes("gnome-terminal")) {
				await execAsync(`gnome-terminal --working-directory="${directoryPath}" &`);
			} else if (terminalName.includes("konsole")) {
				await execAsync(`konsole --workdir "${directoryPath}" &`);
			} else if (terminalName.includes("xfce4-terminal")) {
				await execAsync(`xfce4-terminal --working-directory="${directoryPath}" &`);
			} else {
				// Generic approach
				await execAsync(`cd "${directoryPath}" && "${terminalPath}" &`);
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
			const terminalName = terminalPath.split("/").pop() || "";

			// Handle different terminal emulators
			if (terminalName.includes("gnome-terminal")) {
				await execAsync(`gnome-terminal -- docker exec -it ${containerId} ${shell} &`);
			} else if (terminalName.includes("konsole")) {
				await execAsync(`konsole -e docker exec -it ${containerId} ${shell} &`);
			} else if (terminalName.includes("xfce4-terminal")) {
				await execAsync(`xfce4-terminal --command="docker exec -it ${containerId} ${shell}" &`);
			} else {
				// Generic approach
				await execAsync(`"${terminalPath}" -e docker exec -it ${containerId} ${shell} &`);
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

	private formatName(cmd: string): string {
		// Convert command name to display name
		const nameMap: Record<string, string> = {
			code: "Visual Studio Code",
			cursor: "Cursor",
			idea: "IntelliJ IDEA",
			pycharm: "PyCharm",
			webstorm: "WebStorm",
			phpstorm: "PhpStorm",
			goland: "GoLand",
			clion: "CLion",
			rubymine: "RubyMine",
			sublime_text: "Sublime Text",
			atom: "Atom",
			emacs: "Emacs",
			vim: "Vim",
			nvim: "Neovim",
			nano: "Nano",
			gedit: "gedit",
			kate: "Kate",
			geany: "Geany",
			"gnome-terminal": "GNOME Terminal",
			konsole: "Konsole",
			xterm: "XTerm",
			tilix: "Tilix",
			terminator: "Terminator",
			alacritty: "Alacritty",
			kitty: "Kitty",
			"xfce4-terminal": "Xfce Terminal",
			"mate-terminal": "MATE Terminal",
		};

		return nameMap[cmd] || cmd;
	}
}
