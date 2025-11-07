import { Hono } from "hono";
import { z } from "zod";
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
				error:
					error instanceof Error ? error.message : "Failed to fetch ports",
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
