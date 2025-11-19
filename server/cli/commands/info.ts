import chalk from "chalk";
import { Command } from "commander";
import { getListeningPorts } from "../../services/port-service.js";
import { formatCPU, formatMemory, formatUptime } from "../utils/formatters.js";

export const infoCommand = new Command("info")
	.description("Show detailed information about a port")
	.argument("<port>", "Port number to query")
	.option("--json", "Output as JSON")
	.action(async (portArg: string, options) => {
		const portNum = Number.parseInt(portArg, 10);

		if (Number.isNaN(portNum)) {
			console.error(chalk.red("Error: Invalid port number"));
			process.exit(1);
		}

		const ports = await getListeningPorts();
		const portInfo = ports.find((p) => p.port === portNum);

		if (!portInfo) {
			console.error(chalk.red(`Error: Port ${portNum} is not listening`));
			process.exit(1);
		}

		if (options.json) {
			console.log(JSON.stringify(portInfo, null, 2));
		} else {
			console.log("");
			console.log(chalk.cyan.bold(`Port ${portInfo.port}`));
			console.log(chalk.gray("━".repeat(50)));
			console.log("");

			// Basic Info
			console.log(chalk.bold("Basic Info"));
			console.log(`  Process: ${chalk.white(portInfo.processName)}`);
			console.log(`  PID: ${portInfo.pid}`);
			console.log(`  Protocol: ${portInfo.protocol}`);
			console.log(`  Address: ${portInfo.address}`);
			if (portInfo.user) {
				console.log(`  User: ${portInfo.user}`);
			}
			console.log("");

			// Connection Status
			console.log(chalk.bold("Connection Status"));
			console.log(
				`  Status: ${portInfo.connectionStatus === "active" ? chalk.green("active") : chalk.gray("idle")}`,
			);
			console.log(`  Connections: ${portInfo.connectionCount}`);
			console.log("");

			// Resource Usage
			console.log(chalk.bold("Resource Usage"));
			console.log(`  CPU: ${formatCPU(portInfo.cpuUsage)}`);
			console.log(`  Memory: ${formatMemory(portInfo.memoryUsage)}`);
			if (portInfo.processStartTime) {
				console.log(`  Uptime: ${formatUptime(portInfo.processStartTime)}`);
			}
			console.log("");

			// Working Directory
			if (portInfo.cwd && portInfo.cwd !== "/") {
				console.log(chalk.bold("Working Directory"));
				console.log(`  ${portInfo.cwd}`);
				console.log("");
			}

			// Command Path
			if (portInfo.commandPath) {
				console.log(chalk.bold("Command Path"));
				console.log(`  ${portInfo.commandPath}`);
				console.log("");
			}

			// Docker Info
			if (portInfo.dockerContainer) {
				console.log(chalk.bold("Docker Container"));
				console.log(`  Name: ${portInfo.dockerContainer.name}`);
				console.log(`  ID: ${portInfo.dockerContainer.id}`);
				console.log(`  Image: ${portInfo.dockerContainer.image}`);
				if (portInfo.dockerContainer.containerPort) {
					console.log(`  Port Mapping: ${portInfo.port}:${portInfo.dockerContainer.containerPort}`);
				}
				console.log("");
			}

			// Category
			console.log(chalk.bold("Category"));
			console.log(`  ${portInfo.category}`);
			console.log("");
		}
	});
