import figlet from "figlet";
import { pastel } from "gradient-string";

export function showBanner() {
	const banner = figlet.textSync("PORTBOARD", {
		font: "ANSI Shadow",
		horizontalLayout: "default",
		verticalLayout: "default",
	});

	console.log("");
	console.log(pastel.multiline(banner));
	console.log("");
	console.log("  Port Management Dashboard v0.2.0");
	console.log("");
}
