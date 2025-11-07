# Portboard

An open-source, browser-based port management dashboard for developers.

## Overview

**Portboard** is a security-first port management tool built with modern web technologies. Inspired by tools like pgweb and Drizzle Studio, it provides a clean web interface for monitoring listening ports and managing processes on your local machine.

### Key Features

- 🔍 **Enhanced Port Monitoring**: Real-time display with intelligent process identification
  - Full process names without truncation
  - Application name extraction from macOS .app bundles
  - **Application icon display** with native .icns extraction and caching
  - Project name detection from package.json for CLI tools
  - Smart command path display (filters out unhelpful truncated paths)
  - **Connection status tracking**: Real-time display of active connections vs idle ports
    - Accurate server-side connection counting (filtered by PID)
    - Active/Idle status badges with connection count
  - **Clean table interface**: Simplified view showing only essential information
    - Core columns: Port, Process Name, PID, Status, Actions
    - Hover tooltips for quick Protocol and Address info
    - Click rows to open detailed modal with full information
  - Category-based filtering (Development, Database, Web Server, System, User Apps)
  - Search functionality across ports, processes, and commands
  - Multi-column sorting (Port, Process Name, PID, Connection Status)
- ⚡ **Smart Process Control**: Kill processes with confirmation dialogs
  - Subtle ghost buttons for system/development processes to prevent accidental kills
  - Destructive red buttons for user processes
  - Category-aware warnings in confirmation dialogs
- 🔄 **Auto-refresh**: Real-time monitoring with 5s interval
- 🎨 **Neo Brutalism Design**: Bold, high-contrast UI with distinctive visual style
  - Custom brutalist components wrapping shadcn/ui
  - Strong borders, offset shadows, and geometric shapes
  - Brutalist color scheme (yellow, cyan, red accents)
  - Custom scrollbar styling
  - Sonner toast notifications with brutalist styling
- 🌙 **Dark Mode**: Full dark mode support with theme toggle
- 🔒 **Security-First**: Localhost-only binding by default, no telemetry

### Security Principles

- **Localhost-only** binding by default
- **Docker socket access disabled** by default (explicit opt-in required)
- **Own-process-only kills** by default (no sudo/root operations)
- **No telemetry or tracking**

## Tech Stack

### Frontend
- **React 19.1.1** with TypeScript
- **Vite 7.1.7** for build tooling
- **Tailwind CSS 4** via `@tailwindcss/vite`
- **shadcn/ui** for UI components
- **React Compiler** for automatic optimization

### Backend & State
- **Hono** - Lightweight web framework
- **Jotai** - Atomic state management
- **SWR** - Data fetching with auto-revalidation
- **Sonner** - Toast notifications
- **Zod** - Runtime validation

### Development Tools
- **TypeScript 5.9** with strict mode
- **Biome 2.3.4** for linting and formatting
- **Bun** runtime (with Node.js fallback)

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/portboard.git
cd portboard

# Install dependencies
npm install
# or
bun install
```

### Development

```bash
# Start the development server
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:5173` (or the next available port).

### Building for Production

```bash
# Build the application
npm run build
# or
bun run build

# Preview the production build
npm run preview
# or
bun preview
```

## Development Commands

```bash
# Linting
npm run lint          # Run Biome linter
npm run format        # Format code with Biome
npm run check         # Lint + format with auto-fix

# Type checking
npm run typecheck     # Run TypeScript type checker
```

## Project Structure

```
portboard/
├── src/
│   ├── components/
│   │   ├── brutalist/        # Neo Brutalism component wrappers
│   │   │   ├── button.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── sonner.tsx
│   │   │   └── index.ts
│   │   ├── ui/               # shadcn/ui base components
│   │   ├── port-table/       # Port table components
│   │   │   ├── index.tsx              # Main table component
│   │   │   ├── port-row.tsx           # Individual port row
│   │   │   ├── port-detail-dialog.tsx # Port detail modal
│   │   │   ├── kill-dialog.tsx        # Kill confirmation dialog
│   │   │   └── search-bar.tsx         # Search input
│   │   └── theme-toggle.tsx
│   ├── hooks/
│   │   ├── use-port-filtering.ts # Port filtering logic
│   │   └── use-port-sorting.ts   # Port sorting logic
│   ├── constants/
│   │   └── categories.tsx        # Category definitions & icons
│   ├── styles/
│   │   └── brutalism.css         # Neo Brutalism design system
│   ├── lib/
│   │   ├── api.ts                # API functions
│   │   └── utils.ts              # Utility functions
│   ├── store/
│   │   └── port-store.ts         # Jotai state atoms
│   ├── types/
│   │   └── port.ts               # TypeScript types
│   ├── App.tsx                   # Main component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
├── server/
│   ├── index.ts                  # Hono server entry
│   ├── routes/
│   │   ├── ports.ts              # Port endpoints
│   │   └── icons.ts              # Icon serving endpoint
│   └── services/                 # Modular services
│       ├── port-service.ts           # Main port API
│       ├── connection-service.ts     # Connection tracking
│       ├── unix-port-parser.ts       # lsof output parsing
│       ├── process-metadata-service.ts # Process metadata
│       ├── category-service.ts       # Process categorization
│       ├── docker-service.ts         # Docker integration
│       └── icon-service.ts           # Icon extraction & caching
├── public/                       # Static assets
├── package.json                  # Dependencies
├── vite.config.ts                # Vite configuration
└── biome.json                    # Biome configuration
```

## Roadmap

### Phase 1: MVP (✅ Completed)
- [x] Project setup with Vite + React + TypeScript
- [x] Tailwind CSS 4 integration
- [x] shadcn/ui setup (Button, Table, Dialog, Tooltip, Badge)
- [x] Neo Brutalism design system implementation
  - [x] Custom brutalist component wrappers
  - [x] Brutalist color scheme and styling
  - [x] Custom scrollbar styling
  - [x] Dark mode support with theme toggle
  - [x] Sonner toast notifications with brutalist styling
- [x] Port listing UI with enhanced process information
- [x] Intelligent process name display
  - [x] Full process names without truncation (lsof +c 0)
  - [x] Escape sequence decoding
  - [x] Application name extraction from .app bundles
  - [x] Application icon display with native .icns extraction
  - [x] Project name detection from package.json
  - [x] Smart command path display with filtering
- [x] Smart process kill functionality
  - [x] Ghost button variant for system/development processes
  - [x] Destructive button variant for user processes
  - [x] Confirmation dialogs with category-aware warnings
  - [x] Category-based filtering
  - [x] Search functionality (port, process name, command path)
  - [x] Multi-column sorting with ascending/descending order
- [x] Connection status tracking
  - [x] Real-time detection of active connections using lsof
  - [x] Accurate server-side connection counting (PID-filtered)
  - [x] Active/Idle status badges with connection count
  - [x] Sortable connection status column
- [x] Simplified table interface with detail modal
  - [x] Minimal columns for cleaner view
  - [x] Hover tooltips for quick Protocol/Address info
  - [x] Click-to-open detail modal with full information
  - [x] Application icons in modal titles
- [x] Auto-refresh (5s interval)
- [x] Hono backend server
- [x] Jotai state management

### Phase 1.5: MCP Server (🚧 Planned)

**Goal**: Enable port management from AI-powered development tools (Claude Code, Cursor, Codex, etc.)

**Architecture**: Hybrid approach with shared core logic

```
portboard/
├── server/
│   ├── core/              # Shared core logic (NEW)
│   │   ├── port-manager.ts   # lsof execution, parsing, process management
│   │   └── types.ts          # Common type definitions
│   ├── index.ts           # Hono API server (for GUI)
│   └── mcp.ts             # MCP server (for AI editors, standalone)
```

**Features**:
- [ ] `list_ports`: Retrieve list of listening ports
- [ ] `kill_process`: Kill process with confirmation
- [ ] `get_port_info`: Get detailed information for specific port

**Distribution**:
- npm package: `@portboard/mcp-server` or `portboard-mcp`
- Standalone operation (no Hono server required)

**Benefits**:
- **Code reuse**: Shared logic between GUI/CLI/MCP
- **Standalone**: MCP server runs independently
- **Consistency**: Same data across all interfaces

### Phase 2: Enhanced Features
- [x] Application icon display (macOS only)
  - [x] Native .icns extraction from .app bundles
  - [x] Icon caching in /tmp for performance
  - [x] Fallback to category icons on error
  - [x] Support for nested .app bundles (e.g., Cursor Helper)
  - [ ] Cross-platform support (Windows: .ico, Linux: .desktop)
- [x] Connection status tracking
  - [x] Real-time active connection detection
  - [x] Active/Idle status display with connection count
  - [x] Last accessed timestamp tracking
- [ ] Docker container port monitoring (opt-in)
- [ ] Configurable auto-refresh intervals
- [ ] Port history tracking with JSON persistence
- [ ] Process resource usage monitoring
- [ ] Export functionality (CSV, JSON)

### Phase 3: CLI & Distribution
- [ ] Standalone CLI commands
- [ ] Binary distribution
- [ ] Auto-updater


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)

## Project Status

✅ **Phase 1 MVP Complete** - Core port management features are fully functional! The dashboard can monitor listening ports, display process information, and kill processes with confirmation dialogs.

---

**Note**: This project was formerly known as "Portman" but has been renamed to "Portboard".
