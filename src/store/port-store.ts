import { atom } from "jotai";
import { TIMING } from "@/config/constants";
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
	}, TIMING.DIALOG_CLOSE_DELAY); // Match the dialog animation duration
});

// Batch kill atoms
export const selectedPortsAtom = atom<Set<number>>(new Set<number>());
export const isBatchKillDialogOpenAtom = atom(false);

// Derived atoms for batch operations
export const togglePortSelectionAtom = atom(null, (get, set, port: number) => {
	const selectedPorts = new Set(get(selectedPortsAtom));
	if (selectedPorts.has(port)) {
		selectedPorts.delete(port);
	} else {
		selectedPorts.add(port);
	}
	set(selectedPortsAtom, selectedPorts);
});

export const selectAllPortsAtom = atom(null, (_get, set, ports: number[]) => {
	set(selectedPortsAtom, new Set(ports));
});

export const deselectAllPortsAtom = atom(null, (_get, set) => {
	set(selectedPortsAtom, new Set());
});

export const openBatchKillDialogAtom = atom(null, (_get, set) => {
	set(isBatchKillDialogOpenAtom, true);
});

export const closeBatchKillDialogAtom = atom(null, (_get, set) => {
	set(isBatchKillDialogOpenAtom, false);
});
