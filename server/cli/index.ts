#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { dockerCommand } from "./commands/docker.js";
import { infoCommand } from "./commands/info.js";
import { killCommand } from "./commands/kill.js";
import { listCommand } from "./commands/list.js";
import { openCommand } from "./commands/open.js";
import { runServeCommand, serveCommand } from "./commands/serve.js";

// Read version from package.json (works both in dev and bundled dist)
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

const program = new Command();

program
	.name("portboard")
	.description("Port management tool for developers")
	.version(packageJson.version);

// Register commands
program.addCommand(listCommand);
program.addCommand(infoCommand);
program.addCommand(killCommand);
program.addCommand(dockerCommand);
program.addCommand(openCommand);
program.addCommand(serveCommand);

// Default action: show banner + serve
program.action(async () => {
	await runServeCommand();
});

program.parse();
