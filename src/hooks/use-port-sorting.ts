import { useAtom } from "jotai";
import { useMemo } from "react";
import { type SortField, sortFieldAtom, sortOrderAtom } from "@/store/port-store";
import type { PortInfo } from "@/types/port";

export function usePortSorting(ports: PortInfo[]) {
	const [sortField, setSortField] = useAtom(sortFieldAtom);
	const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);

	// Handle sort column click
	const handleSort = (field: SortField) => {
		if (sortField === field) {
			// Toggle order if clicking the same field
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			// Set new field with ascending order
			setSortField(field);
			setSortOrder("asc");
		}
	};

	// Apply sorting
	const sortedPorts = useMemo(() => {
		return [...ports].sort((a, b) => {
			let aValue: string | number;
			let bValue: string | number;

			switch (sortField) {
				case "port":
					aValue = a.port;
					bValue = b.port;
					break;
				case "processName":
					aValue = (a.appName || a.processName).toLowerCase();
					bValue = (b.appName || b.processName).toLowerCase();
					break;
				case "pid":
					aValue = a.pid;
					bValue = b.pid;
					break;
				case "protocol":
					aValue = a.protocol.toLowerCase();
					bValue = b.protocol.toLowerCase();
					break;
				case "address":
					aValue = a.address.toLowerCase();
					bValue = b.address.toLowerCase();
					break;
				case "connectionStatus":
					// Sort: active first, then idle
					aValue = a.connectionStatus === "active" ? 0 : 1;
					bValue = b.connectionStatus === "active" ? 0 : 1;
					// If same status, sort by connection count
					if (aValue === bValue) {
						return sortOrder === "asc"
							? a.connectionCount - b.connectionCount
							: b.connectionCount - a.connectionCount;
					}
					break;
				default:
					return 0;
			}

			if (typeof aValue === "number" && typeof bValue === "number") {
				return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
			}

			// String comparison
			if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
			if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
			return 0;
		});
	}, [ports, sortField, sortOrder]);

	return {
		sortedPorts,
		sortField,
		sortOrder,
		handleSort,
	};
}
