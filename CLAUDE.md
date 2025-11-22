# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Portboard** is an open-source, browser-based port management tool built with React, TypeScript, and Vite. The project features a distinctive Neo Brutalism design system and provides a full-featured dashboard for managing ports and processes.

Key points:
- **Goal**: Build a pgweb/Drizzle Studio-like web dashboard for managing ports and processes
- **Design**: Neo Brutalism UI with bold borders, offset shadows, and high-contrast colors
- **Security-first**: Default localhost binding, explicit opt-in for Docker socket access, own-process-only kills by default
- **Multi-phase approach**: Starting with Node.js + Hono + React, potentially migrating to Go + Wails later

## Environment Configuration

Portboard uses environment variables for configuration. All hardcoded values have been centralized into constants files with environment variable support.

### Setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env to customize settings
```

### Available Environment Variables

**Server Configuration:**
- `PORT` - Server port (default: 3033, auto-increments if busy)
- `DEFAULT_PORT` - Default port to try first (default: 3033)
- `HOST` - Bind address (default: 127.0.0.1 for localhost-only)
- `DEFAULT_HOST` - Default host binding address (default: 127.0.0.1)
- `MAX_PORT_ATTEMPTS` - Max port retry attempts (default: 10)

**Frontend Development:**
- `VITE_DEV_PORT` - Vite dev server port (default: 3000)
- `VITE_API_PORT` - API port for build-time URL generation (default: 3033)
- `VITE_API_HOST` - API host for build-time URL generation (default: 127.0.0.1)
- `VITE_API_BASE_URL` - Full API base URL (optional, overrides auto-detection)

**Timing Configuration:**
- `AUTO_REFRESH_INTERVAL` - Port list auto-refresh interval in ms (default: 5000)
- `DOCKER_LOGS_REFRESH` - Docker logs auto-refresh interval in ms (default: 5000)
- `COPY_FEEDBACK_TIMEOUT` - Copy button feedback timeout in ms (default: 2000)
- `DIALOG_CLOSE_DELAY` - Dialog closing animation delay in ms (default: 200)

**Docker Configuration:**
- `DOCKER_DEFAULT_LOG_LINES` - Default number of log lines to fetch (default: 20)
- `DOCKER_LOGS_MAX_BUFFER` - Max buffer size for docker logs in bytes (default: 10485760)

**Icon Configuration:**
- `ICON_CACHE_DIR` - Icon cache directory name (default: portboard-icons)
- `ICON_RESIZE_SIZE` - Icon resize dimensions in pixels (default: 64)

### Configuration Files

**Backend:** [server/config/constants.ts](server/config/constants.ts)
- All server-side configuration with `process.env` support
- Exports: `SERVER_CONFIG`, `TIMING`, `DOCKER`, `ICON`, `NETWORK`

**Frontend:** [src/config/constants.ts](src/config/constants.ts)
- Frontend constants for UI behavior and timing
- Exports: `TIMING`, `DOCKER`, `UI`

**API URLs:** [src/config/api.ts](src/config/api.ts)
- API URL configuration with environment variable support
- Auto-detection from `window.location` in production
- Exports: `API_BASE_URL`, `ASSETS_BASE_URL`

## NPM Package & CLI

**Package Name**: `portbd` (published on npm)
**Project Name**: `portboard` (GitHub repository)

The package is designed to run via `npx` for easy one-command execution:

```bash
npx portbd
```

This will:
- Download and run the latest version
- Start the server on `http://localhost:3033` (auto-increment if busy)
- Automatically open the browser to the dashboard

### Package Configuration

**package.json key fields:**
- `name`: `portbd` - npm package name
- `bin`: Two CLI executables:
  - `portboard`: Main CLI with commands (list, kill, serve, etc.)
  - `portboard-mcp`: MCP server for AI integration
- `files`: `["dist", "public", ".env.example"]` - Files included in npm package
- `prepublishOnly`: `npm run build` - Auto-build before publishing

### CLI & MCP Architecture

**CLI Entry Points:**
- [server/cli/index.ts](server/cli/index.ts) - Main CLI with commander.js framework
  - Shebang: `#!/usr/bin/env node`
  - Registers 7 commands: list, info, kill, docker, open, serve, (tui - planned)
  - Default action: show banner + run serve command
- [server/mcp/index.ts](server/mcp/index.ts) - MCP Server entry point
  - Shebang: `#!/usr/bin/env node`
  - stdio transport for AI integration
  - Exposes 6 MCP tools for Claude Desktop

**CLI Commands** ([server/cli/commands/](server/cli/commands/)):
- `list.ts` - List ports with filtering, sorting, JSON output
- `info.ts` - Show detailed port information
- `kill.ts` - Kill process by port/PID with confirmation
- `docker.ts` - Docker operations (ls/stop/logs with follow mode)
- `open.ts` - Open port in browser
- `serve.ts` - Start web UI server (migrated from cli.ts)

**MCP Tools** ([server/mcp/tools/](server/mcp/tools/)):
- `list-ports.ts` - List ports with category/search filtering
- `kill-process.ts` - Kill with safety checks
- `port-info.ts` - Get detailed info
- `docker-list.ts` - List Docker ports
- `docker-stop.ts` - Stop containers/compose
- `docker-logs.ts` - Fetch container logs

**Utilities** ([server/cli/utils/](server/cli/utils/)):
- `banner.ts` - Figlet + gradient startup banner
- `formatters.ts` - Memory/CPU/uptime formatting
- `output.ts` - Chalk-based colored output helpers

## Development Commands

### Running the Development Server
```bash
npm run dev:all
```
Starts both Vite dev server and Hono backend server with HMR (Hot Module Replacement).

**Default URLs:**
- Frontend: `http://localhost:3000` (configurable via `VITE_DEV_PORT`)
- Backend API: `http://localhost:3033` (configurable via `PORT`)

**Note**: Use `npm run dev:all` for full development. `npm run dev` only starts Vite frontend.

### Building for Production
```bash
npm run build
```
Builds both client and server for production:
- `npm run build:client` - Vite build (outputs to `public/`)
- `npm run build:server` - esbuild bundling (outputs single `dist/cli.js`)
  - Bundles all server code into a single executable file
  - Uses `--packages=external` to keep node_modules dependencies external
  - Preserves shebang (`#!/usr/bin/env node`) for CLI execution
  - Fast build (~15ms)

### Running Production Build Locally
```bash
npm start
```
Runs the production build via `node dist/cli.js`.
This executes the bundled CLI which:
- Starts the Hono server
- Serves static files from `public/`
- Auto-opens browser
- Handles port conflicts with auto-increment

### Linting and Formatting
```bash
npm run lint
```
Runs Biome linter on all TypeScript/TSX files in src/.

```bash
npm run format
```
Formats code using Biome.

```bash
npm run check
```
Runs Biome check (lint + format) and applies fixes.

```bash
npm run typecheck
```
Runs TypeScript type checking without emitting files.

### Preview Production Build
```bash
npm preview
```
Locally preview the production build.

## Technology Stack

### Core Technologies
- **Runtime**: Node.js (with tsx for TypeScript execution)
- **Frontend**: React 19.2 with TypeScript
- **Build Tools**:
  - **Vite 7.1.7** - Frontend bundler
  - **esbuild** - Server bundler for CLI
- **Compiler**: React Compiler (babel-plugin-react-compiler) - enabled for automatic optimization

### Development Tools
- **TypeScript**: ~5.9.3 with strict mode enabled
- **tsx**: 4.20.6 for TypeScript execution in development
- **esbuild**: 0.27.0 for server bundling
- **Biome**: 2.3.4 for linting and formatting

## Architecture Notes

### React Compiler
The React Compiler is enabled in this project via [vite.config.ts](vite.config.ts). This experimental feature automatically optimizes React components, but may impact dev and build performance. See the React Compiler [documentation](https://react.dev/learn/react-compiler) for details.

### TypeScript Configuration
The project uses three TypeScript configurations:
- [tsconfig.app.json](tsconfig.app.json): Application code configuration with strict mode
- [tsconfig.node.json](tsconfig.node.json): Node.js tooling configuration
- [tsconfig.server.json](tsconfig.server.json): Server build configuration (outputs to `dist/`)
- [tsconfig.json](tsconfig.json): Root configuration that references both app and node configs

### Build Configuration

**Vite ([vite.config.ts](vite.config.ts)):**
- Frontend build output: `public/` directory
- Configured with `emptyOutDir: true` to clean before build
- `publicDir: false` to avoid conflicts with output directory
- Static files served by CLI in production

**esbuild (package.json script):**
- Server bundler: `esbuild server/cli.ts --bundle --platform=node --format=esm --outfile=dist/cli.js --packages=external`
- Bundles all server code into single `dist/cli.js` file
- `--packages=external`: Keeps node_modules dependencies external (not bundled)
- `--platform=node`: Node.js target platform
- `--format=esm`: ES module format (required for `"type": "module"`)
- Output size: ~72KB (vs 602KB without external packages)
- Build time: ~15ms

**TypeScript Server Config ([tsconfig.server.json](tsconfig.server.json)):**
- Used for type checking only (esbuild handles compilation)
- `allowImportingTsExtensions: false` - Required for emit
- `moduleResolution: "node"` - Node.js module resolution

### Styling
- **Tailwind CSS 4**: Installed via `@tailwindcss/vite` plugin
  - CSS import in [src/index.css](src/index.css): `@import "tailwindcss";`
  - Vite plugin configured in [vite.config.ts](vite.config.ts)
  - Custom theme variables defined using `@theme inline` in index.css
  - Dark mode support via `.dark` class with custom variant
- **Neo Brutalism Design System**: Custom design system at [src/styles/brutalism.css](src/styles/brutalism.css)
  - Color scheme: Yellow (#FFD93D), Cyan (#6BCF7E), Red (#FF6B6B)
  - 2-3px borders with offset shadows (3px standard)
  - Custom scrollbar styling with theme support and transparent track
  - CSS variables for light/dark mode
- **shadcn/ui**: Base components wrapped with brutalist styling
  - Original components in [src/components/ui/](src/components/ui/)
  - Brutalist wrappers in [src/components/brutalist/](src/components/brutalist/)
  - Button, Table, Dialog, DropdownMenu, Checkbox, Collapsible, Select, Tooltip components available
  - Custom components:
    - CopyButton (render props pattern)
    - ConnectionStatusIndicator (Active/Idle display)
    - Collapsible (expandable sections with controlled/uncontrolled state support)
    - Select (brutalist select component for Docker logs line count)
    - Tooltip (brutalist tooltip component for contextual UI hints)
  - Toast notifications via Sonner with brutalist styling
  - Dependencies: `@radix-ui/react-slot`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-checkbox`, `@radix-ui/react-select`, `@radix-ui/react-tooltip`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`
  - Path alias `@` configured to resolve to `./src` directory
  - Animation support via `tw-animate-css` package

### Internationalization (i18n)
- **Framework**: react-i18next with i18next-browser-languagedetector
- **Supported Languages**: English (en), Japanese (ja)
- **Language Detection**: Automatic detection from localStorage → browser navigator
- **Persistence**: User's language preference saved in localStorage
- **Configuration**: [src/lib/i18n.ts](src/lib/i18n.ts)
  - Centralized i18n setup with language detection
  - Fallback language: English
  - Escape value disabled for React (XSS protection via React)
- **Translation Files**: JSON-based resource files in [src/locales/](src/locales/)
  - [en.json](src/locales/en.json): English translations
  - [ja.json](src/locales/ja.json): Japanese translations
  - Hierarchical structure: `dialog.detail.sections.basicInfo`
  - Supports interpolation: `{{variable}}` syntax for dynamic values
  - Comprehensive coverage: App, Table, Search, Actions, Dialogs, Connection Status, Port Rows
- **Usage Pattern**:
  ```typescript
  import { useTranslation } from "react-i18next";

  function Component() {
    const { t, i18n } = useTranslation();

    // Simple translation
    const title = t("app.title");

    // Translation with interpolation
    const info = t("table.stats.info", {
      filtered: sortedPorts.length,
      total: ports?.length || 0,
      interval: TIMING.AUTO_REFRESH_INTERVAL / 1000,
      time: lastUpdatedTime,
    });

    // Change language
    i18n.changeLanguage("ja");
  }
  ```
- **Language Toggle**: Brutalist select component in [src/components/settings/language-toggle.tsx](src/components/settings/language-toggle.tsx)
  - Globe icon with visible language label (EN/日本語)
  - Dropdown selection for language switching
  - Sized to match theme toggle (`h-8 text-sm`)
- **Translation Quality**:
  - Japanese translations use natural, UX-friendly terminology
  - "kill" → "強制終了" (force termination) instead of "終了"
  - "idle" → "待機中" (waiting) instead of "アイドル"
  - "Manual (docker run)" → "手動起動 (docker run)"

## Architecture

### Platform Abstraction Layer

**Design Pattern**: Provider pattern with interface-based design for cross-platform support

**Location**: `server/services/platform/`

**Purpose**: Enable Portboard to run on macOS, Windows, and Linux with a single codebase

**Key Interfaces** (defined in `platform/types.ts`):
- `IPlatformProvider`: Main provider interface that aggregates all sub-providers
- `IPortProvider`: Port listing and connection counting
- `IProcessProvider`: Process management (kill, metadata, ownership)
- `IIconProvider`: Application icon extraction
- `IApplicationProvider`: IDE/Terminal detection and launching
- `IBrowserProvider`: Browser integration and network URL generation

**Platform Detection & Singleton**:
- `detectPlatform()`: Detects current OS (darwin/win32/linux)
- `getPlatformProvider()`: Static imports for better performance (no lazy loading)
- `getPlatformProviderSingleton()`: Singleton pattern for performance

**Implementation Status**:
- ✅ **macOS** (`platform/macos/`): Full implementation
  - Port detection: `lsof +c 0 -i -P -n | grep LISTEN`
  - Connection counting: Batch `lsof` with PID filtering
  - Process management: `ps`, `kill`, ownership checks
  - Process metadata: Batch operations with `ps`, `lsof -Fpfn` for paths/cwd
  - Icon extraction: `sips` for .icns to PNG conversion
  - IDE/Terminal detection: `mdfind` (Spotlight) with hardcoded fallbacks
  - Browser: `open` command, `os.networkInterfaces()` for network URLs
- ✅ **Linux** (`platform/linux/`): Full implementation
  - Port detection: `lsof +c 0 -i -P -n | grep LISTEN`
  - Connection counting: Batch `lsof -P -n -i` with PID filtering
  - Process metadata: Batch `ps` for CPU/memory/start time, `lsof` for cwd
  - Process kill: `kill` with ownership checks
  - Icon extraction: `.desktop` file parsing with `find` command
  - IDE/Terminal detection: `which` command for 18 IDEs and 9 terminals
  - Docker container shell: `docker exec -it` with terminal-specific handling
  - Browser: `xdg-open` command, `os.networkInterfaces()` for network URLs
- ✅ **Windows** (`platform/windows/`): Full implementation
  - Port detection: `netstat -ano` with batch `wmic` for process info
  - Connection counting: `netstat -ano | findstr "ESTABLISHED"` with port/PID matching
  - Process metadata: Batch `wmic` for ExecutablePath, WorkingSetSize, CreationDate
  - Process kill: `taskkill /PID`
  - Icon extraction: PowerShell with System.Drawing for .exe icons
  - IDE/Terminal detection: `where` command and common installation paths (16 IDEs, 9 terminals)
  - Docker container shell: `docker exec -it` with terminal-specific handling (Windows Terminal, PowerShell, cmd)
  - Browser: `start ""` command, `os.networkInterfaces()` for network URLs
  - Needs testing on Windows VM

**Usage Pattern**:
```typescript
const platformProvider = getPlatformProviderSingleton();

// Port operations
const ports = await platformProvider.portProvider.getListeningPorts();
const connectionCounts = await platformProvider.portProvider.getBatchConnectionCounts(portPidPairs);

// Process operations
await platformProvider.processProvider.killProcess(pid);
const metadata = await platformProvider.processProvider.getBatchProcessMetadata(pidProcessPairs);

// Application operations
const ides = await platformProvider.applicationProvider.detectIDEs();
await platformProvider.applicationProvider.openInIDE(idePath, directoryPath);

// Browser operations
await platformProvider.browserProvider.openURL(url);
const localIP = platformProvider.browserProvider.getLocalIPAddress();
```

**Services Using Platform Providers**:
- `port-service.ts`: Uses `portProvider` and `processProvider` for port listing
- `browser-service.ts`: Uses `browserProvider` for URL operations
- `routes/ports.ts`: Uses `applicationProvider` for IDE/Terminal integration

**Implementation Details**:
- **macOS**: Services like `icon-service.ts` and `ide-detection-service.ts` are macOS-specific implementations used by `MacOSIconProvider` and `MacOSApplicationProvider`
- **Linux**: Full provider implementations with organized file structure (6 files matching macOS):
  - `port-provider.ts` (92 lines): Port detection and connection counting
  - `process-provider.ts` (253 lines): Process management and metadata
  - `icon-provider.ts` (135 lines): .desktop file parsing and icon search
  - `application-provider.ts` (192 lines): IDE/Terminal detection with `which`
  - `browser-provider.ts` (34 lines): Browser integration with `xdg-open`
  - `index.ts` (21 lines): Entry point aggregating all providers
- **Windows**: Full provider implementations with organized file structure (6 files matching macOS/Linux):
  - `port-provider.ts` (115 lines): Port detection with `netstat -ano` and `wmic`
  - `process-provider.ts` (117 lines): Process management with `taskkill` and batch `wmic`
  - `icon-provider.ts` (97 lines): Icon extraction using PowerShell + System.Drawing
  - `application-provider.ts` (343 lines): IDE/Terminal detection with `where` command and common paths (16 IDEs, 9 terminals)
  - `browser-provider.ts` (35 lines): Browser integration with `start ""` command
  - `index.ts` (21 lines): Entry point aggregating all providers

### Backend (Implemented)
- **Framework**: Hono (lightweight web framework)
- **State Management**: Jotai (atomic state management)
- **Data Fetching**: SWR for auto-revalidation
- **UI Components**: shadcn/ui
- **Validation**: Zod
- **Internationalization**: react-i18next with i18next-browser-languagedetector
- **Platform Abstraction**: Cross-platform support via provider pattern

### Implemented Features
1. **Neo Brutalism Design System** (✓ Completed)
   - Custom brutalist component wrappers for shadcn/ui
   - Bold borders (2px), offset shadows (3px), geometric shapes
   - Brutalist color scheme with yellow, cyan, and red accents
   - Custom scrollbar styling matching the design system
   - Dark mode support with theme toggle component
   - Sonner toast notifications with brutalist styling
2. **Port Management**: Display listening ports in a table (✓ Completed)
   - Full process names without truncation (lsof +c 0)
   - Escape sequence decoding (e.g., \x20 to space)
   - Application name extraction from .app bundles
   - **Application icon display** with native .icns extraction and caching (macOS only)
   - Project name detection from package.json for CLI tools
   - Smart command path display (filters out .app bundle internals and truncated paths)
   - **Working directory (cwd) display**: Shows execution context for non-Docker processes (excludes "/" to reduce noise)
   - **Connection status tracking**: Real-time active/idle status with accurate connection count (PID-filtered)
   - **Clean table interface**: Simplified view with essential columns only
   - **Open in Browser button**: Quick access to open port URL in default browser (Actions column)
   - Hover tooltips for quick Protocol and Address info
   - Click-to-open detail modal with full port information
   - Category-based filtering (Development, Database, Web Server, Applications, System, User Apps)
   - Search functionality across ports, processes, and command paths
   - Multi-column sorting with ascending/descending order (Port, Process Name, PID, Connection Status, CPU, Memory)
3. **Process Control**: Kill processes with confirmation dialogs (✓ Completed)
   - **Batch kill functionality**: Select and kill multiple processes at once
     - Checkbox selection for individual ports with brutalist styling
     - "Select All" / "Deselect All" via header checkbox with indeterminate state
     - Visual batch operations toolbar (yellow background, Neo Brutalism style)
     - Batch kill confirmation dialog with detailed process list
     - **Docker-aware batch operations**: Intelligently handles Docker containers
       - Auto-detection of Docker containers in selection
       - Uses `docker stop` / `docker-compose down` instead of killing docker-proxy
       - Smart success messages (e.g., "2 containers stopped, 1 process killed")
     - Four-level warning system:
       - 🔵 Docker info (blue info badge) - informs containers will be stopped gracefully
       - 🔴 System processes (red warning badge)
       - 🟡 Development processes (yellow warning badge)
       - 🟠 Active connections (orange warning badge)
     - Parallel kill execution with `Promise.allSettled`
     - Success/failure count reporting in toast notifications
     - Automatic selection clearing after successful batch kill
   - Ghost button variant for system/development processes (subtle, prevents accidental clicks)
   - Destructive button variant for user processes (prominent red)
   - Category-aware warnings for system and development processes
   - **Self-port protection**: Portboard's own ports (API server + Vite dev server) are protected
     - Runtime port detection via `server-state.ts` (tracks actual server port)
     - Environment variable integration (`VITE_DEV_PORT` for dev server)
     - Cyan PORTBOARD badge on self-ports in table and dialogs
     - Critical warning in kill dialogs: "Will terminate this interface!"
     - Highest priority warning in batch kill dialog
   - Transparent borders with hover effects to maintain Neo Brutalism design consistency
4. **Auto-refresh**: Real-time port monitoring (5s default interval) (✓ Completed)
   - Last updated timestamp display (HH:MM:SS 24-hour format)
   - Scroll position preservation using useRef and useLayoutEffect
   - Synchronous scroll restoration after data updates
5. **Connection Status Tracking** (✓ Completed)
   - Real-time detection of active connections using batch `lsof` processing
   - Accurate server-side connection counting (filtered by PID to avoid double-counting)
   - **Optimized batch processing**: Single `lsof` call for all ports (~1 second load time, 80% improvement)
   - Correct port number detection with `-P` flag (prevents service name confusion like "pdb" → 3033)
   - Local port extraction (server-side only, ignoring client connections)
   - Custom ConnectionStatusIndicator component with lightweight design
   - Active/Idle status with visual indicator (green dot for active, empty dot for idle)
   - Connection count display for active ports
   - Last accessed timestamp tracking
   - Sortable by connection status
6. **Port Detail Modal** (✓ Completed)
   - Click any row to view detailed information
   - Neo Brutalism styled modal with application icon
   - Scrollable content area with flexbox layout (max-h-[90vh])
   - Sticky header, scrollable content (overflow-y-auto flex-1)
   - **Right-aligned scrollbar**: DialogContent uses `pr-0!` to push scrollbar to edge, content sections use `pr-6` for padding
   - Organized sections: Basic Info, Connection Status, Resource Usage, Docker Info, Working Directory, Command Path
   - **Quick Actions** (in Basic Info section):
     - **Open in Browser**: Opens `http://localhost:PORT` in default browser
     - **Copy Network URL**: Copies network-accessible URL (e.g., `http://192.168.1.100:PORT`) to clipboard
       - Uses `os.networkInterfaces()` to detect local IP address
       - Visual feedback with "Copied!" button state (2 seconds)
       - Error toast only on failure (no success toast)
   - **Process start time and uptime**: Shows when process started and how long it's been running (format: "2d 3h", "5h 30m", etc.)
   - **Docker port mapping**: Displays Host:Container format (e.g., "3000:80") for Docker containers
   - **Working directory (cwd)**: Shows process execution context (hidden if "/" to reduce noise)
   - **IDE/Terminal/Finder integration**: Open working directory in Finder, IDEs, or terminals (macOS only)
     - **Three-section dropdown menu**: Organized by category with labels
       - **Finder section**: Quick access to directory in macOS Finder
       - **IDEs section**: 11 supported IDEs (Cursor, VS Code, IntelliJ IDEA family, Sublime, Atom, Zed, etc.)
       - **Terminals section**: 7 supported terminals (Ghostty, iTerm2, Warp, Alacritty, Kitty, Hyper, Terminal)
     - Auto-detection using mdfind (macOS Spotlight) with hardcoded fallback
     - Application icons displayed in dropdown menu (IDEs and Terminals)
     - Clipboard copy functionality with visual feedback
     - **Docker container support**:
       - /// ACTIONS section for Docker containers (replaces /// WORKING DIRECTORY)
       - Project Directory: Open docker-compose project directory in Finder/IDE
       - Container Shell: Open interactive shell inside container with `docker exec -it`
       - Automatic bash/sh detection with fallback
       - Terminal-specific command handling (AppleScript for Terminal/iTerm2)
   - Kill process directly from modal
   - Last updated timestamp in modal footer
7. **Table UI with Resource Monitoring** (✓ Completed)
   - Essential columns: Port, Process Name, PID, Status, CPU, Memory, Actions
   - CPU and Memory columns for real-time performance monitoring
   - Sortable by CPU usage and Memory usage
   - formatMemory() helper: shows "-" for missing data, "~0 MB" for tiny values (cleaner visual)
8. **UI/UX Improvements** (✓ Completed)
   - **Transparent scrollbar background**: Light mode background color changed from white to light gray (oklch(0.97 0 0)) for better visual clarity
   - Scrollbar track remains transparent across both light and dark modes
   - Memory display optimization: `< 0.01 MB` → `~0 MB` for reduced visual noise
   - **Connection Status Indicator refactoring**: Replaced Badge component with dedicated lightweight component
     - Removed dependency on brutalist Badge wrapper
     - Custom green dot indicator for active connections
     - Cleaner visual design with mono font
9. **Internationalization (i18n)** (✓ Completed)
   - react-i18next integration with i18next-browser-languagedetector
   - English and Japanese language support
   - Automatic language detection (localStorage → browser navigator)
   - LocalStorage persistence for user preference
   - Comprehensive translation coverage across all UI components
   - Language toggle component with brutalist select box
   - High-quality Japanese translations with natural UX terminology
10. **Desktop Notifications** (✓ Completed)
    - **Notification toggle**: Bell/BellOff icon button in settings
    - **LocalStorage persistence**: Settings saved via `atomWithStorage` helper
    - **New port detection**: Automatically detects ports opened after initial load
    - **Browser notifications**: Uses Notification API for desktop alerts
    - **Multiple port support**: Groups multiple new ports into single notification
    - **Auto-exclusion**: Portboard's own ports (3033, 3000) are not notified
    - **Permission management**: Handles browser notification permission requests
    - **Test notification**: Shows welcome notification when enabling
    - **Auto-close**: Notifications auto-close after 5 seconds
    - **i18n support**: Notification text respects language preference
    - See [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md) for troubleshooting

### Features to Implement
1. **Port History Tracking**: Track port usage over time with JSON persistence
2. **TUI Mode**: Terminal UI with Ink (interactive mode planned)
3. **Cross-platform CLI/MCP**: Full Windows and Linux support for CLI and MCP

### Security Principles (from plan)
- **Localhost-only binding** by default
- **Docker socket access disabled** by default (explicit `--with-docker` flag required)
- **Own-process-only kills** by default (no sudo/root operations)
- **No telemetry/tracking**

## Directory Structure

```
portboard/
├── src/
│   ├── components/
│   │   ├── brutalist/        # Neo Brutalism component wrappers
│   │   │   ├── button.tsx
│   │   │   ├── checkbox.tsx                # Brutalist checkbox component
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── copy-button.tsx         # Clipboard copy with render props
│   │   │   ├── dropdown-menu.tsx       # Brutalist dropdown menu
│   │   │   ├── select.tsx              # Brutalist select components
│   │   │   ├── collapsible.tsx         # Brutalist collapsible component
│   │   │   ├── tooltip.tsx             # Brutalist tooltip component
│   │   │   └── index.ts
│   │   ├── ui/               # shadcn/ui base components
│   │   ├── port-table/       # Modular port table components
│   │   │   ├── index.tsx                         # Main table orchestrator with batch operations
│   │   │   ├── port-row.tsx                      # Individual port row display with checkbox
│   │   │   ├── port-detail-dialog.tsx            # Port detail modal
│   │   │   ├── kill-dialog.tsx                   # Single kill confirmation dialog
│   │   │   ├── batch-kill-dialog.tsx             # Batch kill confirmation dialog
│   │   │   ├── search-bar.tsx                    # Search input component
│   │   │   └── connection-status-indicator.tsx   # Connection status display
│   │   └── settings/         # Settings components
│   │       ├── language-toggle.tsx               # Language selection component
│   │       └── theme-toggle.tsx                  # Theme toggle component
│   ├── config/               # Configuration files
│   │   ├── api.ts            # API URL configuration with env support
│   │   └── constants.ts      # Frontend constants (TIMING, DOCKER, UI)
│   ├── hooks/                # Custom React hooks
│   │   ├── use-port-filtering.ts # Port filtering logic
│   │   └── use-port-sorting.ts   # Port sorting logic
│   ├── constants/
│   │   └── categories.tsx        # Category definitions & icons
│   ├── locales/              # i18n translation files
│   │   ├── en.json               # English translations
│   │   └── ja.json               # Japanese translations
│   ├── styles/
│   │   └── brutalism.css         # Neo Brutalism design system CSS
│   ├── lib/
│   │   ├── api.ts                # API functions
│   │   ├── atom-with-storage.ts  # Jotai localStorage persistence helper
│   │   ├── i18n.ts               # i18next configuration
│   │   ├── notifications.ts      # Desktop notification utilities
│   │   └── utils.ts              # Utility functions (cn helper)
│   ├── store/
│   │   └── port-store.ts         # Jotai state atoms (notifications, theme, batch kill, etc.)
│   ├── types/
│   │   └── port.ts               # TypeScript type definitions
│   ├── App.tsx                   # Main React component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles with Tailwind CSS
├── server/
│   ├── config/
│   │   ├── constants.ts          # Backend constants with env support (SERVER_CONFIG, TIMING, DOCKER, ICON, NETWORK)
│   │   └── server-state.ts       # Runtime state management (server port tracking, protected ports)
│   ├── index.ts                  # Hono server entry point (development only, with dotenv/config import)
│   ├── cli/                      # CLI implementation
│   │   ├── index.ts                  # Main CLI entry point with commander.js
│   │   ├── commands/
│   │   │   ├── list.ts               # List ports command
│   │   │   ├── info.ts               # Port info command
│   │   │   ├── kill.ts               # Kill process command (port/PID auto-detection)
│   │   │   ├── docker.ts             # Docker operations (ls/stop/logs)
│   │   │   ├── open.ts               # Open in browser command
│   │   │   └── serve.ts              # Web UI server command (migrated from cli.ts)
│   │   └── utils/
│   │       ├── banner.ts             # Figlet + gradient startup banner
│   │       ├── formatters.ts         # Memory/CPU/uptime formatting
│   │       └── output.ts             # Colored output helpers (chalk)
│   ├── mcp/                      # MCP Server implementation
│   │   ├── index.ts                  # MCP entry point (stdio transport)
│   │   ├── server.ts                 # MCP Server core
│   │   └── tools/
│   │       ├── list-ports.ts         # List ports MCP tool
│   │       ├── kill-process.ts       # Kill process MCP tool
│   │       ├── port-info.ts          # Port info MCP tool
│   │       ├── docker-list.ts        # Docker list MCP tool
│   │       ├── docker-stop.ts        # Docker stop MCP tool
│   │       └── docker-logs.ts        # Docker logs MCP tool
│   ├── routes/
│   │   ├── ports.ts              # Port listing and kill endpoints
│   │   │                         # POST /api/ports/open-in-browser - Open port URL in browser
│   │   │                         # GET /api/ports/network-url/:port - Get network URL
│   │   ├── icons.ts              # Icon serving endpoint
│   │   └── logs.ts               # Docker container logs endpoint (GET /api/logs/:containerId)
│   └── services/                 # Modular service layer
│       ├── platform/                 # Platform abstraction layer
│       │   ├── index.ts                  # Platform provider factory & singleton
│       │   ├── types.ts                  # Platform interface definitions
│       │   ├── macos/                    # macOS implementations
│       │   │   ├── index.ts                  # MacOSPlatformProvider
│       │   │   ├── port-provider.ts          # Port management (lsof)
│       │   │   ├── process-provider.ts       # Process management (ps, kill)
│       │   │   ├── icon-provider.ts          # Icon extraction (sips)
│       │   │   ├── application-provider.ts   # IDE/Terminal detection (mdfind)
│       │   │   └── browser-provider.ts       # Browser & network (open, networkInterfaces)
│       │   ├── linux/                    # Linux implementations
│       │   │   ├── index.ts                  # LinuxPlatformProvider
│       │   │   ├── port-provider.ts          # Port management (lsof)
│       │   │   ├── process-provider.ts       # Process management (ps, kill)
│       │   │   ├── icon-provider.ts          # Icon extraction (.desktop files)
│       │   │   ├── application-provider.ts   # IDE/Terminal detection (which)
│       │   │   └── browser-provider.ts       # Browser & network (xdg-open, networkInterfaces)
│       │   └── windows/                  # Windows implementations
│       │       ├── index.ts                  # WindowsPlatformProvider
│       │       ├── port-provider.ts          # Port management (netstat)
│       │       ├── process-provider.ts       # Process management (wmic, taskkill)
│       │       ├── icon-provider.ts          # Icon extraction (PowerShell + System.Drawing)
│       │       ├── application-provider.ts   # IDE/Terminal detection (where)
│       │       └── browser-provider.ts       # Browser & network (start, networkInterfaces)
│       ├── port-service.ts           # Main port API (uses platform providers)
│       ├── connection-service.ts     # Connection count tracking
│       ├── browser-service.ts        # Browser integration & network URL generation (uses platform providers)
│       ├── unix-port-parser.ts       # lsof output parsing
│       ├── process-metadata-service.ts # Process metadata collection
│       ├── category-service.ts       # Process categorization logic
│       ├── docker-service.ts         # Docker port mapping detection
│       ├── icon-service.ts           # Icon extraction and caching (macOS implementation)
│       └── ide-detection-service.ts  # IDE/Terminal auto-detection (macOS implementation)
├── public/                       # Static assets (Vite build output, git-ignored)
├── dist/                         # Server build output (TypeScript compilation, git-ignored)
├── package.json                  # Dependencies and scripts (npm package: portbd)
├── tsconfig.json                 # Root TypeScript configuration
├── tsconfig.app.json             # Frontend TypeScript configuration
├── tsconfig.node.json            # Node.js tooling TypeScript configuration
├── tsconfig.server.json          # Server build TypeScript configuration
├── vite.config.ts                # Vite configuration (outputs to public/)
├── biome.json                    # Biome configuration
├── .env.example                  # Environment variables template
└── .gitignore                    # Git ignore rules (includes dist/, public/)
```

## Code Architecture

### Modular Design Principles

The codebase follows a **modular architecture** with strict separation of concerns:

**Frontend (React):**
- **Components**: Organized by feature (port-table/) with single-responsibility components
  - Each component < 150 lines
  - UI logic separated from business logic
- **Hooks**: Reusable logic extracted into custom hooks
  - `use-port-filtering.ts`: Filter ports by category/search
  - `use-port-sorting.ts`: Sort ports by multiple columns (port, processName, pid, connectionStatus, cpuUsage, memoryUsage)
- **Constants**: Shared definitions centralized
  - `categories.tsx`: Category metadata & icons

**Backend (Hono):**
- **Services**: Modular service layer with focused responsibilities
  - `port-service.ts` (~175 lines): Main orchestrator, platform detection
  - `connection-service.ts` (~94 lines): Batch connection count tracking with optimized parsing
  - `unix-port-parser.ts` (~52 lines): lsof output parsing
  - `process-metadata-service.ts` (~545 lines): Batch process metadata collection with parallel operations
  - `category-service.ts` (~130 lines): Process categorization
    - Categorizes processes into: system, development, database, web-server, applications, user
    - **applications**: macOS .app bundle apps (Discord, Chrome, etc.) - detected by `.app` in commandPath
    - **user**: CLI tools, scripts, Node.js apps without .app bundle
    - Command path only displayed in table for "user" category
  - `docker-service.ts` (~150 lines): Docker integration
    - `getDockerPortMappings()`: Docker container port mapping detection
    - `stopDockerContainer()`: Stop individual Docker containers
    - `stopDockerCompose()`: Stop docker-compose projects
    - `getDockerLogs()`: Fetch container logs with line count and timestamp filtering
  - `icon-service.ts`: Icon extraction & caching
  - `ide-detection-service.ts` (~427 lines): IDE/Terminal auto-detection and launching
    - Dynamic app detection using macOS Spotlight (mdfind)
    - Hardcoded paths as fallback for common installations
    - Icon extraction for IDEs and terminals
    - Special handling for different terminal apps (Ghostty, iTerm2, etc.)
    - `openContainerShell()`: Docker container shell access
      - Uses `docker exec -it <container> sh/bash` with automatic shell detection
      - AppleScript support for Terminal and iTerm2
      - Generic fallback for other terminal apps
    - Caching for performance optimization

**State Management:**
- **Jotai atoms**: Atomic state management for React
- **`atomWithStorage` helper**: Custom utility for LocalStorage persistence
  - Located at [src/lib/atom-with-storage.ts](src/lib/atom-with-storage.ts)
  - Automatically syncs Jotai atoms with LocalStorage
  - Prefix: `portboard:` namespace for all localStorage keys
  - Type-safe with TypeScript generics
  - SSR-safe (handles `typeof window === "undefined"`)
  - Used by: notification settings, theme settings
  - Example usage:
    ```typescript
    export const notificationsEnabledAtom = atomWithStorage("notifications-enabled", false);
    export const themeAtom = atomWithStorage<"light" | "dark">("theme", "light");
    ```

**Benefits:**
- 📖 **Readable**: Each file has a clear, single purpose
- 🧪 **Testable**: Small units are easy to test in isolation
- 🔧 **Maintainable**: Changes are localized and easy to understand
- 🤖 **AI-friendly**: File names and structure are self-documenting

## Working with This Codebase

### Before Implementing Features
1. The project emphasizes **Phase 1 MVP** focus: core port listing, process killing, and basic UI with shadcn/ui
2. Security considerations are paramount - always default to safe operations

### Code Style
- **TypeScript strict mode** is enabled - all code must be fully typed
- **Biome** is used for linting and formatting - run `npm run check` before committing
- **React Hooks rules** are enforced via Biome
- **React Refresh** requirements apply - components should follow HMR best practices
- The project uses **ES2022** target with **ESNext** modules
- Biome configuration is in [biome.json](biome.json)
- **JSX comments**: Use `{"/// text"}` syntax for text that looks like comments (e.g., terminal-style prefixes) to avoid Biome lint errors

### Design System Guidelines
- **Preserve shadcn/ui components**: Never modify files in `src/components/ui/` directly
- **Wrapper pattern**: Create brutalist wrappers in `src/components/brutalist/` to apply custom styling
- **Brutalist styling**: Use 2px borders, 3px offset shadows, bold typography, and high-contrast colors
- **Color palette**: Yellow (#FFD93D), Cyan (#6BCF7E), Red (#FF6B6B) for accents
- **Dark mode**: All components should support dark mode via CSS variables
- **Button variants**:
  - `default`: Yellow background (primary actions)
  - `destructive`: Red background (dangerous actions like killing user processes)
  - `outline`: White/Black background (secondary actions)
  - `ghost`: Transparent with subtle hover (for dangerous but less common actions like killing system processes)
  - Use transparent borders (`border-2 border-transparent`) for ghost buttons to prevent layout shift on hover

### Current Setup Status
**Completed:**
- ✓ Tailwind CSS 4 with Vite plugin
- ✓ shadcn/ui base components (Button, Table, Dialog, DropdownMenu, Checkbox, Tooltip)
- ✓ Custom UI components
  - ✓ CopyButton with render props pattern
  - ✓ ConnectionStatusIndicator (lightweight Active/Idle display)
  - ✓ Brutalist Checkbox component with Neo Brutalism styling
  - ✓ Brutalist Collapsible component for expandable sections
  - ✓ Brutalist Tooltip component for contextual UI hints
- ✓ Sonner toast notifications with brutalist styling
- ✓ Neo Brutalism design system
  - ✓ Custom brutalist component wrappers
  - ✓ Brutalist color scheme and styling
  - ✓ Custom scrollbar with theme support
  - ✓ Dark mode with toggle component
- ✓ Internationalization (i18n)
  - ✓ react-i18next with browser language detection
  - ✓ English and Japanese translations
  - ✓ LocalStorage persistence
  - ✓ Language toggle in settings/ folder
- ✓ Path alias (`@`) for cleaner imports
- ✓ Hono backend server
- ✓ Jotai for state management (atoms-based)
- ✓ SWR for data fetching
- ✓ Phase 1 MVP implementation
- ✓ Enhanced process name display with application identification
- ✓ Application icon display (macOS only)
  - ✓ Native .icns extraction from .app bundles using `sips`
  - ✓ Icon caching in `/tmp/portboard-icons/`
  - ✓ Support for nested .app bundles (e.g., Cursor Helper)
  - ✓ Fallback to category icons on error
- ✓ Smart command path display (filters .app internals and truncated paths)
- ✓ Ghost button variant for dangerous actions (system/development processes)
- ✓ Category-based filtering
- ✓ Search functionality (port, process name, command path)
- ✓ Multi-column sorting with ascending/descending order toggle
- ✓ Connection status tracking with active/idle detection
  - ✓ **Performance optimization**: Batch processing for ~1 second load time (80% improvement from initial 5 seconds)
  - ✓ Single `lsof` call for all connection counts using `getBatchConnectionCounts()`
  - ✓ Correct port number detection with `-P` flag (prevents "pdb" → 3033 confusion)
  - ✓ Local port extraction (server-side only, filters out client connections)
- ✓ CPU and Memory columns in table for resource monitoring
  - ✓ Sortable by CPU usage and Memory usage
  - ✓ formatMemory() helper with smart formatting
  - ✓ Batch resource usage collection with single `ps` call
- ✓ Auto-refresh improvements
  - ✓ Last updated timestamp display (HH:MM:SS format)
  - ✓ Scroll position preservation using useLayoutEffect
  - ✓ Timestamp shown in both main table header and detail modal footer
- ✓ Detail modal improvements
  - ✓ Scrollable content area with flexbox layout (max-h-[90vh] flex flex-col)
  - ✓ Sticky header, scrollable content (overflow-y-auto flex-1)
  - ✓ Right-aligned scrollbar positioning (DialogContent pr-0!, sections pr-6)
  - ✓ Process start time and uptime display
  - ✓ Working directory (cwd) section
  - ✓ Docker port mapping (Host:Container format)
- ✓ Enhanced process metadata
  - ✓ Working directory (cwd) collection via lsof
  - ✓ Process start time collection via ps lstart
  - ✓ Uptime calculation and formatting (human-readable: "2d 3h", "5h 30m")
- ✓ UI polish
  - ✓ Memory display: `< 0.01 MB` → `~0 MB` for cleaner visuals
  - ✓ Light mode background optimization (oklch(0.97 0 0))
  - ✓ Scrollbar positioning fixes in detail modal
- ✓ IDE/Terminal integration (macOS only)
  - ✓ Auto-detection service with mdfind (Spotlight) and hardcoded fallback
  - ✓ CopyButton component with render props pattern
  - ✓ DropdownMenu brutalist wrapper
  - ✓ Icon extraction and display for IDEs and terminals
  - ✓ Support for 11 IDEs and 7 terminal applications
  - ✓ Special handling for terminal-specific commands (Ghostty, iTerm2, etc.)
  - ✓ "Open With..." dropdown in working directory section
  - ✓ Clipboard copy functionality
  - ✓ Docker container support
    - ✓ Context-aware UI (/// ACTIONS for Docker, /// WORKING DIRECTORY for non-Docker)
    - ✓ docker-compose project directory detection and IDE integration
    - ✓ Container shell access with `docker exec -it`
    - ✓ Automatic bash/sh detection
    - ✓ AppleScript integration for Terminal and iTerm2
- ✓ **Docker Container Logs Viewer** (Complete implementation)
  - ✓ GET /api/logs/:containerId endpoint with `--since` parameter support (server/routes/logs.ts)
  - ✓ Auto-fetch logs when collapsible is opened (controlled state with useRef)
  - ✓ BrutalistCollapsible component with controlled/uncontrolled state support
  - ✓ **Configurable line count**: Brutalist Select component for 20/50/100/200 lines
  - ✓ **Follow mode**: Auto-refresh logs every 5 seconds with incremental fetching
    - ✓ Uses `docker logs --since <timestamp>` to fetch only new logs (no duplicates)
    - ✓ Appends new logs to existing logs in follow mode
    - ✓ Direct interval control with useRef (no useEffect dependency issues)
    - ✓ Play/Pause toggle with clean start/stop functions
  - ✓ Manual refresh button with loading state (RefreshCw icon with spin animation)
  - ✓ Log level detection (error, warn, info) with color coding
  - ✓ Per-container log fetching using container ID (correct docker-compose handling)
  - ✓ Collapsible log viewer with brutalist styling
  - ✓ Loading states and error handling
  - ✓ Component key-based reset (`key={detailDialogPort?.port}`) for correct per-port state
  - ✓ Dynamic title showing current line count ("/// DOCKER LOGS (Last N lines)")
  - ✓ **Architecture**: Direct control flow without useEffect
    - ✓ `handleFollowModeToggle()`: Direct follow mode control
    - ✓ `handleLogsCollapsibleOpenChange()`: Direct collapsible state control
    - ✓ `handleLogLinesChange()`: Direct line count change handling
    - ✓ `startFollowMode()` / `stopFollowMode()`: Explicit interval management
- ✓ **Docker Container Management** (Complete implementation)
  - ✓ Automatic detection of Docker container ports
  - ✓ Redesigned kill dialog with Docker-specific UI
  - ✓ Orange warning about docker-proxy kill risks
  - ✓ Stop Container functionality (POST /api/ports/stop-container)
  - ✓ Stop Compose Project functionality (POST /api/ports/stop-compose)
  - ✓ Three action levels: Recommended (Stop Container/Compose) + Advanced (Kill Process)
  - ✓ Server-side docker stop and docker-compose down execution
  - ✓ Toast notifications for Docker operations
- ✓ **Browser Integration** (Complete implementation)
  - ✓ Backend service: browser-service.ts with cross-platform support
    - ✓ `getLocalIPAddress()`: Detects local IP using `os.networkInterfaces()`
    - ✓ `getNetworkURL()`: Generates network-accessible URLs (e.g., http://192.168.1.100:3000)
    - ✓ `openInBrowser()`: Opens URLs in default browser (macOS: `open`, Windows: `start`, Linux: `xdg-open`)
  - ✓ API endpoints:
    - ✓ POST /api/ports/open-in-browser: Opens port URL in default browser
    - ✓ GET /api/ports/network-url/:port: Returns network URL for a port
  - ✓ Table integration: "Open in Browser" button in Actions column (ExternalLink icon)
  - ✓ Detail modal integration: Two Quick Action buttons in Basic Info section
    - ✓ "Open in Browser": Yellow button, opens http://localhost:PORT
    - ✓ "Copy Network URL": Outline button, copies network URL with visual feedback
  - ✓ UX polish: Error-only toasts (success feedback via visual state changes)
- ✓ **Batch kill functionality** (Complete implementation)
  - ✓ Checkbox selection for individual ports with brutalist styling
  - ✓ "Select All" / "Deselect All" via header checkbox with indeterminate state
  - ✓ Visual batch operations toolbar (yellow #FFD93D background)
  - ✓ Selected count display (e.g., "3 ports selected")
  - ✓ Batch kill confirmation dialog with detailed process list
  - ✓ **Docker-aware batch operations**: Intelligently handles Docker containers
    - ✓ Auto-detection of Docker containers in selection (`hasDockerPorts`)
    - ✓ Uses `stopDockerCompose()` for compose projects
    - ✓ Uses `stopDockerContainer()` for standalone containers
    - ✓ Uses `killProcess()` for regular processes
    - ✓ Smart success messages (e.g., "2 containers stopped, 1 process killed")
    - ✓ Dynamic dialog title: "Stop/Kill N Items" vs "Kill N Processes"
  - ✓ Five-level warning system:
    - ✓ **Cyan critical badge for self-ports** (Portboard server - will terminate interface!)
    - ✓ Blue info badge for Docker containers (informs graceful stop)
    - ✓ Red warning for system processes
    - ✓ Yellow warning for development processes
    - ✓ Orange warning for active connections
  - ✓ Parallel kill execution with `Promise.allSettled`
  - ✓ Success/failure count reporting in toast notifications
  - ✓ Automatic selection clearing after successful batch kill
  - ✓ State management with Jotai atoms (selectedPortsAtom, etc.)
- ✓ **Self-port protection** (Complete implementation)
  - ✓ Runtime port tracking via `server-state.ts` module
    - ✓ `setServerPort()`: Called on server startup to record actual port
    - ✓ `getProtectedPorts()`: Returns array of protected ports (API + Vite dev)
  - ✓ Environment variable integration
    - ✓ `VITE_DEV_PORT` read from `.env` via `dotenv/config` in server entry point
    - ✓ Centralized in `SERVER_CONFIG.DEV_SERVER_PORT` constant
  - ✓ Visual indicators
    - ✓ Cyan PORTBOARD badge on self-ports in table rows
    - ✓ Badge shown in batch kill dialog port list
  - ✓ Kill dialog warnings
    - ✓ Highest priority warning: "This is the Portboard server itself!"
    - ✓ Explains consequence: "Will terminate Portboard and close this interface"
    - ✓ Batch kill dialog: "CRITICAL: Includes Portboard server" badge
  - ✓ Type system support: `isSelfPort?: boolean` field in PortInfo interface
- ✓ **Responsive Design** (Complete implementation)
  - ✓ Two-tier responsive breakpoint system (< 1024px / ≥ 1024px)
  - ✓ Small screens (< 1024px): Shows Port, Process Name, Actions only
  - ✓ Large screens (≥ 1024px): Shows all columns (PID, Status, CPU, Memory)
  - ✓ Open in Browser button hidden on small screens (< 640px)
  - ✓ Text truncation for long paths (cwd, Docker compose files) using `line-clamp-1`
  - ✓ Smooth width transitions without horizontal scrolling
  - ✓ Layout width changed from `container` to `max-w-5xl` for consistent behavior
9. **Internationalization (i18n)** (✓ Completed)
   - ✓ react-i18next integration with i18next-browser-languagedetector
   - ✓ English and Japanese language support
   - ✓ Automatic language detection (localStorage → browser navigator)
   - ✓ LocalStorage persistence for user preference
   - ✓ Comprehensive translation coverage across all UI components:
     - ✓ App title and subtitle
     - ✓ Table headers, stats, and messages
     - ✓ Search and filter labels
     - ✓ Button labels and actions
     - ✓ All dialog content (kill, batch kill, port detail)
     - ✓ Connection status terminology
     - ✓ Port row components
     - ✓ Toast notifications and error messages
   - ✓ Language toggle component with brutalist select box
     - ✓ Globe icon with visible language label (EN/日本語)
     - ✓ Dropdown selection for easy language switching
     - ✓ Sized to match theme toggle for UI consistency
   - ✓ Translation interpolation support for dynamic content
   - ✓ High-quality Japanese translations with natural UX terminology
   - ✓ Component organization: language-toggle and theme-toggle in settings/ folder

**Future Additions:**
- Docker Container Logs enhancements:
  - Log search/filtering (deferred to Phase 3)
- Batch kill enhancements:
  - Quick select filters (All Idle, All Development, High CPU)
  - Port range selection (e.g., 3000-3010)
  - Signal selection (SIGTERM/SIGKILL/SIGINT)
- Cross-platform support for IDE/Terminal integration (Windows, Linux)
- Cross-platform icon support (Windows: .ico, Linux: .desktop)
- Port history tracking with JSON persistence
- Docker and docker-compose configuration
- CLI mode
- Additional port filtering features

## Additional Notes

- Phase 1 MVP is now complete with all core features implemented
- The project emphasizes being an **open-source alternative** to closed-source port management tools due to security concerns with docker.sock access
