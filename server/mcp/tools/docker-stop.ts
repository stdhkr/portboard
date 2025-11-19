import { stopDockerCompose, stopDockerContainer } from "../../services/docker-service.js";
import { getListeningPorts } from "../../services/port-service.js";

export const dockerStopTool = {
	schema: {
		name: "portboard_docker_stop",
		description: "Stop a Docker container or compose project",
		inputSchema: {
			type: "object",
			properties: {
				containerId: {
					type: "string",
					description: "Container ID or name",
				},
				useCompose: {
					type: "boolean",
					description: "Use docker-compose down instead of docker stop",
				},
			},
			required: ["containerId"],
		},
	},
	handler: async (args: { containerId: string; useCompose?: boolean }) => {
		if (args.useCompose) {
			const ports = await getListeningPorts();
			const port = ports.find((p) => p.dockerContainer?.id === args.containerId);
			const composeFiles = port?.dockerContainer?.composeConfigFiles;

			if (!composeFiles) {
				throw new Error("No compose files found for this container");
			}

			await stopDockerCompose(composeFiles);
			return {
				content: [
					{
						type: "text" as const,
						text: "Successfully stopped compose project",
					},
				],
			};
		}

		await stopDockerContainer(args.containerId);
		return {
			content: [
				{
					type: "text" as const,
					text: `Successfully stopped container ${args.containerId}`,
				},
			],
		};
	},
};
