import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { DockerContainerInfo } from "./category-service";

const execAsync = promisify(exec);

/**
 * Get Docker container port mappings
 * Returns a Map of host port -> container info
 */
export async function getDockerPortMappings(): Promise<Map<number, DockerContainerInfo>> {
	const portMap = new Map<number, DockerContainerInfo>();

	try {
		// Check if Docker CLI is available
		await execAsync("which docker");

		// Get container info with port mappings
		const { stdout } = await execAsync(
			'docker ps --format "{{.ID}}\\t{{.Names}}\\t{{.Image}}\\t{{.Ports}}"',
		);

		const containerIds: string[] = [];
		const containerData = new Map<string, { name: string; image: string; ports: string }>();

		for (const line of stdout.trim().split("\n").filter(Boolean)) {
			const [id, name, image, ports] = line.split("\t");
			containerIds.push(id);
			containerData.set(id, { name, image, ports });
		}

		// Get compose metadata via docker inspect
		const containerLabels = new Map<string, Record<string, string>>();
		if (containerIds.length > 0) {
			try {
				const { stdout: inspectOutput } = await execAsync(
					`docker inspect ${containerIds.join(" ")}`,
				);
				const inspectData = JSON.parse(inspectOutput);

				for (const container of inspectData) {
					// Use short ID (first 12 chars) to match with docker ps output
					const shortId = container.Id.substring(0, 12);
					containerLabels.set(shortId, container.Config?.Labels || {});
				}
			} catch (error) {
				console.debug("Failed to inspect containers for labels:", error);
			}
		}

		// Build port mappings with compose metadata
		for (const [id, data] of containerData.entries()) {
			const { name, image, ports } = data;
			const labels = containerLabels.get(id) || {};
			const composeConfigFiles = labels["com.docker.compose.project.config_files"];

			// Extract host ports from format: "0.0.0.0:5433->5432/tcp"
			const portMatches = [...ports.matchAll(/0\.0\.0\.0:(\d+)->(\d+)/g)];

			for (const match of portMatches) {
				const hostPort = Number.parseInt(match[1], 10);
				const containerPort = Number.parseInt(match[2], 10);

				portMap.set(hostPort, {
					id,
					name,
					image,
					containerPort,
					composeConfigFiles,
				});
			}

			// Also handle *:port->port format
			const wildcardMatches = [...ports.matchAll(/\*:(\d+)->(\d+)/g)];
			for (const match of wildcardMatches) {
				const hostPort = Number.parseInt(match[1], 10);
				const containerPort = Number.parseInt(match[2], 10);

				if (!portMap.has(hostPort)) {
					portMap.set(hostPort, {
						id,
						name,
						image,
						containerPort,
						composeConfigFiles,
					});
				}
			}
		}
	} catch {
		// Docker not available or not running - return empty map
		console.debug("Docker not available, skipping container detection");
	}

	return portMap;
}
