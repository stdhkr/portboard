#!/usr/bin/env node

import { Command } from "commander";
import { dockerCommand } from "./commands/docker.js";
import { infoCommand } from "./commands/info.js";
import { killCommand } from "./commands/kill.js";
import { listCommand } from "./commands/list.js";
import { openCommand } from "./commands/open.js";
import { runServeCommand, serveCommand } from "./commands/serve.js";

const program = new Command();

program.name("portboard").description("Port management tool for developers").version("0.3.0");

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
