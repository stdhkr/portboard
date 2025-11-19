import chalk from "chalk";
import figlet from "figlet";
import packageJson from "../../../package.json" with { type: "json" };

export function showBanner() {
	const banner = figlet.textSync("PORTBOARD", {
		font: "ANSI Shadow",
		horizontalLayout: "default",
		verticalLayout: "default",
	});

	console.log("");
	console.log(chalk.hex("#FFD93D").bold(banner));
	console.log("");
	console.log(`  Port Management Dashboard v${packageJson.version}`);
	console.log("");
}
