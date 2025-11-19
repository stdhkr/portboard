import chalk from "chalk";
import Table from "cli-table3";
import { Command } from "commander";
import ora from "ora";
import {
	getDockerLogs,
	stopDockerCompose,
	stopDockerContainer,
} from "../../services/docker-service.js";
import { getListeningPorts } from "../../services/port-service.js";
import { formatCPU, formatMemory } from "../utils/formatters.js";

export const dockerCommand = new Command("docker").description("Docker container operations");

// docker ls
dockerCommand
	.command("ls")
	.description("List Docker container ports")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		const ports = await getListeningPorts();
		const dockerPorts = ports.filter((p) => p.dockerContainer);

		if (options.json) {
			console.log(JSON.stringify(dockerPorts, null, 2));
		} else {
			if (dockerPorts.length === 0) {
				console.log(chalk.gray("No Docker containers found"));
				return;
			}

			const table = new Table({
				head: [
					chalk.bold("Port"),
					chalk.bold("Container"),
					chalk.bold("Image"),
					chalk.bold("Status"),
					chalk.bold("CPU"),
					chalk.bold("Memory"),
				],
				style: {
					head: ["cyan"],
					border: ["gray"],
				},
			});

			for (const port of dockerPorts) {
				if (!port.dockerContainer) continue;

				table.push([
					port.port.toString(),
					port.dockerContainer.name,
					port.dockerContainer.image,
					port.connectionStatus === "active" ? chalk.green("active") : chalk.gray("idle"),
					formatCPU(port.cpuUsage),
					formatMemory(port.memoryUsage),
				]);
			}

			console.log(table.toString());
			console.log("");
			console.log(
				chalk.gray(
					`Found ${dockerPorts.length} Docker container${dockerPorts.length !== 1 ? "s" : ""}`,
				),
			);
		}
	});

// docker stop
dockerCommand
	.command("stop")
	.description("Stop a Docker container")
	.argument("<container>", "Container ID or name")
	.option("--compose", "Use docker-compose down")
	.action(async (container: string, options) => {
		const spinner = ora(`Stopping container ${container}...`).start();

		try {
			if (options.compose) {
				const ports = await getListeningPorts();
				const port = ports.find((p) => p.dockerContainer?.id === container);
				const composeFiles = port?.dockerContainer?.composeConfigFiles;

				if (!composeFiles) {
					spinner.fail(chalk.red("No compose files found for this container"));
					process.exit(1);
				}

				await stopDockerCompose(composeFiles);
				spinner.succeed(chalk.green("Successfully stopped compose project"));
			} else {
				await stopDockerContainer(container);
				spinner.succeed(chalk.green(`Successfully stopped container ${container}`));
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			spinner.fail(chalk.red(`Failed to stop container: ${errorMessage}`));
			process.exit(1);
		}
	});

// docker logs
dockerCommand
	.command("logs")
	.description("Fetch logs from a Docker container")
	.argument("<container>", "Container ID or name")
	.option("-n, --lines <number>", "Number of lines to fetch", "20")
	.option("-f, --follow", "Follow log output")
	.action(async (container: string, options) => {
		const lines = Number.parseInt(options.lines, 10);

		if (Number.isNaN(lines)) {
			console.error(chalk.red("Error: Invalid number of lines"));
			process.exit(1);
		}

		try {
			if (options.follow) {
				console.log(chalk.cyan(`Following logs for ${container}...`));
				console.log(chalk.gray("Press Ctrl+C to stop"));
				console.log("");

				// Initial fetch
				const logs = await getDockerLogs(container, lines);
				console.log(logs);

				// Follow mode: fetch new logs every 2 seconds
				setInterval(async () => {
					const since = new Date().toISOString();
					const newLogs = await getDockerLogs(container, undefined, since);
					if (newLogs.trim()) {
						console.log(newLogs);
					}
				}, 2000);
			} else {
				const logs = await getDockerLogs(container, lines);
				console.log(logs);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(chalk.red(`Failed to fetch logs: ${errorMessage}`));
			process.exit(1);
		}
	});
