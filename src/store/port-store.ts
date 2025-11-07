import { atom } from "jotai";
import type { PortInfo, ProcessCategory } from "../types/port";

// Base atoms
export const selectedPortAtom = atom<PortInfo | null>(null);
export const isKillDialogOpenAtom = atom(false);
export const isRefreshingAtom = atom(false);

// Filter atoms
export const categoryFilterAtom = atom<ProcessCategory | "all">("user");
export const searchQueryAtom = atom<string>("");

// Sort atoms
export type SortField =
	| "port"
	| "processName"
	| "pid"
	| "protocol"
	| "address"
	| "connectionStatus"
	| "cpuUsage"
	| "memoryUsage"
	| "memoryRSS";
export type SortOrder = "asc" | "desc";

export const sortFieldAtom = atom<SortField>("port");
export const sortOrderAtom = atom<SortOrder>("asc");

// Derived write-only atoms for actions
export const openKillDialogAtom = atom(null, (_get, set, port: PortInfo) => {
	set(selectedPortAtom, port);
	set(isKillDialogOpenAtom, true);
});

export const closeKillDialogAtom = atom(null, (_get, set) => {
	set(isKillDialogOpenAtom, false);
	// Delay clearing selectedPort to allow the dialog closing animation to complete
	setTimeout(() => {
		set(selectedPortAtom, null);
	}, 200); // Match the dialog animation duration
});
