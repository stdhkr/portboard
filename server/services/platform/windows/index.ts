/**
 * Windows Platform Provider
 *
 * Provides Windows-specific implementations for port management,
 * process control, icon extraction, IDE/terminal detection, and browser integration.
 */

import type { IPlatformProvider } from "../types";
import { WindowsApplicationProvider } from "./application-provider";
import { WindowsBrowserProvider } from "./browser-provider";
import { WindowsIconProvider } from "./icon-provider";
import { WindowsPortProvider } from "./port-provider";
import { WindowsProcessProvider } from "./process-provider";

export class WindowsPlatformProvider implements IPlatformProvider {
	readonly portProvider = new WindowsPortProvider();
	readonly processProvider = new WindowsProcessProvider();
	readonly iconProvider = new WindowsIconProvider();
	readonly applicationProvider = new WindowsApplicationProvider();
	readonly browserProvider = new WindowsBrowserProvider();
}
