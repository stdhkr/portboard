import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { dockerListTool } from "./tools/docker-list.js";
import { dockerLogsTool } from "./tools/docker-logs.js";
import { dockerStopTool } from "./tools/docker-stop.js";
import { killProcessTool } from "./tools/kill-process.js";
// Import tools
import { listPortsTool } from "./tools/list-ports.js";
import { portInfoTool } from "./tools/port-info.js";

export async function createMCPServer() {
	const server = new Server(
		{
			name: "portboard",
			version: "0.3.2",
		},
		{
			capabilities: {
				tools: {},
			},
		},
	);

	// List all available tools
	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return {
			tools: [
				listPortsTool.schema,
				killProcessTool.schema,
				portInfoTool.schema,
				dockerListTool.schema,
				dockerStopTool.schema,
				dockerLogsTool.schema,
			],
		};
	});

	// Handle tool execution
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;

		try {
			switch (name) {
				case "portboard_list_ports":
					return await listPortsTool.handler(args || {});
				case "portboard_kill_process":
					return await killProcessTool.handler(args as { pid: number; force?: boolean });
				case "portboard_get_port_info":
					return await portInfoTool.handler(args as { port: number });
				case "portboard_docker_list":
					return await dockerListTool.handler();
				case "portboard_docker_stop":
					return await dockerStopTool.handler(
						args as { containerId: string; useCompose?: boolean },
					);
				case "portboard_docker_logs":
					return await dockerLogsTool.handler(
						args as { containerId: string; lines?: number; since?: string },
					);
				default:
					throw new Error(`Unknown tool: ${name}`);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				content: [
					{
						type: "text" as const,
						text: `Error: ${errorMessage}`,
					},
				],
				isError: true,
			};
		}
	});

	return server;
}
