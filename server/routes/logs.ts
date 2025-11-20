import { spawnSync } from "node:child_process";
import { Hono } from "hono";
import { DOCKER } from "../config/constants";

const app = new Hono();

/**
 * GET /api/logs/:containerId
 * Fetch Docker container logs
 */
app.get("/:containerId", (c) => {
	const containerId = c.req.param("containerId");
	const lines = c.req.query("lines") || DOCKER.DEFAULT_LOG_LINES.toString();
	const since = c.req.query("since"); // Optional: RFC3339 timestamp (e.g., "2025-01-09T12:34:56Z")

	if (!containerId) {
		return c.json({ error: "Container ID is required" }, 400);
	}

	// Validate containerId format (alphanumeric with allowed Docker characters)
	if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(containerId)) {
		return c.json({ error: "Invalid container ID format" }, 400);
	}

	// Validate lines parameter (must be a positive integer)
	const linesNum = Number.parseInt(lines, 10);
	if (Number.isNaN(linesNum) || linesNum <= 0 || linesNum > 10000) {
		return c.json({ error: "Invalid lines parameter (must be 1-10000)" }, 400);
	}

	// Validate since parameter format (RFC3339 timestamp)
	if (since && !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/.test(since)) {
		return c.json({ error: "Invalid since parameter format (must be RFC3339 timestamp)" }, 400);
	}

	try {
		// Build docker logs command arguments safely
		const args = ["logs"];

		// Use --since for follow mode (new logs only), otherwise use -n for last N lines
		if (since) {
			args.push("--since", since);
		} else {
			args.push("-n", linesNum.toString());
		}

		args.push("--timestamps", containerId);

		const result = spawnSync("docker", args, {
			encoding: "utf-8",
			maxBuffer: DOCKER.LOGS_MAX_BUFFER, // 10MB buffer for large logs
		});

		if (result.error) {
			throw result.error;
		}

		if (result.status !== 0) {
			throw new Error(result.stderr || "Docker logs command failed");
		}

		const output = result.stdout;

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
