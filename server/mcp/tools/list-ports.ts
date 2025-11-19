import type { PortInfo } from "../../../src/types/port.js";
import { getListeningPorts } from "../../services/port-service.js";

export const listPortsTool = {
	schema: {
		name: "portboard_list_ports",
		description:
			"List all listening ports with detailed metadata including process info, Docker containers, and resource usage",
		inputSchema: {
			type: "object",
			properties: {
				category: {
					type: "string",
					enum: ["system", "development", "database", "web-server", "applications", "user"],
					description: "Filter by process category",
				},
				search: {
					type: "string",
					description: "Search in port number, process name, or command path",
				},
				sortBy: {
					type: "string",
					enum: ["port", "processName", "pid", "connectionStatus", "cpuUsage", "memoryUsage"],
					description: "Sort results by field",
				},
			},
		},
	},
	handler: async (args: { category?: string; search?: string; sortBy?: string }) => {
		const ports = await getListeningPorts();

		// Filtering
		let filtered = ports;
		if (args.category) {
			filtered = filtered.filter((p) => p.category === args.category);
		}
		if (args.search) {
			const search = args.search.toLowerCase();
			filtered = filtered.filter(
				(p) =>
					p.port.toString().includes(search) ||
					p.processName.toLowerCase().includes(search) ||
					p.commandPath?.toLowerCase().includes(search),
			);
		}

		// Sorting
		if (args.sortBy) {
			filtered.sort((a, b) => {
				const aVal = a[args.sortBy as keyof PortInfo];
				const bVal = b[args.sortBy as keyof PortInfo];
				if (aVal === undefined) return 1;
				if (bVal === undefined) return -1;
				if (aVal < bVal) return -1;
				if (aVal > bVal) return 1;
				return 0;
			});
		}

		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify(filtered, null, 2),
				},
			],
		};
	},
};
