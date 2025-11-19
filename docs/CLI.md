# Portboard CLI

Portboard provides a comprehensive command-line interface for managing ports and processes.

## Installation

```bash
npm install -g portbd
```

Or use via npx (no installation required):

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
- `--host <host>`: Host to bind to (default: 127.0.0.1 for security)
- `--no-open`: Do not open browser automatically

**Example:**
```bash
# Start on custom port without opening browser
portboard serve --port 8080 --no-open
```

---

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
- `--category <cat>`: Filter by category
  - Values: `system`, `development`, `database`, `web-server`, `applications`, `user`
- `--search <query>`: Search in port, process name, or command path
- `--sort <field>`: Sort by field
  - Values: `port`, `processName`, `pid`, `connectionStatus`, `cpuUsage`, `memoryUsage`
- `--json`: Output as JSON

**Example output:**
```
┌──────┬─────────────┬───────┬────────┬──────┬────────┐
│ Port │ Process     │ PID   │ Status │ CPU  │ Memory │
├──────┼─────────────┼───────┼────────┼──────┼────────┤
│ 3000 │ node        │ 12345 │ active │ 2.3% │ 145 MB │
│ 3033 │ node        │ 12346 │ idle   │ 0.1% │ 87 MB  │
└──────┴─────────────┴───────┴────────┴──────┴────────┘

Found 2 ports
```

---

#### Port Info

```bash
portboard info <port>     # Show detailed info
portboard info 3000       # Example
portboard info 3000 --json
```

**Example output:**
```
Port 3000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Basic Info
  Process: node
  PID: 12345
  Protocol: TCP
  Address: *

Connection Status
  Status: active
  Connections: 2

Resource Usage
  CPU: 2.3%
  Memory: 145 MB
  Uptime: 2h 15m

Working Directory
  /Users/john/projects/my-app

Command Path
  /Users/john/.nvm/versions/node/v22.12.0/bin/node

Category
  user
```

---

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

**Docker-aware behavior:**
- If the target is a Docker container, Portboard automatically uses safe stop commands:
  - `docker-compose down` for compose projects
  - `docker stop` for standalone containers
- This prevents issues with directly killing docker-proxy processes
- Docker containers are gracefully stopped instead of killed

**Confirmation:**
- Interactive `(y/N)` prompt shown by default
- `--yes`: Skip confirmation (but keep safety checks)
- `--force`: Skip all checks including self-port protection

**Example (normal case):**
```bash
$ portboard kill 3000
⚠️  About to kill:
  Port: 3000
  Process: node (PID 12345)
  Category: user

Continue? (y/N): y
✓ Successfully killed process 12345 on port 3000
```

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

---

#### Open in Browser

```bash
portboard open <port>     # Open port in browser
portboard open 3000       # Opens http://localhost:3000
```

---

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
- `-n, --lines <number>`: Number of lines to fetch (default: 20)
- `-f, --follow`: Follow log output (auto-refresh every 2 seconds)

**Example (docker ls):**
```
┌──────┬───────────┬────────────────────────┬────────┬──────┬────────┐
│ Port │ Container │ Image                  │ Status │ CPU  │ Memory │
├──────┼───────────┼────────────────────────┼────────┼──────┼────────┤
│ 5432 │ postgres  │ postgres:16.4-bullseye │ idle   │ 5.4% │ ~0 MB  │
│ 6379 │ redis     │ redis:7.2.5-alpine3.20 │ idle   │ 5.4% │ ~0 MB  │
└──────┴───────────┴────────────────────────┴────────┴──────┴────────┘

Found 2 Docker containers
```

**Example (follow logs):**
```bash
$ portboard docker logs nginx --follow
Following logs for nginx...
Press Ctrl+C to stop

[2025-11-19 10:30:15] nginx: started
[2025-11-19 10:30:16] nginx: listening on port 80
[2025-11-19 10:30:20] 192.168.1.100 GET /index.html
...
```

---

## Global Options

- `--json`: Output as JSON (applies to list, info, docker ls commands)

---

## Examples

### Find all Node.js processes

```bash
portboard list --search=node
```

### List all development servers

```bash
portboard list --category=development
```

### Get port info as JSON for scripting

```bash
portboard list --json | jq '.[] | select(.port == 3000)'
```

### Kill a process by port number

```bash
portboard list --search=express
portboard kill 8080      # Kill by port number
```

### Kill a process by PID

```bash
portboard list
portboard kill 12345     # Kill by PID
```

### Stop all Docker containers

```bash
portboard docker ls --json | jq -r '.[].dockerContainer.id' | xargs -I {} portboard docker stop {}
```

---

## Scripting

Portboard's `--json` flag makes it easy to integrate with other tools:

**Find high CPU processes:**
```bash
portboard list --json | jq '.[] | select(.cpuUsage > 50)'
```

**Count active connections:**
```bash
portboard list --json | jq '[.[] | select(.connectionStatus == "active")] | length'
```

**Export to CSV:**
```bash
portboard list --json | jq -r '.[] | [.port, .processName, .pid, .cpuUsage, .memoryUsage] | @csv'
```

**Kill all idle development ports:**
```bash
portboard list --json --category=development | \
  jq -r '.[] | select(.connectionStatus == "idle") | .pid' | \
  xargs -I {} portboard kill {} --yes
```

---

## Security

The CLI follows the same security model as Portboard's Web UI:

- **Own-process-only kills**: You can only kill processes you own
- **Protected ports**: Portboard's own ports (3033, 3000) are protected from accidental termination
- **No root access**: No sudo/root operations required or supported
- **Localhost binding**: Default binding to 127.0.0.1 for security

### Self-Port Protection

Portboard protects its own ports from accidental termination:

```bash
$ portboard kill 3033
Error: Cannot kill Portboard server itself!
Use --force to override (will terminate this interface)
```

---

## Troubleshooting

### Command Not Found

If `portboard` command is not found after `npm install -g portbd`:

1. Check global npm bin directory is in PATH:
   ```bash
   npm config get prefix
   echo $PATH
   ```

2. Use npx instead (no installation required):
   ```bash
   npx portbd list
   ```

### Permission Denied

If you get "Permission denied" errors:

- **macOS/Linux**: Ensure you have permissions to run `lsof`
- **Windows**: Run as Administrator for full functionality
- **Docker**: Ensure Docker daemon is running

### Port Detection Issues

- **macOS/Linux**: Uses `lsof` command (built-in)
- **Windows**: Uses `netstat` (partial support)

If ports are not being detected:
1. Ensure `lsof` is available: `which lsof`
2. Try with sudo for system processes (not recommended for regular use)
3. Check if processes are listening on IPv4 vs IPv6

---

## Comparison with Web UI

| Feature | CLI | Web UI |
|---------|-----|--------|
| Port Listing | ✅ Table view | ✅ Rich table with sorting |
| Search/Filter | ✅ `--search`, `--category` | ✅ Interactive search |
| Kill Process | ✅ With confirmation | ✅ With detailed dialog |
| Docker Support | ✅ ls/stop/logs | ✅ Full integration |
| JSON Output | ✅ `--json` flag | ❌ No |
| Scripting | ✅ Excellent | ❌ No |
| Real-time Updates | ❌ No | ✅ Auto-refresh every 5s |
| Icon Display | ❌ No | ✅ App icons |
| IDE Integration | ❌ No | ✅ Open in IDE |
| Desktop Notifications | ❌ No | ✅ New port alerts |

Choose CLI for scripting and quick terminal operations, Web UI for visual management and real-time monitoring.

---

## Advanced Tips

### Create Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
alias pb='portboard'
alias pbl='portboard list'
alias pbk='portboard kill'
alias pbd='portboard docker'
```

Usage:
```bash
pbl --search=node
pbk 3000
pbd ls
```

### Use with Watch

Monitor ports in real-time:

```bash
watch -n 1 'portboard list --search=node'
```

### Combine with Other Tools

**Kill all Node.js development servers:**
```bash
portboard list --json --category=development | \
  jq -r '.[] | select(.processName == "node") | .pid' | \
  xargs -I {} portboard kill {} --yes
```

**Find ports by working directory:**
```bash
portboard list --json | \
  jq -r '.[] | select(.cwd | contains("my-project")) | "\(.port)\t\(.processName)\t\(.pid)"'
```

**Monitor high memory processes:**
```bash
portboard list --json | \
  jq -r '.[] | select(.memoryUsage > 1000000000) | "\(.port)\t\(.processName)\t\(.memoryUsage / 1024 / 1024 | floor)MB"'
```
