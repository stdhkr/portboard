import chalk from "chalk";
import Table from "cli-table3";
import { Command } from "commander";
import type { PortInfo } from "../../../src/types/port.js";
import { getListeningPorts } from "../../services/port-service.js";
import { formatCPU, formatMemory } from "../utils/formatters.js";

export const listCommand = new Command("list")
	.description("List all listening ports")
	.option("-c, --category <category>", "Filter by category")
	.option("-s, --search <query>", "Search query")
	.option("--sort <field>", "Sort by field")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		const ports = await getListeningPorts();

		// Filtering
		let filtered = ports;
		if (options.category) {
			filtered = filtered.filter((p) => p.category === options.category);
		}
		if (options.search) {
			const search = options.search.toLowerCase();
			filtered = filtered.filter(
				(p) =>
					p.port.toString().includes(search) ||
					p.processName.toLowerCase().includes(search) ||
					p.commandPath?.toLowerCase().includes(search),
			);
		}

		// Sorting
		if (options.sort) {
			filtered.sort((a, b) => {
				const aVal = a[options.sort as keyof PortInfo];
				const bVal = b[options.sort as keyof PortInfo];
				if (aVal === undefined) return 1;
				if (bVal === undefined) return -1;
				if (aVal < bVal) return -1;
				if (aVal > bVal) return 1;
				return 0;
			});
		}

		// Output
		if (options.json) {
			console.log(JSON.stringify(filtered, null, 2));
		} else {
			const table = new Table({
				head: [
					chalk.bold("Port"),
					chalk.bold("Process"),
					chalk.bold("PID"),
					chalk.bold("Status"),
					chalk.bold("CPU"),
					chalk.bold("Memory"),
				],
				style: {
					head: ["cyan"],
					border: ["gray"],
				},
			});

			for (const port of filtered) {
				table.push([
					port.port.toString(),
					port.processName,
					port.pid.toString(),
					port.connectionStatus === "active" ? chalk.green("active") : chalk.gray("idle"),
					formatCPU(port.cpuUsage),
					formatMemory(port.memoryUsage),
				]);
			}

			console.log(table.toString());
			console.log("");
			console.log(chalk.gray(`Found ${filtered.length} port${filtered.length !== 1 ? "s" : ""}`));
		}
	});
