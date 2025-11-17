# Contributing to Portboard

Thank you for your interest in contributing to Portboard! We welcome contributions from the community.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- Git

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/portboard.git
   cd portboard
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3033

## Development Workflow

### Making Changes

1. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Test your changes thoroughly
4. Run linting and type checking:
   ```bash
   npm run lint:all
   ```

### Code Style

We use **Biome** for linting and formatting. Before committing:

```bash
npm run check        # Lint and format with auto-fix
npm run typecheck    # Run TypeScript type checker
```

### Commit Messages

Use clear, descriptive commit messages:
- `feat: add Docker container logs viewer`
- `fix: correct connection count calculation`
- `docs: update installation instructions`
- `refactor: simplify port filtering logic`

### Design System Guidelines

**Important**: Always preserve the Neo Brutalism design system:

- **Never modify** `src/components/ui/` (shadcn/ui base components)
- **Create wrappers** in `src/components/brutalist/` for custom styling
- Use 2px borders, 3px offset shadows, bold typography
- Color palette: Yellow (#FFD93D), Cyan (#6BCF7E), Red (#FF6B6B)
- Support dark mode via CSS variables

### Architecture Principles

- **Modular design**: Keep files small and focused (< 200 lines)
- **Separation of concerns**: UI logic separate from business logic
- **Type safety**: All code must be fully typed (TypeScript strict mode)
- **Security-first**: Default to safe operations (localhost-only, no telemetry)

## Submitting a Pull Request

1. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request on GitHub
3. Fill out the PR template with:
   - Clear description of changes
   - Related issue number (if applicable)
   - Screenshots/GIFs for UI changes
   - Testing steps
4. Wait for review and address feedback

## Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) when filing issues:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node.js version)
- Screenshots if applicable

## Requesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md):

- Clear description of the feature
- Use case and motivation
- Proposed implementation (optional)

## Code Review Process

1. Maintainers will review your PR
2. Address feedback and update your PR
3. Once approved, a maintainer will merge your PR

## Questions?

- Check the [README.md](README.md) for project overview
- Review [CLAUDE.md](CLAUDE.md) for detailed architecture notes
- Open a [Discussion](https://github.com/stdhkr/portboard/discussions) for questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
