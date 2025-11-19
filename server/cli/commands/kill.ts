import * as readline from "node:readline";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { getListeningPorts, killProcess } from "../../services/port-service.js";

export const killCommand = new Command("kill")
	.description("Kill a process by port number or PID")
	.argument("<number>", "Port number or PID to kill")
	.option("-f, --force", "Skip all safety checks")
	.option("-y, --yes", "Auto-confirm without prompt")
	.action(async (target: string, options) => {
		const targetNum = Number.parseInt(target, 10);

		if (Number.isNaN(targetNum)) {
			console.error(chalk.red("Error: Invalid port/PID number"));
			process.exit(1);
		}

		const ports = await getListeningPorts();

		// Search strategy: Port-first, then PID
		const portMatch = ports.find((p) => p.port === targetNum);
		const pidMatch = ports.find((p) => p.pid === targetNum);

		let portInfo = null;

		// Both found - show warning and ask user to clarify
		if (portMatch && pidMatch && portMatch.pid !== pidMatch.pid) {
			console.log(
				chalk.yellow(`⚠️  Ambiguous target: Found both port and PID with number ${targetNum}`),
			);
			console.log("");
			console.log(chalk.cyan("Port match:"));
			console.log(`  Port: ${portMatch.port}`);
			console.log(`  Process: ${portMatch.processName} (PID ${portMatch.pid})`);
			console.log("");
			console.log(chalk.magenta("PID match:"));
			console.log(`  Port: ${pidMatch.port}`);
			console.log(`  Process: ${pidMatch.processName} (PID ${pidMatch.pid})`);
			console.log("");
			console.log(
				chalk.gray(`By default, port takes priority. Continuing with port ${targetNum}...`),
			);
			console.log("");

			// Use port match by default
			portInfo = portMatch;
		} else {
			// Port-first strategy
			portInfo = portMatch || pidMatch;
		}

		if (!portInfo) {
			console.error(chalk.red(`Error: No process found for port/PID ${targetNum}`));
			process.exit(1);
		}

		// Protected port check
		if (portInfo.isSelfPort && !options.force) {
			console.error(chalk.red("Error: Cannot kill Portboard server itself!"));
			console.error(chalk.yellow("Use --force to override (will terminate this interface)"));
			process.exit(1);
		}

		// Show confirmation unless --yes or --force
		if (!options.yes && !options.force) {
			console.log(chalk.yellow("⚠️  About to kill:"));
			console.log(`  Port: ${chalk.cyan(portInfo.port.toString())}`);
			console.log(`  Process: ${chalk.white(portInfo.processName)} (PID ${portInfo.pid})`);
			console.log(`  Category: ${portInfo.category}`);

			if (portInfo.dockerContainer) {
				console.log(chalk.blue(`  Docker: ${portInfo.dockerContainer.name}`));
			}

			console.log("");
			console.log(chalk.gray("Use --yes to auto-confirm, or --force to skip all checks"));

			// Interactive prompt with readline
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});

			const answer = await new Promise<string>((resolve) => {
				rl.question(chalk.yellow("Continue? (y/N): "), resolve);
			});
			rl.close();

			if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
				console.log(chalk.gray("Cancelled."));
				process.exit(0);
			}
		}

		// Docker container handling
		if (portInfo.dockerContainer) {
			const container = portInfo.dockerContainer;
			console.log(chalk.blue(`\nℹ️  This is a Docker container: ${container.name}`));

			if (container.composeConfigFiles) {
				console.log(chalk.cyan("Using docker-compose down (recommended)"));
				const spinner = ora(`Stopping compose project...`).start();

				try {
					const { stopDockerCompose } = await import("../../services/docker-service.js");
					await stopDockerCompose(container.composeConfigFiles);
					spinner.succeed(chalk.green(`Successfully stopped compose project`));
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					spinner.fail(chalk.red(`Failed to stop compose project: ${errorMessage}`));
					process.exit(1);
				}
			} else {
				console.log(chalk.cyan("Using docker stop (recommended)"));
				const spinner = ora(`Stopping container ${container.name}...`).start();

				try {
					const { stopDockerContainer } = await import("../../services/docker-service.js");
					await stopDockerContainer(container.id);
					spinner.succeed(chalk.green(`Successfully stopped container ${container.name}`));
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					spinner.fail(chalk.red(`Failed to stop container: ${errorMessage}`));
					process.exit(1);
				}
			}
		} else {
			// Regular process kill
			const spinner = ora(`Killing process ${portInfo.pid}...`).start();

			try {
				await killProcess(portInfo.pid);
				spinner.succeed(
					chalk.green(`Successfully killed process ${portInfo.pid} on port ${portInfo.port}`),
				);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				spinner.fail(chalk.red(`Failed to kill process: ${errorMessage}`));
				process.exit(1);
			}
		}
	});
