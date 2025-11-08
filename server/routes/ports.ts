import { Hono } from "hono";
import { z } from "zod";
import {
	getAvailableIDEs,
	getAvailableTerminals,
	openContainerShell as openContainerShellService,
	openInIDE as openInIDEService,
	openInTerminal as openInTerminalService,
} from "../services/ide-detection-service";
import { getListeningPorts, killProcess } from "../services/port-service";

export const portRoutes = new Hono();

// GET /api/ports - List all listening ports
portRoutes.get("/", async (c) => {
	try {
		const ports = await getListeningPorts();
		return c.json({ data: ports, error: null });
	} catch (error) {
		console.error("Error fetching ports:", error);
		return c.json(
			{
				data: null,
				error: error instanceof Error ? error.message : "Failed to fetch ports",
			},
			500,
		);
	}
});

// POST /api/ports/kill - Kill a process by PID
const killSchema = z.object({
	pid: z.number().int().positive(),
});

portRoutes.post("/kill", async (c) => {
	try {
		const body = await c.req.json();
		const { pid } = killSchema.parse(body);

		await killProcess(pid);
		return c.json({ success: true, error: null });
	} catch (error) {
		console.error("Error killing process:", error);

		if (error instanceof z.ZodError) {
			return c.json(
				{
					success: false,
					error: "Invalid request: PID must be a positive integer",
				},
				400,
			);
		}

		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to kill process",
			},
			500,
		);
	}
});

// GET /api/ports/available-ides - Get list of available IDEs
portRoutes.get("/available-ides", async (c) => {
	try {
		const ides = await getAvailableIDEs();
		return c.json({ data: ides, error: null });
	} catch (error) {
		console.error("Error getting available IDEs:", error);
		return c.json(
			{
				data: null,
				error: error instanceof Error ? error.message : "Failed to get available IDEs",
			},
			500,
		);
	}
});

// GET /api/ports/available-terminals - Get list of available terminals
portRoutes.get("/available-terminals", async (c) => {
	try {
		const terminals = await getAvailableTerminals();
		return c.json({ data: terminals, error: null });
	} catch (error) {
		console.error("Error getting available terminals:", error);
		return c.json(
			{
				data: null,
				error: error instanceof Error ? error.message : "Failed to get available terminals",
			},
			500,
		);
	}
});

// POST /api/ports/open-in-ide - Open directory in IDE
const openInIdeSchema = z.object({
	path: z.string().min(1),
	ideCommand: z.string().min(1),
});

portRoutes.post("/open-in-ide", async (c) => {
	try {
		const body = await c.req.json();
		const { path, ideCommand } = openInIdeSchema.parse(body);

		await openInIDEService(path, ideCommand);
		return c.json({ success: true, error: null });
	} catch (error) {
		console.error("Error opening in IDE:", error);

		if (error instanceof z.ZodError) {
			return c.json(
				{
					success: false,
					error: "Invalid request: path and ideCommand are required",
				},
				400,
			);
		}

		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to open in IDE",
			},
			500,
		);
	}
});

// POST /api/ports/open-in-terminal - Open directory in terminal
const openInTerminalSchema = z.object({
	path: z.string().min(1),
	terminalCommand: z.string().min(1),
});

portRoutes.post("/open-in-terminal", async (c) => {
	try {
		const body = await c.req.json();
		const { path, terminalCommand } = openInTerminalSchema.parse(body);

		await openInTerminalService(path, terminalCommand);
		return c.json({ success: true, error: null });
	} catch (error) {
		console.error("Error opening in terminal:", error);

		if (error instanceof z.ZodError) {
			return c.json(
				{
					success: false,
					error: "Invalid request: path and terminalCommand are required",
				},
				400,
			);
		}

		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to open in terminal",
			},
			500,
		);
	}
});

// POST /api/ports/open-container-shell - Open shell in Docker container
const openContainerShellSchema = z.object({
	containerName: z.string().min(1),
	terminalCommand: z.string().min(1),
});

portRoutes.post("/open-container-shell", async (c) => {
	try {
		const body = await c.req.json();
		const { containerName, terminalCommand } = openContainerShellSchema.parse(body);

		await openContainerShellService(containerName, terminalCommand);
		return c.json({ success: true, error: null });
	} catch (error) {
		console.error("Error opening container shell:", error);

		if (error instanceof z.ZodError) {
			return c.json(
				{
					success: false,
					error: "Invalid request: containerName and terminalCommand are required",
				},
				400,
			);
		}

		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to open container shell",
			},
			500,
		);
	}
});
