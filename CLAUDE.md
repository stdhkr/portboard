# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Portboard** (formerly Portman) is an open-source, browser-based port management tool built with React, TypeScript, and Vite. The project features a distinctive Neo Brutalism design system and provides a full-featured dashboard for managing ports and processes.

Key points:
- **Goal**: Build a pgweb/Drizzle Studio-like web dashboard for managing ports and processes
- **Design**: Neo Brutalism UI with bold borders, offset shadows, and high-contrast colors
- **Security-first**: Default localhost binding, explicit opt-in for Docker socket access, own-process-only kills by default
- **Multi-phase approach**: Starting with Bun + Hono + React, potentially migrating to Go + Wails later

## Development Commands

### Running the Development Server
```bash
npm run dev
# or
bun dev
```
Starts Vite dev server with HMR (Hot Module Replacement).

### Building for Production
```bash
npm run build
# or
bun run build
```
Compiles TypeScript and builds the application for production.

### Linting and Formatting
```bash
npm run lint
# or
bun run lint
```
Runs Biome linter on all TypeScript/TSX files in src/.

```bash
npm run format
# or
bun run format
```
Formats code using Biome.

```bash
npm run check
# or
bun run check
```
Runs Biome check (lint + format) and applies fixes.

```bash
npm run typecheck
# or
bun run typecheck
```
Runs TypeScript type checking without emitting files.

### Preview Production Build
```bash
npm run preview
# or
bun preview
```
Locally preview the production build.

## Technology Stack

### Core Technologies
- **Runtime**: Bun (with Node.js fallback via npm)
- **Frontend**: React 19.1.1 with TypeScript
- **Build Tool**: Vite 7.1.7
- **Compiler**: React Compiler (babel-plugin-react-compiler) - enabled for automatic optimization

### Development Tools
- **TypeScript**: ~5.9.3 with strict mode enabled
- **Biome**: 2.3.4 for linting and formatting

## Architecture Notes

### React Compiler
The React Compiler is enabled in this project via [vite.config.ts](vite.config.ts). This experimental feature automatically optimizes React components, but may impact dev and build performance. See the React Compiler [documentation](https://react.dev/learn/react-compiler) for details.

### TypeScript Configuration
The project uses two TypeScript configurations:
- [tsconfig.app.json](tsconfig.app.json): Application code configuration with strict mode
- [tsconfig.node.json](tsconfig.node.json): Node.js tooling configuration
- [tsconfig.json](tsconfig.json): Root configuration that references both

### Styling
- **Tailwind CSS 4**: Installed via `@tailwindcss/vite` plugin
  - CSS import in [src/index.css](src/index.css): `@import "tailwindcss";`
  - Vite plugin configured in [vite.config.ts](vite.config.ts)
  - Custom theme variables defined using `@theme inline` in index.css
  - Dark mode support via `.dark` class with custom variant
- **Neo Brutalism Design System**: Custom design system at [src/styles/brutalism.css](src/styles/brutalism.css)
  - Color scheme: Yellow (#FFD93D), Cyan (#6BCF7E), Red (#FF6B6B)
  - 2-3px borders with offset shadows (3px standard)
  - Custom scrollbar styling with theme support
  - CSS variables for light/dark mode
- **shadcn/ui**: Base components wrapped with brutalist styling
  - Original components in [src/components/ui/](src/components/ui/)
  - Brutalist wrappers in [src/components/brutalist/](src/components/brutalist/)
  - Button, Table, Dialog, Badge components available
  - Toast notifications via Sonner with brutalist styling
  - Dependencies: `@radix-ui/react-slot`, `@radix-ui/react-dialog`, `@radix-ui/react-tooltip`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`
  - Path alias `@` configured to resolve to `./src` directory
  - Animation support via `tw-animate-css` package

## Architecture

### Backend (Implemented)
- **Framework**: Hono (lightweight web framework)
- **State Management**: Jotai (atomic state management)
- **Data Fetching**: SWR for auto-revalidation
- **UI Components**: shadcn/ui
- **Validation**: Zod

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
   - **Connection status tracking**: Real-time active/idle status with connection count
   - Category-based filtering (Development, Database, Web Server, System, User Apps)
   - Search functionality across ports, processes, and command paths
   - Multi-column sorting with ascending/descending order (Port, Process Name, PID, Protocol, Address, Connection Status)
3. **Process Control**: Kill processes with confirmation dialogs (✓ Completed)
   - Ghost button variant for system/development processes (subtle, prevents accidental clicks)
   - Destructive button variant for user processes (prominent red)
   - Category-aware warnings for system and development processes
   - Transparent borders with hover effects to maintain Neo Brutalism design consistency
4. **Auto-refresh**: Real-time port monitoring (5s default interval) (✓ Completed)
5. **Enhanced UI**: Full command path tooltips on hover (✓ Completed)
6. **Connection Status Tracking** (✓ Completed)
   - Real-time detection of active connections using `lsof -i :PORT | grep ESTABLISHED`
   - Active/Idle status badges with color coding (green for active, gray for idle)
   - Connection count display for active ports
   - Last accessed timestamp tracking
   - Sortable by connection status

### Features to Implement
1. **Port History Tracking**: Track port usage over time with JSON persistence
2. **Port Auto-adjustment**: If default port 3033 is in use, automatically try 3034, 3035, etc.
3. **CLI Mode**: Standalone CLI commands (`portman list`, `portman kill <pid>`)
4. **Docker Integration** (Phase 2): Optional with `--with-docker` flag
5. **Resource Usage Monitoring**: CPU and memory usage per process

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
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── sonner.tsx
│   │   │   └── index.ts
│   │   ├── ui/               # shadcn/ui base components
│   │   ├── port-table/       # Modular port table components
│   │   │   ├── index.tsx         # Main table orchestrator
│   │   │   ├── port-row.tsx      # Individual port row display
│   │   │   ├── kill-dialog.tsx   # Kill confirmation dialog
│   │   │   └── search-bar.tsx    # Search input component
│   │   └── theme-toggle.tsx
│   ├── hooks/                # Custom React hooks
│   │   ├── use-port-filtering.ts # Port filtering logic
│   │   └── use-port-sorting.ts   # Port sorting logic
│   ├── constants/
│   │   └── categories.tsx        # Category definitions & icons
│   ├── styles/
│   │   └── brutalism.css         # Neo Brutalism design system CSS
│   ├── lib/
│   │   ├── api.ts                # API functions
│   │   └── utils.ts              # Utility functions (cn helper)
│   ├── store/
│   │   └── port-store.ts         # Jotai state atoms
│   ├── types/
│   │   └── port.ts               # TypeScript type definitions
│   ├── App.tsx                   # Main React component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles with Tailwind CSS
├── server/
│   ├── index.ts                  # Hono server entry point
│   ├── routes/
│   │   ├── ports.ts              # Port listing and kill endpoints
│   │   └── icons.ts              # Icon serving endpoint
│   └── services/                 # Modular service layer
│       ├── port-service.ts           # Main port API (orchestrator)
│       ├── connection-service.ts     # Connection count tracking
│       ├── unix-port-parser.ts       # lsof output parsing
│       ├── process-metadata-service.ts # Process metadata collection
│       ├── category-service.ts       # Process categorization logic
│       ├── docker-service.ts         # Docker port mapping detection
│       └── icon-service.ts           # Icon extraction and caching
├── public/                       # Static assets
├── package.json                  # Dependencies and scripts
├── tsconfig.*.json               # TypeScript configurations
├── vite.config.ts                # Vite configuration with React Compiler & path alias
└── biome.json                    # Biome configuration
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
  - `use-port-sorting.ts`: Sort ports by multiple columns
- **Constants**: Shared definitions centralized
  - `categories.tsx`: Category metadata & icons

**Backend (Hono):**
- **Services**: Modular service layer with focused responsibilities
  - `port-service.ts` (~230 lines): Main orchestrator, platform detection
  - `connection-service.ts` (~19 lines): Connection count tracking
  - `unix-port-parser.ts` (~52 lines): lsof output parsing
  - `process-metadata-service.ts` (~146 lines): Process metadata collection
  - `category-service.ts` (~125 lines): Process categorization
  - `docker-service.ts` (~96 lines): Docker integration
  - `icon-service.ts`: Icon extraction & caching

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
- ✓ shadcn/ui base components (Button, Table, Dialog, Tooltip, Badge)
- ✓ Sonner toast notifications with brutalist styling
- ✓ Neo Brutalism design system
  - ✓ Custom brutalist component wrappers
  - ✓ Brutalist color scheme and styling
  - ✓ Custom scrollbar with theme support
  - ✓ Dark mode with toggle component
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

**Future Additions:**
- Cross-platform icon support (Windows: .ico, Linux: .desktop)
- Port history tracking with JSON persistence
- Docker and docker-compose configuration
- CLI mode
- Resource usage monitoring (CPU, memory)
- Additional port filtering features

## Additional Notes

- The project name has been changed from "Portman" to "Portboard" (as mentioned in [README.md](README.md))
- Phase 1 MVP is now complete with all core features implemented
- The project emphasizes being an **open-source alternative** to closed-source port management tools due to security concerns with docker.sock access
