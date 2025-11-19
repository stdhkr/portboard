import { getDockerLogs } from "../../services/docker-service.js";

export const dockerLogsTool = {
	schema: {
		name: "portboard_docker_logs",
		description: "Fetch logs from a Docker container",
		inputSchema: {
			type: "object",
			properties: {
				containerId: {
					type: "string",
					description: "Container ID or name",
				},
				lines: {
					type: "number",
					description: "Number of lines to fetch (default: 20)",
				},
				since: {
					type: "string",
					description: "Fetch logs since timestamp (ISO 8601 format)",
				},
			},
			required: ["containerId"],
		},
	},
	handler: async (args: { containerId: string; lines?: number; since?: string }) => {
		const logs = await getDockerLogs(args.containerId, args.lines, args.since);

		return {
			content: [
				{
					type: "text" as const,
					text: logs,
				},
			],
		};
	},
};
