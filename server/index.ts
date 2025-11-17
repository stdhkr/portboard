import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { SERVER_CONFIG } from "./config/constants";
import { setServerPort } from "./config/server-state";
import { iconRoutes } from "./routes/icons";
import logsRoutes from "./routes/logs";
import { portRoutes } from "./routes/ports";

const app = new Hono();

// Enable CORS for development
app.use("/*", cors());

// API Routes
app.route("/api/ports", portRoutes);
app.route("/api/icons", iconRoutes);
app.route("/api/logs", logsRoutes);

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
				hostname: process.env.HOST || SERVER_CONFIG.DEFAULT_HOST, // localhost-only binding for security
			},
			(info) => {
				setServerPort(info.port);
				console.log(`🚀 Server running at http://${info.address}:${info.port}`);
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

const startPort = process.env.PORT
	? Number.parseInt(process.env.PORT, 10)
	: SERVER_CONFIG.DEFAULT_PORT;
startServer(startPort);
