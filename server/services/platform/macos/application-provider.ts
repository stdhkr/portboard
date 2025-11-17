/**
 * macOS Application Provider
 * Uses mdfind (Spotlight) for IDE/Terminal detection
 */

import {
	detectAvailableIDEs,
	detectAvailableTerminals,
	openContainerShell as openMacContainerShell,
	openInIDE as openMacIDE,
	openInTerminal as openMacTerminal,
} from "../../ide-detection-service";
import type { ApplicationInfo, IApplicationProvider } from "../types";

export class MacOSApplicationProvider implements IApplicationProvider {
	/**
	 * Detect installed IDEs using mdfind (Spotlight)
	 */
	async detectIDEs(): Promise<ApplicationInfo[]> {
		const ides = await detectAvailableIDEs();
		const ideApps = ides
			.filter((ide) => ide.available)
			.map((ide) => ({
				name: ide.name,
				path: ide.command,
				iconPath: ide.iconPath,
			}));

		// Add Finder as the first option (always available on macOS)
		return [
			{
				name: "Finder",
				path: "open",
				iconPath: undefined, // Finder uses system icon
			},
			...ideApps,
		];
	}

	/**
	 * Detect installed terminal applications using mdfind (Spotlight)
	 */
	async detectTerminals(): Promise<ApplicationInfo[]> {
		const terminals = await detectAvailableTerminals();
		return terminals
			.filter((terminal) => terminal.available)
			.map((terminal) => ({
				name: terminal.name,
				path: terminal.command,
				iconPath: terminal.iconPath,
			}));
	}

	/**
	 * Open directory in IDE
	 */
	async openInIDE(idePath: string, directoryPath: string): Promise<void> {
		await openMacIDE(idePath, directoryPath);
	}

	/**
	 * Open directory in terminal
	 */
	async openInTerminal(terminalPath: string, directoryPath: string): Promise<void> {
		await openMacTerminal(terminalPath, directoryPath);
	}

	/**
	 * Open container shell in terminal
	 * @param terminalPath - Path to terminal application
	 * @param containerId - Docker container ID or name
	 * @param _shell - Shell to use (currently ignored on macOS, auto-detected as bash/sh)
	 *
	 * Note: The shell parameter is currently ignored on macOS. The implementation
	 * auto-detects bash/sh by attempting both shells in order. This parameter is
	 * provided for future cross-platform compatibility where explicit shell selection
	 * may be needed on Windows/Linux.
	 */
	async openContainerShell(
		terminalPath: string,
		containerId: string,
		_shell: string,
	): Promise<void> {
		await openMacContainerShell(containerId, terminalPath);
	}

	/**
	 * macOS supports IDE/Terminal detection via mdfind
	 */
	isSupported(): boolean {
		return true;
	}
}
