/**
 * Linux Platform Provider
 *
 * Provides Linux-specific implementations for port management,
 * process control, icon extraction, IDE/terminal detection, and browser integration.
 */

import type { IPlatformProvider } from "../types";
import { LinuxApplicationProvider } from "./application-provider";
import { LinuxBrowserProvider } from "./browser-provider";
import { LinuxIconProvider } from "./icon-provider";
import { LinuxPortProvider } from "./port-provider";
import { LinuxProcessProvider } from "./process-provider";

export class LinuxPlatformProvider implements IPlatformProvider {
	readonly portProvider = new LinuxPortProvider();
	readonly processProvider = new LinuxProcessProvider();
	readonly iconProvider = new LinuxIconProvider();
	readonly applicationProvider = new LinuxApplicationProvider();
	readonly browserProvider = new LinuxBrowserProvider();
}
