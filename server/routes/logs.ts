import { execSync } from "node:child_process";
import { Hono } from "hono";

const app = new Hono();

/**
 * GET /api/logs/:containerId
 * Fetch Docker container logs
 */
app.get("/:containerId", (c) => {
	const containerId = c.req.param("containerId");
	const lines = c.req.query("lines") || "20";

	if (!containerId) {
		return c.json({ error: "Container ID is required" }, 400);
	}

	try {
		// Execute docker logs command with timestamps
		const command = `docker logs -n ${lines} --timestamps ${containerId}`;
		const output = execSync(command, {
			encoding: "utf-8",
			maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large logs
		});

		// Parse logs into structured format
		const logLines = output
			.trim()
			.split("\n")
			.map((line) => {
				// Docker log format: 2025-01-09T12:34:56.789012345Z log message
				const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+(.*)$/);
				if (timestampMatch) {
					return {
						timestamp: timestampMatch[1],
						message: timestampMatch[2],
						level: detectLogLevel(timestampMatch[2]),
					};
				}
				// Fallback for logs without timestamps
				return {
					timestamp: null,
					message: line,
					level: detectLogLevel(line),
				};
			});

		return c.json({
			containerId,
			logs: logLines,
			count: logLines.length,
		});
	} catch (error) {
		console.error("Error fetching Docker logs:", error);

		// Handle specific Docker errors
		if (error instanceof Error) {
			const errorMessage = error.message;
			if (errorMessage.includes("No such container")) {
				return c.json({ error: "Container not found" }, 404);
			}
			if (errorMessage.includes("permission denied")) {
				return c.json({ error: "Permission denied. Docker socket access required." }, 403);
			}
		}

		return c.json({ error: "Failed to fetch container logs" }, 500);
	}
});

/**
 * Detect log level from message content
 */
function detectLogLevel(message: string): "error" | "warn" | "info" {
	const lowerMessage = message.toLowerCase();
	if (
		lowerMessage.includes("error") ||
		lowerMessage.includes("fatal") ||
		lowerMessage.includes("exception")
	) {
		return "error";
	}
	if (
		lowerMessage.includes("warn") ||
		lowerMessage.includes("warning") ||
		lowerMessage.includes("deprecated")
	) {
		return "warn";
	}
	return "info";
}

export default app;
