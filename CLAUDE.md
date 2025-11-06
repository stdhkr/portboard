# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Portboard** (formerly Portman) is an open-source, browser-based port management tool built with React, TypeScript, and Vite. The project is currently in its initial setup phase with plans to evolve into a full port management dashboard.

The project plan is documented in [portman-project-plan.md](portman-project-plan.md) (in Japanese). Key points:
- **Goal**: Build a pgweb/Drizzle Studio-like web dashboard for managing ports and processes
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
The project appears set up for CSS modules or standard CSS. The plan mentions future integration with **shadcn/ui** and **TailwindCSS** for component styling.

## Planned Architecture (from project plan)

### Future Backend (Phase 1)
- **Framework**: Hono (lightweight web framework)
- **State Management**: Zustand
- **Data Fetching**: SWR for auto-revalidation
- **UI Components**: shadcn/ui (to be added)
- **Validation**: Zod

### Key Features to Implement
1. **Port Management**: Display listening ports in a table with sorting/filtering
2. **Process Control**: Kill processes with confirmation dialogs
3. **Auto-refresh**: Real-time port monitoring (5s default interval)
4. **Port Auto-adjustment**: If default port 3033 is in use, automatically try 3034, 3035, etc.
5. **CLI Mode**: Standalone CLI commands (`portman list`, `portman kill <pid>`)
6. **Docker Integration** (Phase 2): Optional with `--with-docker` flag

### Security Principles (from plan)
- **Localhost-only binding** by default
- **Docker socket access disabled** by default (explicit `--with-docker` flag required)
- **Own-process-only kills** by default (no sudo/root operations)
- **No telemetry/tracking**

## Directory Structure

```
portboard/
├── src/
│   ├── App.tsx          # Main React component
│   ├── main.tsx         # Entry point
│   ├── App.css          # App-specific styles
│   └── index.css        # Global styles
├── public/              # Static assets
├── package.json         # Dependencies and scripts
├── tsconfig.*.json      # TypeScript configurations
├── vite.config.ts       # Vite configuration with React Compiler
├── eslint.config.js     # ESLint configuration (flat config)
└── portman-project-plan.md  # Detailed project plan (Japanese)
```

## Working with This Codebase

### Before Implementing Features
1. Review [portman-project-plan.md](portman-project-plan.md) for architectural decisions and feature priorities
2. The plan emphasizes **Phase 1 MVP** focus: core port listing, process killing, and basic UI with shadcn/ui
3. Security considerations are paramount - always default to safe operations

### Code Style
- **TypeScript strict mode** is enabled - all code must be fully typed
- **Biome** is used for linting and formatting - run `npm run check` before committing
- **React Hooks rules** are enforced via Biome
- **React Refresh** requirements apply - components should follow HMR best practices
- The project uses **ES2022** target with **ESNext** modules
- Biome configuration is in [biome.json](biome.json)

### Future Setup (not yet implemented)
The project plan mentions future additions:
- shadcn/ui components (Table, Button, Dialog, Toast, etc.)
- TailwindCSS for styling
- Hono backend server
- Zustand for state management
- SWR for data fetching
- Docker and docker-compose configuration

## Additional Notes

- The project name is being changed from "Portman" to "Portboard" (as mentioned in [README.md](README.md))
- Phase 1 target timeline: 1-2 weeks for MVP
- The project emphasizes being an **open-source alternative** to closed-source port management tools due to security concerns with docker.sock access
