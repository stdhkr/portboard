import { spawnSync } from "node:child_process";
import { Hono } from "hono";
import { z } from "zod";
import { NETWORK } from "../config/constants";
import { getNetworkURL, openInBrowser as openInBrowserService } from "../services/browser-service";
import { getPlatformProviderSingleton } from "../services/platform";
import { getListeningPorts, killProcess } from "../services/port-service";
import { validateDirectoryPath } from "../utils/path-validation";

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
		const platformProvider = getPlatformProviderSingleton();
		const ides = await platformProvider.applicationProvider.detectIDEs();
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
		const platformProvider = getPlatformProviderSingleton();
		const terminals = await platformProvider.applicationProvider.detectTerminals();
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

		const platformProvider = getPlatformProviderSingleton();
		await platformProvider.applicationProvider.openInIDE(ideCommand, path);
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

		const platformProvider = getPlatformProviderSingleton();
		await platformProvider.applicationProvider.openInTerminal(terminalCommand, path);
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

		const platformProvider = getPlatformProviderSingleton();
		await platformProvider.applicationProvider.openContainerShell(
			terminalCommand,
			containerName,
			"sh", // shell parameter (auto-detected by implementation)
		);
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

// POST /api/ports/stop-container - Stop a Docker container
const stopContainerSchema = z.object({
	containerName: z
		.string()
		.min(1)
		.regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/, "Invalid container name"),
});

portRoutes.post("/stop-container", async (c) => {
	try {
		const body = await c.req.json();
		const { containerName } = stopContainerSchema.parse(body);

		const result = spawnSync("docker", ["stop", containerName], { encoding: "utf-8" });

		if (result.error || result.status !== 0) {
			throw new Error(result.stderr || result.error?.message || "Failed to stop container");
		}

		return c.json({ success: true, error: null });
	} catch (error) {
		console.error("Error stopping Docker container:", error);

		if (error instanceof z.ZodError) {
			return c.json(
				{
					success: false,
					error: "Invalid request: Container name is required and must be valid",
				},
				400,
			);
		}

		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to stop container",
			},
			500,
		);
	}
});

// POST /api/ports/stop-compose - Stop a Docker Compose project
const stopComposeSchema = z.object({
	projectDirectory: z
		.string()
		.min(1)
		.regex(
			/^[\w./-]+$/,
			"Invalid directory path: only alphanumeric, dots, slashes, hyphens, and underscores allowed",
		),
});

portRoutes.post("/stop-compose", async (c) => {
	try {
		const body = await c.req.json();
		const { projectDirectory } = stopComposeSchema.parse(body);

		// Validate directory path using utility function
		const validationResult = await validateDirectoryPath(projectDirectory);
		if (!validationResult.valid) {
			return c.json(
				{
					success: false,
					error: validationResult.error,
				},
				validationResult.errorCode || 400,
			);
		}

		const result = spawnSync("docker-compose", ["down"], {
			cwd: projectDirectory,
			encoding: "utf-8",
		});

		if (result.error || result.status !== 0) {
			throw new Error(result.stderr || result.error?.message || "Failed to stop compose project");
		}

		return c.json({ success: true, error: null });
	} catch (error) {
		console.error("Error stopping Docker Compose project:", error);

		if (error instanceof z.ZodError) {
			return c.json(
				{
					success: false,
					error: "Invalid request: Project directory is required and must be valid",
				},
				400,
			);
		}

		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to stop compose project",
			},
			500,
		);
	}
});

// POST /api/ports/open-in-browser - Open port URL in default browser
const openInBrowserSchema = z.object({
	port: z.number().int().positive(),
});

portRoutes.post("/open-in-browser", async (c) => {
	try {
		const body = await c.req.json();
		const { port } = openInBrowserSchema.parse(body);

		const protocol = port === NETWORK.HTTPS_PORT ? "https" : "http";
		const url = `${protocol}://localhost:${port}`;

		await openInBrowserService(url);
		return c.json({ success: true, error: null });
	} catch (error) {
		console.error("Error opening in browser:", error);

		if (error instanceof z.ZodError) {
			return c.json(
				{
					success: false,
					error: "Invalid request: Port must be a positive integer",
				},
				400,
			);
		}

		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to open in browser",
			},
			500,
		);
	}
});

// GET /api/ports/network-url/:port - Get network URL for a port
portRoutes.get("/network-url/:port", async (c) => {
	try {
		const portParam = c.req.param("port");
		const port = Number.parseInt(portParam, 10);

		if (Number.isNaN(port) || port <= 0) {
			return c.json(
				{
					data: null,
					error: "Invalid port number",
				},
				400,
			);
		}

		const networkURL = getNetworkURL(port);
		if (!networkURL) {
			return c.json(
				{
					data: null,
					error: "Could not determine network IP address",
				},
				404,
			);
		}

		return c.json({ data: { url: networkURL }, error: null });
	} catch (error) {
		console.error("Error getting network URL:", error);
		return c.json(
			{
				data: null,
				error: error instanceof Error ? error.message : "Failed to get network URL",
			},
			500,
		);
	}
});
