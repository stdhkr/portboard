import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { openInBrowser } from "../../services/browser-service.js";

export const openCommand = new Command("open")
	.description("Open a port URL in the default browser")
	.argument("<port>", "Port number to open")
	.action(async (portArg: string) => {
		const portNum = Number.parseInt(portArg, 10);

		if (Number.isNaN(portNum)) {
			console.error(chalk.red("Error: Invalid port number"));
			process.exit(1);
		}

		const url = `http://localhost:${portNum}`;
		const spinner = ora(`Opening ${url} in browser...`).start();

		try {
			await openInBrowser(url);
			spinner.succeed(chalk.green(`Opened ${url} in browser`));
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			spinner.fail(chalk.red(`Failed to open browser: ${errorMessage}`));
			process.exit(1);
		}
	});
