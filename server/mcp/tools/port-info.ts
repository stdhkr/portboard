import { getListeningPorts } from "../../services/port-service.js";

export const portInfoTool = {
	schema: {
		name: "portboard_get_port_info",
		description: "Get detailed information about a specific port",
		inputSchema: {
			type: "object",
			properties: {
				port: {
					type: "number",
					description: "Port number to query",
				},
			},
			required: ["port"],
		},
	},
	handler: async (args: { port: number }) => {
		const ports = await getListeningPorts();
		const portInfo = ports.find((p) => p.port === args.port);

		if (!portInfo) {
			throw new Error(`Port ${args.port} is not listening`);
		}

		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify(portInfo, null, 2),
				},
			],
		};
	},
};
