import { getListeningPorts, killProcess } from "../../services/port-service.js";

export const killProcessTool = {
	schema: {
		name: "portboard_kill_process",
		description:
			"Kill a process by PID with safety checks (ownership verification, protected ports)",
		inputSchema: {
			type: "object",
			properties: {
				pid: {
					type: "number",
					description: "Process ID to kill",
				},
				force: {
					type: "boolean",
					description: "Force kill without safety checks (use with caution)",
				},
			},
			required: ["pid"],
		},
	},
	handler: async (args: { pid: number; force?: boolean }) => {
		// Protected ports check
		const ports = await getListeningPorts();
		const port = ports.find((p) => p.pid === args.pid);

		if (port?.isSelfPort && !args.force) {
			throw new Error("Cannot kill Portboard server itself! Use force=true to override.");
		}

		await killProcess(args.pid);

		return {
			content: [
				{
					type: "text" as const,
					text: `Successfully killed process ${args.pid}`,
				},
			],
		};
	},
};
