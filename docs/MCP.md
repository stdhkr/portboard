# Portboard MCP Server

Portboard provides a Model Context Protocol (MCP) server that allows AI assistants like Claude to interact with your local ports and processes.

## Installation

The MCP server is included in the `portbd` package:

```bash
npx portboard-mcp
```

## Configuration

### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "portboard": {
      "command": "npx",
      "args": ["portboard-mcp"]
    }
  }
}
```

### Other MCP Clients

The MCP server uses stdio transport and can be integrated with any MCP-compatible client. Use the same command pattern:

```bash
npx portboard-mcp
```

## Available Tools

### portboard_list_ports

List all listening ports with detailed metadata.

**Arguments:**
- `category` (optional): Filter by process category
  - Values: `"system"`, `"development"`, `"database"`, `"web-server"`, `"applications"`, `"user"`
- `search` (optional): Search in port number, process name, or command path
- `sortBy` (optional): Sort by field
  - Values: `"port"`, `"processName"`, `"pid"`, `"connectionStatus"`, `"cpuUsage"`, `"memoryUsage"`

**Returns:** JSON array of PortInfo objects

**Example usage:**
```
User: Show me all Node.js development servers

Claude: [uses portboard_list_ports with category="development", search="node"]

Found 3 Node.js development servers:
- Port 3000: node (PID 12345) - Vite dev server
- Port 3033: node (PID 12346) - Portboard API server
- Port 8080: node (PID 12347) - Express app
```

---

### portboard_kill_process

Kill a process by PID with safety checks.

**Arguments:**
- `pid` (required): Process ID to kill
- `force` (optional): Force kill without safety checks (use with caution)

**Returns:** Success message

**Safety features:**
- Ownership verification (can only kill your own processes)
- Protected ports (cannot kill Portboard server itself without `force=true`)

**Example usage:**
```
User: Kill process 12345

Claude: [uses portboard_kill_process with pid=12345]

Successfully killed process 12345
```

---

### portboard_get_port_info

Get detailed information about a specific port.

**Arguments:**
- `port` (required): Port number to query

**Returns:** PortInfo object with full metadata

**Example usage:**
```
User: What's running on port 3000?

Claude: [uses portboard_get_port_info with port=3000]

Port 3000 is running a Vite dev server (node, PID 12345).
- Status: active (2 connections)
- CPU: 2.3%, Memory: 145 MB
- Working directory: /Users/john/projects/my-app
- Uptime: 2h 15m
```

---

### portboard_docker_list

List all ports associated with Docker containers.

**Arguments:** None

**Returns:** JSON array of PortInfo objects (Docker containers only)

**Example usage:**
```
User: Show me all Docker containers

Claude: [uses portboard_docker_list]

Found 2 Docker containers:
- Port 5432: postgres (container ID: abc123)
- Port 6379: redis (container ID: def456)
```

---

### portboard_docker_stop

Stop a Docker container or compose project.

**Arguments:**
- `containerId` (required): Container ID or name
- `useCompose` (optional): Use docker-compose down instead of docker stop

**Returns:** Success message

**Example usage:**
```
User: Stop the postgres container

Claude: [uses portboard_docker_stop with containerId="postgres"]

Successfully stopped container postgres
```

---

### portboard_docker_logs

Fetch logs from a Docker container.

**Arguments:**
- `containerId` (required): Container ID or name
- `lines` (optional): Number of lines to fetch (default: 20)
- `since` (optional): Fetch logs since timestamp (ISO 8601 format)

**Returns:** Container logs as text

**Example usage:**
```
User: Show me the last 100 lines of logs from nginx

Claude: [uses portboard_docker_logs with containerId="nginx", lines=100]

[2025-11-19 10:30:15] nginx: started
[2025-11-19 10:30:16] nginx: listening on port 80
...
```

---

## Security

The MCP server follows the same security model as Portboard's Web UI:

- **Own-process-only kills**: You can only kill processes you own
- **Protected ports**: Portboard's own ports are protected from accidental termination
- **No root access**: No sudo/root operations required or supported
- **Localhost binding**: All operations are local to your machine

## Error Handling

The MCP server returns structured error messages when operations fail:

- Missing permissions: "Permission denied"
- Protected port: "Cannot kill Portboard server itself! Use force=true to override."
- Process not found: "Port X is not listening"
- Docker not available: "Docker not available or not running"

## Troubleshooting

### MCP Server Won't Start

1. **Check Node.js version**: Requires Node.js 18+
   ```bash
   node --version
   ```

2. **Check permissions**: Ensure you have permissions to list ports (lsof on macOS/Linux)

3. **Claude Desktop logs**: Check Claude Desktop logs for error messages
   - macOS: `~/Library/Logs/Claude/`
   - Check for connection errors or permission issues

### MCP Tools Not Appearing in Claude

1. **Restart Claude Desktop** after updating configuration
2. **Verify configuration path**: Ensure `claude_desktop_config.json` is in the correct location
3. **Check JSON syntax**: Validate your configuration file is valid JSON

### Port Detection Issues

The MCP server relies on the same port detection mechanism as the Web UI:

- **macOS/Linux**: Uses `lsof` command (built-in)
- **Windows**: Uses `netstat` (partial support)

If ports are not being detected:
1. Ensure `lsof` is available: `which lsof`
2. Check permissions to run `lsof`
3. Try running Portboard Web UI to verify port detection works

## Advanced Usage

### Combining Multiple Tools

Claude can chain multiple MCP tools together:

```
User: Find all high CPU processes and kill them

Claude:
1. [uses portboard_list_ports with sortBy="cpuUsage"]
2. Identifies processes using > 50% CPU
3. [uses portboard_kill_process for each high CPU process]

Killed 3 processes:
- PID 12345 (node, 87% CPU)
- PID 12346 (python, 65% CPU)
- PID 12347 (java, 54% CPU)
```

### Docker Workflow Automation

```
User: Stop all Docker containers and show me the logs before stopping

Claude:
1. [uses portboard_docker_list]
2. For each container:
   - [uses portboard_docker_logs with lines=50]
   - Shows recent logs
   - [uses portboard_docker_stop]

Stopped 3 containers with their final logs displayed.
```

## Comparison with CLI

| Feature | MCP Server | CLI |
|---------|-----------|-----|
| AI Integration | ✅ Yes | ❌ No |
| Interactive Prompts | ✅ Natural language | ❌ Command flags |
| Automation | ✅ Via AI | ✅ Via scripts |
| JSON Output | ✅ Automatic | ✅ `--json` flag |
| Follow Mode | ❌ No | ✅ Docker logs |
| TUI Mode | ❌ No | ✅ Yes |

Choose MCP for AI-assisted workflows, CLI for scripting and terminal use.
