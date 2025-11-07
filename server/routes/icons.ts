import { Hono } from "hono";
import { getCachedIcon } from "../services/icon-service";

export const iconRoutes = new Hono();

// GET /api/icons/:filename - Serve cached icon
iconRoutes.get("/:filename", async (c) => {
	const filename = c.req.param("filename");

	// Validate filename (should be hash.png)
	if (!/^[a-f0-9]{32}\.png$/.test(filename)) {
		return c.json({ error: "Invalid filename" }, 400);
	}

	try {
		const iconData = await getCachedIcon(filename);

		if (!iconData) {
			return c.json({ error: "Icon not found" }, 404);
		}

		// Return the image with proper headers
		return c.body(iconData, 200, {
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=86400", // Cache for 24 hours
		});
	} catch (error) {
		console.error("Error serving icon:", error);
		return c.json({ error: "Failed to serve icon" }, 500);
	}
});
