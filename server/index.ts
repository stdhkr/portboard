import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { iconRoutes } from "./routes/icons";
import { portRoutes } from "./routes/ports";

const app = new Hono();

// Enable CORS for development
app.use("/*", cors());

// API Routes
app.route("/api/ports", portRoutes);
app.route("/api/icons", iconRoutes);

// Health check
app.get("/health", (c) => {
	return c.json({ status: "ok" });
});

// Start server with auto-increment port logic
const DEFAULT_PORT = 3033;
const MAX_PORT_ATTEMPTS = 10;

async function startServer(port: number, attempt = 0): Promise<void> {
	if (attempt >= MAX_PORT_ATTEMPTS) {
		console.error(`Failed to start server after ${MAX_PORT_ATTEMPTS} attempts`);
		process.exit(1);
	}

	try {
		serve(
			{
				fetch: app.fetch,
				port,
				hostname: "127.0.0.1", // localhost-only binding for security
			},
			(info) => {
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

startServer(DEFAULT_PORT);
