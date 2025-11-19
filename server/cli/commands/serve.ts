import "dotenv/config";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Command } from "commander";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { SERVER_CONFIG } from "../../config/constants.js";
import { setServerPort } from "../../config/server-state.js";
import { iconRoutes } from "../../routes/icons.js";
import logsRoutes from "../../routes/logs.js";
import { portRoutes } from "../../routes/ports.js";
import { openInBrowser } from "../../services/browser-service.js";
import { showBanner } from "../utils/banner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const serveCommand = new Command("serve")
	.description("Start the web UI server")
	.option("-p, --port <port>", "Port to listen on", SERVER_CONFIG.DEFAULT_PORT.toString())
	.option("-h, --host <host>", "Host to bind to", SERVER_CONFIG.DEFAULT_HOST)
	.option("--no-open", "Do not open browser automatically")
	.action(async (options) => {
		const app = new Hono();

		// Enable CORS for development
		app.use("/*", cors());

		// API Routes
		app.route("/api/ports", portRoutes);
		app.route("/api/icons", iconRoutes);
		app.route("/api/logs", logsRoutes);

		// Serve static files (frontend build)
		const publicPath = join(__dirname, "..", "..", "..", "public");
		app.use("/*", serveStatic({ root: publicPath }));

		// Fallback to index.html for client-side routing
		app.get("*", serveStatic({ path: join(publicPath, "index.html") }));

		// Health check
		app.get("/health", (c) => {
			return c.json({ status: "ok" });
		});

		// Start server with auto-increment port logic
		async function startServer(port: number, attempt = 0): Promise<void> {
			if (attempt >= SERVER_CONFIG.MAX_PORT_ATTEMPTS) {
				console.error(`Failed to start server after ${SERVER_CONFIG.MAX_PORT_ATTEMPTS} attempts`);
				process.exit(1);
			}

			try {
				serve(
					{
						fetch: app.fetch,
						port,
						hostname: options.host,
					},
					async (info) => {
						setServerPort(info.port);
						const url = `http://${info.address}:${info.port}`;
						console.log(`🚀 Portboard is running at ${url}`);
						console.log("\n📊 Open your browser to view the dashboard\n");

						// Open browser automatically (unless --no-open)
						if (options.open) {
							try {
								await openInBrowser(url);
							} catch {
								console.log(`Could not open browser automatically. Please visit: ${url}`);
							}
						}
					},
				);
			} catch (error) {
				if (error instanceof Error && "code" in error && error.code === "EADDRINUSE") {
					console.log(`Port ${port} is in use, trying ${port + 1}...`);
					await startServer(port + 1, attempt + 1);
				} else {
					console.error("Failed to start server:", error);
					process.exit(1);
				}
			}
		}

		const startPort = Number.parseInt(options.port, 10);
		await startServer(startPort);
	});

// Helper function for default invocation (without command)
export async function runServeCommand() {
	showBanner();
	await serveCommand.parseAsync([], { from: "user" });
}
