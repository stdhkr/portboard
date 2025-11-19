import chalk from "chalk";

/**
 * Print success message
 */
export function success(message: string) {
	console.log(chalk.green("✓"), message);
}

/**
 * Print error message
 */
export function error(message: string) {
	console.error(chalk.red("✗"), message);
}

/**
 * Print warning message
 */
export function warning(message: string) {
	console.log(chalk.yellow("⚠"), message);
}

/**
 * Print info message
 */
export function info(message: string) {
	console.log(chalk.blue("ℹ"), message);
}
