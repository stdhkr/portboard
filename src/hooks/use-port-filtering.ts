import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { categoryFilterAtom, searchQueryAtom } from "@/store/port-store";

import type { PortInfo } from "@/types/port";

export function usePortFiltering(ports: PortInfo[]) {
	const categoryFilter = useAtomValue(categoryFilterAtom);

	const searchQuery = useAtomValue(searchQueryAtom);

	const filteredPorts = useMemo(() => {
		if (!ports) return [];
		let filtered = ports;

		// Apply category filter
		if (categoryFilter !== "all") {
			filtered = filtered.filter((port) => port.category === categoryFilter);
		}

		// Apply search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter((port) => {
				return (
					port.port.toString().includes(query) ||
					port.processName.toLowerCase().includes(query) ||
					port.appName?.toLowerCase().includes(query) ||
					port.commandPath?.toLowerCase().includes(query) ||
					port.address.toLowerCase().includes(query) ||
					port.dockerContainer?.name.toLowerCase().includes(query) ||
					port.dockerContainer?.image.toLowerCase().includes(query)
				);
			});
		}

		return filtered;
	}, [ports, categoryFilter, searchQuery]);

	return filteredPorts;
}
