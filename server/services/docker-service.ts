import { spawn } from "node:child_process";
import { validateDirectoryPath } from "../utils/path-validation";
import type { DockerContainerInfo } from "./category-service";

/**
 * Safely execute a command and return stdout
 */
async function execCommand(
	command: string,
	args: string[],
	options?: { cwd?: string },
): Promise<string> {
	return new Promise((resolve, reject) => {
		const proc = spawn(command, args, {
			...options,
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";

		proc.stdout.on("data", (data) => {
			stdout += data.toString();
		});

		proc.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		proc.on("error", (error) => {
			reject(error);
		});

		proc.on("close", (code) => {
			if (code !== 0) {
				reject(new Error(stderr || `Command failed with exit code ${code}`));
			} else {
				resolve(stdout);
			}
		});
	});
}

/**
 * Get Docker container port mappings
 * Returns a Map of host port -> container info
 */
export async function getDockerPortMappings(): Promise<Map<number, DockerContainerInfo>> {
	const portMap = new Map<number, DockerContainerInfo>();

	try {
		// Check if Docker CLI is available
		await execCommand("which", ["docker"]);

		// Get container info with port mappings
		const stdout = await execCommand("docker", [
			"ps",
			"--format",
			"{{.ID}}\\t{{.Names}}\\t{{.Image}}\\t{{.Ports}}",
		]);

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
				const inspectOutput = await execCommand("docker", ["inspect", ...containerIds]);
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

			// Extract host ports from various Docker port binding formats:
			// - 0.0.0.0:5433->5432/tcp (all interfaces)
			// - 127.0.0.1:3000->3000/tcp (localhost only)
			// - [::]:8080->8080/tcp (IPv6 all interfaces)
			// - *:9000->9000/tcp (wildcard)
			// - 192.168.1.100:4000->4000/tcp (specific IP)

			// Match: [host_ip]:host_port->container_port
			// Supports IPv4, IPv6 (with brackets), and wildcard (*)
			const portMatches = [...ports.matchAll(/(?:\[?[\da-fA-F:.]+\]?|\*):(\d+)->(\d+)/g)];

			for (const match of portMatches) {
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

/**
 * Stop a Docker container
 */
export async function stopDockerContainer(containerIdOrName: string): Promise<void> {
	// Validate container name/ID format
	if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(containerIdOrName)) {
		throw new Error(`Invalid container name or ID: ${containerIdOrName}`);
	}

	try {
		await execCommand("docker", ["stop", containerIdOrName]);
	} catch (error) {
		throw new Error(
			`Failed to stop container ${containerIdOrName}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Stop a docker-compose project
 */
export async function stopDockerCompose(projectDirectory: string): Promise<void> {
	// Validate directory path using utility function
	const validationResult = await validateDirectoryPath(projectDirectory);
	if (!validationResult.valid) {
		throw new Error(validationResult.error);
	}

	try {
		await execCommand("docker-compose", ["down"], { cwd: projectDirectory });
	} catch (error) {
		throw new Error(
			`Failed to stop compose project: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Get Docker container logs
 */
export async function getDockerLogs(
	containerIdOrName: string,
	lines?: number,
	since?: string,
): Promise<string> {
	// Validate container name/ID format
	if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(containerIdOrName)) {
		throw new Error(`Invalid container name or ID: ${containerIdOrName}`);
	}

	// Validate since parameter format (RFC3339 timestamp)
	if (since && !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/.test(since)) {
		throw new Error(`Invalid since parameter format: ${since}`);
	}

	try {
		const args = ["logs", containerIdOrName];

		if (lines) {
			args.push("--tail", lines.toString());
		}

		if (since) {
			args.push("--since", since);
		}

		const stdout = await execCommand("docker", args);
		return stdout;
	} catch (error) {
		throw new Error(
			`Failed to fetch logs for container ${containerIdOrName}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
