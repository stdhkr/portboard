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

## Publishing to npm (Maintainers Only)

This section is for maintainers who have publish access to the `portbd` package on npm.

### Prerequisites

1. **npm account**: You must be logged in to npm
   ```bash
   npm whoami  # Check if logged in
   npm login   # Login if needed
   ```

2. **Publish permissions**: You must have publish access to the `portbd` package

### Pre-publish Checklist

Before publishing a new version:

1. **Ensure all changes are committed and pushed**
   ```bash
   git status  # Should show clean working directory
   ```

2. **Verify build works**
   ```bash
   npm run build
   ```

3. **Test locally**
   ```bash
   npm start
   # Or test in another directory
   cd /tmp && npx portbd
   ```

4. **Run type checking and linting**
   ```bash
   npm run typecheck
   npm run check
   ```

5. **Review files to be published**
   ```bash
   npm pack --dry-run
   ```

### Publishing a New Version

#### 1. Update Version Number

Use semantic versioning (semver):

- **Patch** (0.1.0 → 0.1.1): Bug fixes, small tweaks
  ```bash
  npm version patch
  ```

- **Minor** (0.1.0 → 0.2.0): New features, backward-compatible changes
  ```bash
  npm version minor
  ```

- **Major** (0.1.0 → 1.0.0): Breaking changes
  ```bash
  npm version major
  ```

The `npm version` command will:
- Update `package.json` version
- Create a git commit
- Create a git tag

#### 2. Push Changes and Tags

```bash
git push && git push --tags
```

#### 3. Publish to npm

```bash
npm publish
```

This will:
- Run `prepublishOnly` script (builds the project)
- Upload the package to npm registry
- Make it available via `npx portbd`

#### 4. Verify Publication

```bash
# Check package info
npm view portbd

# Test installation
cd /tmp
npx portbd@latest
```

#### 5. Create GitHub Release (Optional)

1. Go to https://github.com/stdhkr/portboard/releases
2. Click "Draft a new release"
3. Select the version tag you just created
4. Add release notes summarizing changes
5. Publish the release

### Troubleshooting

#### "address already in use" Error

If the default port (3033) is already in use when testing:

```bash
# Find and kill the process
lsof -ti :3033 | xargs kill

# Or use a different port
PORT=3034 npx portbd
```

#### npm Warnings After Publish

If you see warnings like:
```
npm warn publish "bin[portboard]" script name was cleaned
npm warn publish "repository.url" was normalized
```

Run this command to fix:
```bash
npm pkg fix
```

Then commit the changes:
```bash
git add package.json
git commit -m "fix: normalize package.json per npm pkg fix"
git push
```

### Version History

Current stable version: **0.1.0** (Initial release)

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## Questions?

- Check the [README.md](README.md) for project overview
- Review [CLAUDE.md](CLAUDE.md) for detailed architecture notes
- Open a [Discussion](https://github.com/stdhkr/portboard/discussions) for questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
