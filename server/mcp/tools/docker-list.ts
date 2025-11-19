import { getListeningPorts } from "../../services/port-service.js";

export const dockerListTool = {
	schema: {
		name: "portboard_docker_list",
		description: "List all ports associated with Docker containers",
		inputSchema: {
			type: "object",
			properties: {},
		},
	},
	handler: async () => {
		const ports = await getListeningPorts();
		const dockerPorts = ports.filter((p) => p.dockerContainer);

		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify(dockerPorts, null, 2),
				},
			],
		};
	},
};
