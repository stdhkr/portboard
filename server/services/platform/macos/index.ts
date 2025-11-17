/**
 * macOS Platform Provider
 * Aggregates all macOS-specific service providers
 */

import type { IPlatformProvider } from "../types";
import { MacOSApplicationProvider } from "./application-provider";
import { MacOSBrowserProvider } from "./browser-provider";
import { MacOSIconProvider } from "./icon-provider";
import { MacOSPortProvider } from "./port-provider";
import { MacOSProcessProvider } from "./process-provider";

export class MacOSPlatformProvider implements IPlatformProvider {
	readonly portProvider = new MacOSPortProvider();
	readonly processProvider = new MacOSProcessProvider();
	readonly iconProvider = new MacOSIconProvider();
	readonly applicationProvider = new MacOSApplicationProvider();
	readonly browserProvider = new MacOSBrowserProvider();
}
