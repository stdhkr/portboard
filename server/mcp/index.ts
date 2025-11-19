#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMCPServer } from "./server.js";

async function main() {
	const server = await createMCPServer();
	const transport = new StdioServerTransport();

	await server.connect(transport);

	// Log to stderr so it doesn't interfere with stdio protocol
	console.error("Portboard MCP Server running on stdio");
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
