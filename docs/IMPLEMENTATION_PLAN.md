# Portboard MCP + CLI 実装計画

## 概要

Portboard に以下の2つの新機能を追加します:

1. **MCP Server**: Claude Desktop などの AI ツールから Portboard の機能を利用可能にする
2. **CLI 拡張**: スタンドアロン CLI コマンドと TUI (Terminal UI) モードを追加

## 目標

- **単一パッケージ**: `portbd` に MCP と CLI を両方含める
- **共通ロジック**: MCP と CLI で既存サービス層を共有（重複コードなし）
- **後方互換性**: 既存の `portboard` コマンド動作を保持
- **セキュリティ**: Web UI と同じセキュリティモデルを適用
- **UX 重視**: かっこいい起動バナー、リアルタイム TUI、カラフルな出力

---

## Phase 1: 基盤整備

### 1.1 依存関係追加

**MCP 関連:**
- `@modelcontextprotocol/sdk` - 公式 MCP SDK

**CLI 関連:**
- `commander` - CLI フレームワーク
- `chalk` - カラー出力
- `cli-table3` - テーブル表示
- `ora` - スピナー表示
- `ink` - React ベース Terminal UI
- `ink-gradient` - グラデーションテキスト
- `ink-big-text` - 大きな ASCII アート文字
- `figlet` - ASCII アート生成
- `gradient-string` - グラデーション文字列

**TypeScript 型定義:**
- `@types/figlet`
- `@types/gradient-string`

```bash
npm install --save @modelcontextprotocol/sdk commander chalk cli-table3 ora ink ink-gradient ink-big-text figlet gradient-string
npm install --save-dev @types/figlet @types/gradient-string
```

### 1.2 ディレクトリ構造作成

```
server/
├── mcp/
│   ├── server.ts              # MCP Server 本体
│   ├── tools/
│   │   ├── list-ports.ts      # list_ports ツール
│   │   ├── kill-process.ts    # kill_process ツール
│   │   ├── port-info.ts       # get_port_info ツール
│   │   ├── docker-list.ts     # docker_list ツール
│   │   ├── docker-stop.ts     # docker_stop ツール
│   │   └── docker-logs.ts     # docker_logs ツール
│   └── index.ts               # MCP エントリーポイント (Shebang 付き)
└── cli/
    ├── commands/
    │   ├── list.ts            # list コマンド
    │   ├── info.ts            # info コマンド
    │   ├── kill.ts            # kill コマンド
    │   ├── docker.ts          # docker サブコマンド
    │   ├── open.ts            # open コマンド
    │   ├── serve.ts           # serve コマンド（既存 cli.ts から移行）
    │   └── tui.ts             # tui コマンド
    ├── tui/
    │   ├── App.tsx            # Ink TUI メインコンポーネント
    │   ├── PortTable.tsx      # ポート一覧表示
    │   └── StatusBar.tsx      # ステータスバー
    ├── utils/
    │   ├── formatters.ts      # テーブル/JSON フォーマッター
    │   ├── output.ts          # カラー出力ユーティリティ
    │   └── banner.ts          # 起動バナー生成
    └── index.ts               # CLI エントリーポイント (既存 cli.ts を置き換え)
```

### 1.3 package.json 更新

**bin セクション:**
```json
{
  "bin": {
    "portboard": "./dist/cli.js",
    "portboard-mcp": "./dist/mcp.js"
  }
}
```

**build スクリプト拡張:**
```json
{
  "scripts": {
    "build:server": "esbuild server/cli/index.ts --bundle --platform=node --format=esm --outfile=dist/cli.js --packages=external && esbuild server/mcp/index.ts --bundle --platform=node --format=esm --outfile=dist/mcp.js --packages=external"
  }
}
```

---

## Phase 2: MCP Server 実装

### 2.1 MCP Server 本体 (`server/mcp/server.ts`)

**責務:**
- stdio transport のセットアップ
- ツール登録システム
- リクエスト/レスポンスのハンドリング
- エラーハンドリング

**実装内容:**
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// ツールをインポート
import { listPortsTool } from "./tools/list-ports.js";
import { killProcessTool } from "./tools/kill-process.js";
// ... 他のツール

export async function createMCPServer() {
  const server = new Server({
    name: "portboard",
    version: "1.0.0",
  }, {
    capabilities: {
      tools: {},
    },
  });

  // ツール一覧を返す
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        listPortsTool.schema,
        killProcessTool.schema,
        // ... 他のツール
      ],
    };
  });

  // ツール実行
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "portboard_list_ports":
        return await listPortsTool.handler(args);
      case "portboard_kill_process":
        return await killProcessTool.handler(args);
      // ... 他のツール
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}
```

### 2.2 MCP Tools 実装 (`server/mcp/tools/`)

各ツールは以下の構造を持つ:
```typescript
interface MCPTool {
  schema: {
    name: string;
    description: string;
    inputSchema: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
  handler: (args: any) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
}
```

#### 2.2.1 `list-ports.ts`

```typescript
import { getListeningPorts } from "../../services/port-service.js";

export const listPortsTool = {
  schema: {
    name: "portboard_list_ports",
    description: "List all listening ports with detailed metadata including process info, Docker containers, and resource usage",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["system", "development", "database", "web-server", "applications", "user"],
          description: "Filter by process category"
        },
        search: {
          type: "string",
          description: "Search in port number, process name, or command path"
        },
        sortBy: {
          type: "string",
          enum: ["port", "processName", "pid", "connectionStatus", "cpuUsage", "memoryUsage"],
          description: "Sort results by field"
        }
      }
    }
  },
  handler: async (args: { category?: string; search?: string; sortBy?: string }) => {
    const ports = await getListeningPorts();

    // フィルタリング
    let filtered = ports;
    if (args.category) {
      filtered = filtered.filter(p => p.category === args.category);
    }
    if (args.search) {
      const search = args.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.port.toString().includes(search) ||
        p.processName.toLowerCase().includes(search) ||
        p.commandPath?.toLowerCase().includes(search)
      );
    }

    // ソート
    if (args.sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[args.sortBy as keyof typeof a];
        const bVal = b[args.sortBy as keyof typeof b];
        if (aVal === undefined) return 1;
        if (bVal === undefined) return -1;
        return aVal > bVal ? 1 : -1;
      });
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(filtered, null, 2)
      }]
    };
  }
};
```

#### 2.2.2 `kill-process.ts`

```typescript
import { killProcess } from "../../services/port-service.js";
import { getProtectedPorts } from "../../config/server-state.js";

export const killProcessTool = {
  schema: {
    name: "portboard_kill_process",
    description: "Kill a process by PID with safety checks (ownership verification, protected ports)",
    inputSchema: {
      type: "object",
      properties: {
        pid: {
          type: "number",
          description: "Process ID to kill"
        },
        force: {
          type: "boolean",
          description: "Force kill without safety checks (use with caution)"
        }
      },
      required: ["pid"]
    }
  },
  handler: async (args: { pid: number; force?: boolean }) => {
    // Protected ports チェック
    const ports = await getListeningPorts();
    const port = ports.find(p => p.pid === args.pid);

    if (port?.isSelfPort && !args.force) {
      throw new Error("Cannot kill Portboard server itself! Use force=true to override.");
    }

    await killProcess(args.pid);

    return {
      content: [{
        type: "text",
        text: `Successfully killed process ${args.pid}`
      }]
    };
  }
};
```

#### 2.2.3 `port-info.ts`

```typescript
export const portInfoTool = {
  schema: {
    name: "portboard_get_port_info",
    description: "Get detailed information about a specific port",
    inputSchema: {
      type: "object",
      properties: {
        port: {
          type: "number",
          description: "Port number to query"
        }
      },
      required: ["port"]
    }
  },
  handler: async (args: { port: number }) => {
    const ports = await getListeningPorts();
    const portInfo = ports.find(p => p.port === args.port);

    if (!portInfo) {
      throw new Error(`Port ${args.port} is not listening`);
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(portInfo, null, 2)
      }]
    };
  }
};
```

#### 2.2.4 `docker-list.ts`

```typescript
export const dockerListTool = {
  schema: {
    name: "portboard_docker_list",
    description: "List all ports associated with Docker containers",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  handler: async () => {
    const ports = await getListeningPorts();
    const dockerPorts = ports.filter(p => p.dockerContainer);

    return {
      content: [{
        type: "text",
        text: JSON.stringify(dockerPorts, null, 2)
      }]
    };
  }
};
```

#### 2.2.5 `docker-stop.ts`

```typescript
import { stopDockerContainer, stopDockerCompose } from "../../services/docker-service.js";

export const dockerStopTool = {
  schema: {
    name: "portboard_docker_stop",
    description: "Stop a Docker container or compose project",
    inputSchema: {
      type: "object",
      properties: {
        containerId: {
          type: "string",
          description: "Container ID or name"
        },
        useCompose: {
          type: "boolean",
          description: "Use docker-compose down instead of docker stop"
        }
      },
      required: ["containerId"]
    }
  },
  handler: async (args: { containerId: string; useCompose?: boolean }) => {
    if (args.useCompose) {
      const ports = await getListeningPorts();
      const port = ports.find(p => p.dockerContainer?.id === args.containerId);
      const composeFiles = port?.dockerContainer?.composeConfigFiles;

      if (!composeFiles) {
        throw new Error("No compose files found for this container");
      }

      await stopDockerCompose(composeFiles);
      return {
        content: [{
          type: "text",
          text: `Successfully stopped compose project`
        }]
      };
    } else {
      await stopDockerContainer(args.containerId);
      return {
        content: [{
          type: "text",
          text: `Successfully stopped container ${args.containerId}`
        }]
      };
    }
  }
};
```

#### 2.2.6 `docker-logs.ts`

```typescript
import { getDockerLogs } from "../../services/docker-service.js";

export const dockerLogsTool = {
  schema: {
    name: "portboard_docker_logs",
    description: "Fetch logs from a Docker container",
    inputSchema: {
      type: "object",
      properties: {
        containerId: {
          type: "string",
          description: "Container ID or name"
        },
        lines: {
          type: "number",
          description: "Number of lines to fetch (default: 20)"
        },
        since: {
          type: "string",
          description: "Fetch logs since timestamp (ISO 8601 format)"
        }
      },
      required: ["containerId"]
    }
  },
  handler: async (args: { containerId: string; lines?: number; since?: string }) => {
    const logs = await getDockerLogs(args.containerId, args.lines, args.since);

    return {
      content: [{
        type: "text",
        text: logs
      }]
    };
  }
};
```

### 2.3 MCP エントリーポイント (`server/mcp/index.ts`)

```typescript
#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMCPServer } from "./server.js";

async function main() {
  const server = await createMCPServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error("Portboard MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

---

## Phase 3: CLI 拡張実装

### 3.1 CLI フレームワーク構築 (`server/cli/index.ts`)

```typescript
#!/usr/bin/env node

import { Command } from "commander";
import { showBanner } from "./utils/banner.js";

const program = new Command();

program
  .name("portboard")
  .description("Port management tool for developers")
  .version("0.2.0");

// Global options
program.option("--json", "Output as JSON");
program.option("--no-color", "Disable colored output");

// Import commands
import { listCommand } from "./commands/list.js";
import { infoCommand } from "./commands/info.js";
import { killCommand } from "./commands/kill.js";
import { dockerCommand } from "./commands/docker.js";
import { openCommand } from "./commands/open.js";
import { serveCommand } from "./commands/serve.js";
import { tuiCommand } from "./commands/tui.js";

// Register commands
program.addCommand(listCommand);
program.addCommand(infoCommand);
program.addCommand(killCommand);
program.addCommand(dockerCommand);
program.addCommand(openCommand);
program.addCommand(serveCommand);
program.addCommand(tuiCommand);

// Default action: show banner + serve
program.action(async () => {
  showBanner();
  await serveCommand.parseAsync(["serve"], { from: "user" });
});

program.parse();
```

### 3.2 起動バナー (`server/cli/utils/banner.ts`)

```typescript
import figlet from "figlet";
import gradient from "gradient-string";

export function showBanner() {
  const banner = figlet.textSync("PORTBOARD", {
    font: "ANSI Shadow",
    horizontalLayout: "default",
    verticalLayout: "default",
  });

  console.log(gradient.pastel.multiline(banner));
  console.log("");
  console.log("  Port Management Dashboard v0.2.0");
  console.log("");
}
```

### 3.3 List コマンド (`server/cli/commands/list.ts`)

```typescript
import { Command } from "commander";
import Table from "cli-table3";
import chalk from "chalk";
import { getListeningPorts } from "../../services/port-service.js";
import { formatMemory } from "./utils/formatters.js";

export const listCommand = new Command("list")
  .description("List all listening ports")
  .option("-c, --category <category>", "Filter by category")
  .option("-s, --search <query>", "Search query")
  .option("--sort <field>", "Sort by field")
  .action(async (options) => {
    const ports = await getListeningPorts();

    // Filter and sort logic...

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
          chalk.bold("Memory")
        ],
        style: {
          head: ["cyan"],
          border: ["gray"]
        }
      });

      for (const port of filtered) {
        table.push([
          port.port,
          port.processName,
          port.pid,
          port.connectionStatus === "active"
            ? chalk.green("active")
            : chalk.gray("idle"),
          port.cpuUsage ? `${port.cpuUsage.toFixed(1)}%` : "-",
          port.memoryUsage ? formatMemory(port.memoryUsage) : "-"
        ]);
      }

      console.log(table.toString());
    }
  });
```

### 3.4 Kill コマンド (`server/cli/commands/kill.ts`)

```typescript
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { getListeningPorts, killProcess } from "../../services/port-service.js";
import { getProtectedPorts } from "../../config/server-state.js";

export const killCommand = new Command("kill")
  .description("Kill a process by port number or PID")
  .argument("<number>", "Port number or PID to kill")
  .option("-f, --force", "Skip confirmation prompt")
  .option("-y, --yes", "Auto-confirm without prompt")
  .action(async (target: string, options) => {
    const targetNum = Number.parseInt(target, 10);

    if (Number.isNaN(targetNum)) {
      console.error(chalk.red("Error: Invalid port/PID number"));
      process.exit(1);
    }

    const ports = await getListeningPorts();

    // Search strategy: Port-first, then PID
    const portMatch = ports.find(p => p.port === targetNum);
    const pidMatch = ports.find(p => p.pid === targetNum);

    // Both found - show warning and ask user to clarify
    if (portMatch && pidMatch && portMatch.pid !== pidMatch.pid) {
      console.log(chalk.yellow("⚠️  Ambiguous target: Found both port and PID with number " + targetNum));
      console.log("");
      console.log(chalk.cyan("Port match:"));
      console.log(`  Port: ${portMatch.port}`);
      console.log(`  Process: ${portMatch.processName} (PID ${portMatch.pid})`);
      console.log("");
      console.log(chalk.magenta("PID match:"));
      console.log(`  Port: ${pidMatch.port}`);
      console.log(`  Process: ${pidMatch.processName} (PID ${pidMatch.pid})`);
      console.log("");
      console.log(chalk.gray("By default, port takes priority. Continuing with port " + targetNum + "..."));
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
      console.log(`  Port: ${chalk.cyan(portInfo.port)}`);
      console.log(`  Process: ${chalk.white(portInfo.processName)} (PID ${portInfo.pid})`);
      console.log(`  Category: ${portInfo.category}`);

      if (portInfo.dockerContainer) {
        console.log(chalk.blue(`  Docker: ${portInfo.dockerContainer.name}`));
      }

      console.log("");
      console.log(chalk.gray("Use --yes to auto-confirm, or --force to skip all checks"));

      // Interactive prompt with readline
      const readline = await import("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
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

    // Kill process
    const spinner = ora(`Killing process ${portInfo.pid}...`).start();

    try {
      await killProcess(portInfo.pid);
      spinner.succeed(chalk.green(`Successfully killed process ${portInfo.pid} on port ${portInfo.port}`));
    } catch (error) {
      spinner.fail(chalk.red(`Failed to kill process: ${error.message}`));
      process.exit(1);
    }
  });
```

### 3.5 TUI コマンド (`server/cli/commands/tui.ts`)

```typescript
import { Command } from "commander";
import { render } from "ink";
import React from "react";
import App from "../tui/App.js";

export const tuiCommand = new Command("tui")
  .description("Launch interactive Terminal UI")
  .action(async () => {
    render(React.createElement(App));
  });
```

### 3.6 TUI App (`server/cli/tui/App.tsx`)

```typescript
import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { getListeningPorts } from "../../services/port-service.js";
import type { PortInfo } from "../../../src/types/port.js";
import PortTable from "./PortTable.js";
import StatusBar from "./StatusBar.js";

export default function App() {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Auto-refresh every 5 seconds
  useEffect(() => {
    async function fetchPorts() {
      const data = await getListeningPorts();
      setPorts(data);
      setLastUpdate(new Date());
    }

    fetchPorts();
    const interval = setInterval(fetchPorts, 5000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useInput((input, key) => {
    if (input === "q") {
      process.exit(0);
    }
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(Math.min(ports.length - 1, selectedIndex + 1));
    }
    if (input === "k") {
      // Kill selected port
      const port = ports[selectedIndex];
      if (port) {
        // Implement kill logic
      }
    }
    if (input === "o") {
      // Open selected port in browser
      const port = ports[selectedIndex];
      if (port) {
        // Implement open logic
      }
    }
    if (input === "r") {
      // Refresh manually
      fetchPorts();
    }
  });

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">PORTBOARD - Terminal UI</Text>
      </Box>

      <PortTable ports={ports} selectedIndex={selectedIndex} />

      <StatusBar
        portCount={ports.length}
        lastUpdate={lastUpdate}
        shortcuts={[
          { key: "↑/↓", desc: "Navigate" },
          { key: "k", desc: "Kill" },
          { key: "o", desc: "Open" },
          { key: "r", desc: "Refresh" },
          { key: "q", desc: "Quit" }
        ]}
      />
    </Box>
  );
}
```

### 3.7 Serve コマンド (`server/cli/commands/serve.ts`)

既存の `server/cli.ts` の内容をここに移行:

```typescript
import { Command } from "commander";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
// ... 既存の cli.ts の内容

export const serveCommand = new Command("serve")
  .description("Start the web UI server")
  .option("-p, --port <port>", "Port to listen on", "3033")
  .option("-h, --host <host>", "Host to bind to", "127.0.0.1")
  .action(async (options) => {
    // 既存の cli.ts のロジック
  });
```

---

## Phase 4: 既存コード統合

### 4.1 cli.ts リファクタリング

1. `server/cli.ts` の内容を `server/cli/commands/serve.ts` にコピー
2. Command 構造に変換
3. `server/cli.ts` を削除（`server/cli/index.ts` が新しいエントリーポイント）

### 4.2 ビルド設定更新

**package.json:**
```json
{
  "scripts": {
    "build:server": "esbuild server/cli/index.ts --bundle --platform=node --format=esm --outfile=dist/cli.js --packages=external --banner:js='#!/usr/bin/env node' && esbuild server/mcp/index.ts --bundle --platform=node --format=esm --outfile=dist/mcp.js --packages=external --banner:js='#!/usr/bin/env node'"
  }
}
```

**tsconfig.server.json:** `include` に `server/mcp/` と `server/cli/` を追加

---

## Phase 5: ドキュメント & テスト

### 5.1 README.md 更新

**MCP セクション追加:**
```markdown
### MCP Integration

Portboard provides a Model Context Protocol (MCP) server for AI tools like Claude Desktop.

**Setup (Claude Desktop):**
```json
{
  "mcpServers": {
    "portboard": {
      "command": "npx",
      "args": ["portbd-mcp"]
    }
  }
}
```

**Available Tools:**
- `portboard_list_ports` - List all listening ports
- `portboard_kill_process` - Kill a process by PID
- `portboard_get_port_info` - Get detailed port information
- `portboard_docker_list` - List Docker container ports
- `portboard_docker_stop` - Stop Docker containers
- `portboard_docker_logs` - Fetch container logs

See [docs/MCP.md](docs/MCP.md) for detailed tool documentation.
```

**CLI セクション更新:**
```markdown
### CLI Commands

**Web UI (default):**
```bash
portboard              # Start web UI on http://localhost:3033
portboard serve        # Same as above
```

**Port Management:**
```bash
portboard list                      # List all ports
portboard list --category=dev       # Filter by category
portboard list --search=node        # Search query
portboard list --json               # JSON output

portboard info <port>               # Port details
portboard kill <port|pid>           # Kill by port or PID
portboard open <port>               # Open in browser
```

**Docker Operations:**
```bash
portboard docker ls                 # List Docker ports
portboard docker stop <container>   # Stop container
portboard docker logs <container>   # Fetch logs
```

**Interactive Mode:**
```bash
portboard tui                       # Launch Terminal UI
```

See [docs/CLI.md](docs/CLI.md) for detailed command documentation.
```

### 5.2 docs/MCP.md 作成

```markdown
# Portboard MCP Server

Portboard provides a Model Context Protocol (MCP) server that allows AI assistants like Claude to interact with your local ports and processes.

## Installation

The MCP server is included in the `portbd` package:

```bash
npx portbd-mcp
```

## Configuration

### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "portboard": {
      "command": "npx",
      "args": ["portbd-mcp"]
    }
  }
}
```

## Available Tools

### portboard_list_ports

List all listening ports with detailed metadata.

**Arguments:**
- `category` (optional): Filter by process category ("system", "development", "database", "web-server", "applications", "user")
- `search` (optional): Search in port number, process name, or command path
- `sortBy` (optional): Sort by field ("port", "processName", "pid", "connectionStatus", "cpuUsage", "memoryUsage")

**Example:**
```
User: Show me all Node.js development servers

Claude: [uses portboard_list_ports with category="development", search="node"]
```

### portboard_kill_process

Kill a process by PID with safety checks.

**Arguments:**
- `pid` (required): Process ID to kill
- `force` (optional): Force kill without safety checks

**Example:**
```
User: Kill process 12345

Claude: [uses portboard_kill_process with pid=12345]
```

### portboard_get_port_info

Get detailed information about a specific port.

**Arguments:**
- `port` (required): Port number to query

**Example:**
```
User: What's running on port 3000?

Claude: [uses portboard_get_port_info with port=3000]
```

### portboard_docker_list

List all ports associated with Docker containers.

**Arguments:** None

**Example:**
```
User: Show me all Docker containers

Claude: [uses portboard_docker_list]
```

### portboard_docker_stop

Stop a Docker container or compose project.

**Arguments:**
- `containerId` (required): Container ID or name
- `useCompose` (optional): Use docker-compose down instead of docker stop

**Example:**
```
User: Stop the postgres container

Claude: [uses portboard_docker_stop with containerId="postgres"]
```

### portboard_docker_logs

Fetch logs from a Docker container.

**Arguments:**
- `containerId` (required): Container ID or name
- `lines` (optional): Number of lines to fetch (default: 20)
- `since` (optional): Fetch logs since timestamp (ISO 8601 format)

**Example:**
```
User: Show me the last 100 lines of logs from nginx

Claude: [uses portboard_docker_logs with containerId="nginx", lines=100]
```

## Security

The MCP server follows the same security model as Portboard's Web UI:

- **Own-process-only kills**: You can only kill processes you own
- **Protected ports**: Portboard's own ports are protected
- **No root access**: No sudo/root operations

## Troubleshooting

If the MCP server fails to start, check:

1. **Node.js version**: Requires Node.js 18+
2. **Permissions**: Ensure you have permissions to list ports (`lsof` on macOS/Linux)
3. **Claude Desktop logs**: Check logs in Claude Desktop for error messages
```

### 5.3 docs/CLI.md 作成

```markdown
# Portboard CLI

Portboard provides a comprehensive command-line interface for managing ports and processes.

## Installation

```bash
npm install -g portbd
```

Or use via npx:

```bash
npx portbd
```

## Commands

### Web UI (Default)

Start the web UI server:

```bash
portboard              # Default: starts web UI on http://localhost:3033
portboard serve        # Explicit serve command
portboard serve --port 3000 --host 0.0.0.0
```

**Options:**
- `--port <port>`: Port to listen on (default: 3033, auto-increments if busy)
- `--host <host>`: Host to bind to (default: 127.0.0.1)

### Port Management

#### List Ports

```bash
portboard list                      # List all ports
portboard list --category=dev       # Filter by category
portboard list --search=node        # Search query
portboard list --sort=port          # Sort by field
portboard list --json               # JSON output
```

**Options:**
- `--category <cat>`: Filter by category (system, development, database, web-server, applications, user)
- `--search <query>`: Search in port, process name, or command path
- `--sort <field>`: Sort by field (port, processName, pid, connectionStatus, cpuUsage, memoryUsage)
- `--json`: Output as JSON

**Example output:**
```
┌──────┬─────────────┬───────┬────────┬──────┬────────┐
│ Port │ Process     │ PID   │ Status │ CPU  │ Memory │
├──────┼─────────────┼───────┼────────┼──────┼────────┤
│ 3000 │ node        │ 12345 │ active │ 2.3% │ 145 MB │
│ 3033 │ node        │ 12346 │ idle   │ 0.1% │ 87 MB  │
└──────┴─────────────┴───────┴────────┴──────┴────────┘
```

#### Port Info

```bash
portboard info <port>     # Show detailed info
portboard info 3000       # Example
portboard info 3000 --json
```

#### Kill Process

```bash
portboard kill <number>       # Kill by port number or PID
portboard kill 3000           # Kill process on port 3000
portboard kill 12345          # Kill process with PID 12345
portboard kill 3000 --yes     # Skip confirmation prompt
portboard kill 3000 --force   # Skip all safety checks
```

**Auto-detection strategy:**
1. Search for port number first (port priority)
2. If not found, search by PID
3. If both port and PID exist with same number, show warning and use port by default

**Confirmation:**
- Interactive `(y/N)` prompt shown by default
- `--yes`: Skip confirmation (but keep safety checks)
- `--force`: Skip all checks including self-port protection

**Example (ambiguous case):**
```bash
$ portboard kill 80
⚠️  Ambiguous target: Found both port and PID with number 80

Port match:
  Port: 80
  Process: nginx (PID 12345)

PID match:
  Port: 8080
  Process: node (PID 80)

By default, port takes priority. Continuing with port 80...

⚠️  About to kill:
  Port: 80
  Process: nginx (PID 12345)
  Category: web-server

Continue? (y/N):
```

#### Open in Browser

```bash
portboard open <port>     # Open port in browser
portboard open 3000       # Opens http://localhost:3000
```

### Docker Operations

```bash
portboard docker ls                 # List Docker ports
portboard docker ls --json          # JSON output

portboard docker stop <container>   # Stop container
portboard docker stop my-postgres

portboard docker logs <container>   # Fetch logs
portboard docker logs my-postgres --lines=100
portboard docker logs my-postgres --follow
```

**Options (logs):**
- `--lines <n>`: Number of lines to fetch (default: 20)
- `--follow`: Follow mode (auto-refresh)

### Terminal UI

Launch interactive Terminal UI:

```bash
portboard tui
```

**Keyboard shortcuts:**
- `↑/↓`: Navigate
- `k`: Kill selected process
- `o`: Open selected port in browser
- `r`: Refresh manually
- `q`: Quit

## Global Options

- `--json`: Output as JSON (applies to all commands)
- `--no-color`: Disable colored output

## Examples

**Find all Node.js processes:**
```bash
portboard list --search=node
```

**List all development servers:**
```bash
portboard list --category=development
```

**Get port info as JSON for scripting:**
```bash
portboard list --json | jq '.[] | select(.port == 3000)'
```

**Kill a process by port number:**
```bash
portboard list --search=express
portboard kill 8080      # Kill by port number
```

**Kill a process by PID:**
```bash
portboard list
portboard kill 12345     # Kill by PID
```

**Stop all Docker containers:**
```bash
portboard docker ls --json | jq -r '.[].dockerContainer.id' | xargs -I {} portboard docker stop {}
```

## Scripting

Portboard's `--json` flag makes it easy to integrate with other tools:

```bash
# Find high CPU processes
portboard list --json | jq '.[] | select(.cpuUsage > 50)'

# Count active connections
portboard list --json | jq '[.[] | select(.connectionStatus == "active")] | length'

# Export to CSV
portboard list --json | jq -r '.[] | [.port, .processName, .pid, .cpuUsage, .memoryUsage] | @csv'
```
```

### 5.4 CLAUDE.md 更新

**MCP セクション追加:**
```markdown
### MCP Server

Portboard provides a Model Context Protocol (MCP) server for AI tool integration.

**Architecture:**
- `server/mcp/server.ts` - MCP Server core using stdio transport
- `server/mcp/tools/` - 6 MCP tools (list-ports, kill-process, port-info, docker-list, docker-stop, docker-logs)
- `server/mcp/index.ts` - Shebang entry point for `npx portbd-mcp`

**Tools:**
- All tools use existing service layer (no code duplication)
- Zod validation for input arguments
- Same security model as Web UI

**Usage:**
See [docs/MCP.md](docs/MCP.md) for detailed documentation.
```

**CLI セクション更新:**
```markdown
### CLI

Portboard provides standalone CLI commands powered by commander.

**Architecture:**
- `server/cli/index.ts` - CLI framework with commander
- `server/cli/commands/` - Individual commands (list, info, kill, docker, open, serve, tui)
- `server/cli/utils/` - Formatters, output helpers, banner generator
- `server/cli/tui/` - Ink-based Terminal UI

**Commands:**
- `list` - List ports with filtering and sorting
- `info` - Port details
- `kill` - Kill process with confirmation
- `docker` - Docker operations (ls, stop, logs)
- `open` - Open in browser
- `serve` - Web UI server (default)
- `tui` - Interactive Terminal UI

**Features:**
- Pretty table output via cli-table3
- JSON mode for scripting
- Colored output via chalk
- ASCII art banner via figlet
- Real-time TUI via Ink

**Usage:**
See [docs/CLI.md](docs/CLI.md) for detailed documentation.
```

---

## 実装チェックリスト

### Phase 1: 基盤整備
- [ ] 依存関係追加 (npm install)
- [ ] TypeScript 型定義追加 (@types/figlet, @types/gradient-string)
- [ ] ディレクトリ作成 (server/mcp/, server/cli/)
- [ ] package.json bin セクション更新
- [ ] package.json build スクリプト更新
- [ ] tsconfig.server.json 更新

### Phase 2: MCP Server
- [ ] server/mcp/server.ts 作成
- [ ] server/mcp/tools/list-ports.ts 作成
- [ ] server/mcp/tools/kill-process.ts 作成
- [ ] server/mcp/tools/port-info.ts 作成
- [ ] server/mcp/tools/docker-list.ts 作成
- [ ] server/mcp/tools/docker-stop.ts 作成
- [ ] server/mcp/tools/docker-logs.ts 作成
- [ ] server/mcp/index.ts 作成（エントリーポイント）

### Phase 3: CLI 拡張
- [ ] server/cli/utils/banner.ts 作成
- [ ] server/cli/utils/formatters.ts 作成
- [ ] server/cli/utils/output.ts 作成
- [ ] server/cli/commands/list.ts 作成
- [ ] server/cli/commands/info.ts 作成
- [ ] server/cli/commands/kill.ts 作成
- [ ] server/cli/commands/docker.ts 作成
- [ ] server/cli/commands/open.ts 作成
- [ ] server/cli/commands/serve.ts 作成（cli.ts から移行）
- [ ] server/cli/commands/tui.ts 作成
- [ ] server/cli/tui/App.tsx 作成
- [ ] server/cli/tui/PortTable.tsx 作成
- [ ] server/cli/tui/StatusBar.tsx 作成
- [ ] server/cli/index.ts 作成（新エントリーポイント）

### Phase 4: 統合
- [ ] server/cli.ts 内容を server/cli/commands/serve.ts に移行
- [ ] server/cli.ts 削除
- [ ] ビルド動作確認 (npm run build)
- [ ] CLI 動作確認 (node dist/cli.js)
- [ ] MCP Server 動作確認 (node dist/mcp.js)

### Phase 5: ドキュメント
- [ ] README.md 更新（MCP + CLI セクション）
- [ ] docs/MCP.md 作成
- [ ] docs/CLI.md 作成
- [ ] CLAUDE.md 更新（アーキテクチャセクション）
- [ ] 使用例の動作確認

---

## 技術的な工夫点

1. **単一パッケージ戦略**: `portbd` に MCP と CLI を両方含めることで、ユーザーは1つのパッケージで全機能を利用可能

2. **コード再利用**: MCP ツールと CLI コマンドは既存のサービス層を共有（port-service, docker-service など）

3. **セキュリティ一貫性**: Web UI、MCP、CLI すべて同じセキュリティモデル（own-process-only, protected ports）

4. **UX 重視**:
   - かっこいい起動バナー（figlet + gradient）
   - リアルタイム TUI（Ink + React）
   - カラフルな出力（chalk）
   - JSON モードでスクリプト対応

5. **後方互換性**: 既存の `portboard` コマンドは引き続き Web UI を起動（デフォルト動作）

6. **クロスプラットフォーム**: Platform abstraction layer により、MCP と CLI も macOS/Windows/Linux 対応可能

---

## 見積もり時間

- **Phase 1**: 30分
- **Phase 2**: 1時間
- **Phase 3**: 2時間
- **Phase 4**: 30分
- **Phase 5**: 30分

**合計**: 約4.5時間
