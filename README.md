# Portboard

An open-source, browser-based port management dashboard for developers.

## Overview

**Portboard** is a security-first port management tool built with modern web technologies. Inspired by tools like pgweb and Drizzle Studio, it provides a clean web interface for monitoring listening ports and managing processes on your local machine.

### Key Features (Planned)

- 🔍 **Port Monitoring**: Real-time display of listening ports with process information
- ⚡ **Process Control**: Kill processes with confirmation dialogs
- 🔄 **Auto-refresh**: Configurable real-time monitoring (default: 5s interval)
- 🎨 **Modern UI**: Built with Tailwind CSS 4 and shadcn/ui components
- 🌙 **Dark Mode**: Full dark mode support
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

### Backend (Planned)
- **Hono** - Lightweight web framework
- **Zustand** - State management
- **SWR** - Data fetching with auto-revalidation
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
│   │   └── ui/          # shadcn/ui components
│   ├── lib/
│   │   └── utils.ts     # Utility functions
│   ├── App.tsx          # Main component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── package.json         # Dependencies
├── vite.config.ts       # Vite configuration
└── biome.json          # Biome configuration
```

## Roadmap

### Phase 1: MVP (Current)
- [x] Project setup with Vite + React + TypeScript
- [x] Tailwind CSS 4 integration
- [x] shadcn/ui setup
- [ ] Port listing UI
- [ ] Process information display
- [ ] Basic process kill functionality

### Phase 2: Enhanced Features
- [ ] Docker container port monitoring (opt-in)
- [ ] Advanced filtering and search
- [ ] Auto-refresh with configurable intervals
- [ ] Toast notifications

### Phase 3: CLI & Distribution
- [ ] Standalone CLI commands
- [ ] Binary distribution
- [ ] Auto-updater

See [portman-project-plan.md](portman-project-plan.md) (Japanese) for detailed planning.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)

## Project Status

🚧 **Early Development** - This project is in its initial setup phase. The core port management features are currently being implemented.

---

**Note**: This project was formerly known as "Portman" but has been renamed to "Portboard".
