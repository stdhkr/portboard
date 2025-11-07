import { create } from "zustand";
import type { PortInfo } from "../types/port";

interface PortStore {
	selectedPort: PortInfo | null;
	setSelectedPort: (port: PortInfo | null) => void;
	isKillDialogOpen: boolean;
	openKillDialog: (port: PortInfo) => void;
	closeKillDialog: () => void;
	isRefreshing: boolean;
	setIsRefreshing: (refreshing: boolean) => void;
}

export const usePortStore = create<PortStore>((set) => ({
	selectedPort: null,
	setSelectedPort: (port) => set({ selectedPort: port }),
	isKillDialogOpen: false,
	openKillDialog: (port) => set({ selectedPort: port, isKillDialogOpen: true }),
	closeKillDialog: () => set({ isKillDialogOpen: false, selectedPort: null }),
	isRefreshing: false,
	setIsRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
}));
