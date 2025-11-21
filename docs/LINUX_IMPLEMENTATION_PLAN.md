# Linux Implementation Plan

## Overview

This document outlines the implementation plan for Linux support in Portboard using Docker-based development and testing.

**Goal:** Enable Portboard to run on Linux with core functionality (port listing, process management, Docker integration) while maintaining the existing macOS codebase.

**Development Environment:** Docker containers (Ubuntu-based) for testing without requiring physical Linux hardware.

---

## Phase 1: Docker Development Environment Setup

### 1.1 Create Docker Testing Environment

**File:** `docker/linux-dev/Dockerfile`

```dockerfile
FROM ubuntu:22.04

# Install required system packages
RUN apt-get update && apt-get install -y \
    lsof \
    net-tools \
    procps \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Default command
CMD ["/bin/bash"]
```

**File:** `docker/linux-dev/docker-compose.yml`

```yaml
version: '3.8'

services:
  linux-dev:
    build: .
    volumes:
      - ../..:/workspace
    working_dir: /workspace
    stdin_open: true
    tty: true
    command: /bin/bash
```

**Quick Start Commands:**

```bash
# Build and run
cd docker/linux-dev
docker-compose build
docker-compose run --rm linux-dev

# Inside container
npm install
npm run build
npx portbd list
```

---

## Phase 2: Platform Provider Implementation

### 2.1 Linux Port Provider

**File:** `server/services/platform/linux/port-provider.ts`

**Status:** 🟡 Partial implementation exists (needs testing)

**Implementation Tasks:**

- [x] Basic `lsof` command execution (already implemented)
- [ ] Test `lsof` output format on Ubuntu
- [ ] Verify `parseUnixPortOutput()` compatibility
- [ ] Test with various applications (Node.js, Python, nginx)
- [ ] Handle edge cases (permission errors, missing lsof)

**Command Comparison:**

| Feature | macOS | Linux (Ubuntu) |
|---------|-------|----------------|
| List ports | `lsof +c 0 -i -P -n \| grep LISTEN` | ✅ Same |
| Connection count | `lsof -P -n -i -a -p <pid>` | ✅ Same |

**Testing Script:**

```bash
# In Docker container
node -e "require('http').createServer().listen(3000)"  # Start test server
lsof +c 0 -i -P -n | grep LISTEN                       # Verify output format
npx portbd list                                        # Test Portboard
```

---

### 2.2 Linux Process Provider

**File:** `server/services/platform/linux/process-provider.ts`

**Status:** 🟡 Partial implementation exists (needs refinement)

**Implementation Tasks:**

- [x] Basic `ps` command execution (already implemented)
- [ ] Test `ps` output format differences (Linux vs macOS)
- [ ] Implement `lsof -Fpfn` for process paths/cwd
- [ ] Test ownership checks (`kill -0` + `ps -o uid`)
- [ ] Handle systemd processes edge cases

**Command Differences:**

| Operation | macOS | Linux (Ubuntu) |
|-----------|-------|----------------|
| Process metadata | `ps -p <pids> -o pid,pcpu,pmem,etime,lstart` | `ps -p <pids> -o pid,%cpu,%mem,etime,lstart` |
| Process path | `lsof -Fpfn -p <pid>` | ✅ Same |
| Kill process | `kill <pid>` | ✅ Same |
| Ownership check | `ps -o uid= -p <pid>` | ✅ Same |

**Key Differences:**

- Linux `ps` uses `%cpu` and `%mem` (with `%` prefix)
- macOS `ps` uses `pcpu` and `pmem` (without `%` prefix)
- Need to handle both formats in parsing logic

**Testing Script:**

```bash
# Test ps command format
ps -p $$ -o pid,%cpu,%mem,etime,lstart

# Test lsof for process path
lsof -Fpfn -p $$

# Test kill permission check
kill -0 $$ && echo "Can kill" || echo "Cannot kill"
```

---

### 2.3 Linux Icon Provider

**File:** `server/services/platform/linux/icon-provider.ts`

**Status:** 🔴 Stub implementation (Phase 3 priority)

**Implementation Strategy:**

Linux icons are stored in `.desktop` files and theme directories:

```bash
# Example: VS Code desktop file
/usr/share/applications/code.desktop

[Desktop Entry]
Name=Visual Studio Code
Icon=/usr/share/pixmaps/vscode.png
Exec=/usr/bin/code
```

**Implementation Tasks:**

- [ ] Parse `.desktop` files in `/usr/share/applications/`
- [ ] Extract `Icon=` paths (PNG/SVG)
- [ ] Handle icon themes (`/usr/share/icons/hicolor/`)
- [ ] Implement PNG conversion for SVG icons (using `convert` or `rsvg-convert`)
- [ ] Add icon caching (similar to macOS `.icns` caching)

**Deferred to Phase 3** (Docker container doesn't have desktop apps)

---

### 2.4 Linux Application Provider

**File:** `server/services/platform/linux/application-provider.ts`

**Status:** 🔴 Stub implementation (Phase 3 priority)

**Implementation Strategy:**

Linux IDE/Terminal detection uses `which` and path scanning:

```bash
# Detect IDEs
which code cursor idea

# Scan common installation directories
ls /usr/bin/ | grep -E "code|cursor|idea"
ls /usr/local/bin/
ls ~/.local/bin/
```

**Implementation Tasks:**

- [ ] Implement `which` command detection
- [ ] Scan `/usr/bin/`, `/usr/local/bin/`, `~/.local/bin/`
- [ ] Add hardcoded paths for common IDEs
- [ ] Implement terminal detection (gnome-terminal, konsole, xterm, etc.)
- [ ] Test `xdg-open` for opening directories

**Deferred to Phase 3** (Desktop integration requires VM)

---

### 2.5 Linux Browser Provider

**File:** `server/services/platform/linux/browser-provider.ts`

**Status:** 🟢 Already implemented (needs testing)

**Implementation Tasks:**

- [x] `xdg-open` command for opening URLs (already implemented)
- [x] `os.networkInterfaces()` for network URL generation (cross-platform)
- [ ] Test `xdg-open` in headless environment (may fail in Docker)
- [ ] Add error handling for missing `xdg-open`

**Testing Script:**

```bash
# Test xdg-open (may fail in Docker without X11)
xdg-open http://localhost:3000 || echo "xdg-open not available"

# Test network interfaces
node -e "console.log(require('os').networkInterfaces())"
```

---

## Phase 3: Testing & Validation

### 3.1 Docker Test Suite

**File:** `scripts/test-linux.sh`

```bash
#!/bin/bash
set -e

echo "🐧 Starting Linux compatibility tests..."

# Build Docker image
docker build -t portboard-linux-test -f docker/linux-dev/Dockerfile .

# Run tests in container
docker run --rm -v $(pwd):/workspace -w /workspace portboard-linux-test bash -c "
  npm install
  npm run build

  echo '✅ Testing: npx portbd list'
  npx portbd list || exit 1

  echo '✅ Testing: npx portbd info 3000'
  node -e 'require(\"http\").createServer().listen(3000)' &
  sleep 2
  npx portbd info 3000 || exit 1

  echo '✅ All tests passed!'
"
```

**Make executable:**

```bash
chmod +x scripts/test-linux.sh
```

---

### 3.2 GitHub Actions CI

**File:** `.github/workflows/linux-test.yml`

```yaml
name: Linux Compatibility Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-linux:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y lsof procps

      - name: Install npm dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Test CLI - List ports
        run: |
          npx portbd list

      - name: Test CLI - Port info
        run: |
          # Start test server
          node -e "require('http').createServer().listen(8080)" &
          sleep 2

          # Test port info command
          npx portbd info 8080

      - name: Test CLI - Kill process
        run: |
          # Start test server
          node -e "require('http').createServer().listen(9000)" &
          sleep 2

          # Get PID
          PID=$(lsof -ti:9000)

          # Test kill command (with --force to skip confirmation)
          npx portbd kill 9000 --force
```

---

## Phase 4: Command Compatibility Matrix

### 4.1 Core Commands

| Command | macOS | Linux | Status |
|---------|-------|-------|--------|
| `lsof +c 0 -i -P -n` | ✅ | ✅ | Same syntax |
| `ps -p <pids> -o ...` | ✅ | ⚠️ | Different flags (`pcpu` vs `%cpu`) |
| `kill <pid>` | ✅ | ✅ | Same syntax |
| `kill -0 <pid>` | ✅ | ✅ | Same syntax (permission check) |
| `lsof -Fpfn -p <pid>` | ✅ | ✅ | Same syntax |

### 4.2 Browser Commands

| Operation | macOS | Linux | Status |
|-----------|-------|-------|--------|
| Open URL | `open <url>` | `xdg-open <url>` | ✅ Implemented |
| Network interfaces | `os.networkInterfaces()` | `os.networkInterfaces()` | ✅ Same (Node.js API) |

### 4.3 Icon/Desktop Commands

| Operation | macOS | Linux | Status |
|-----------|-------|-------|--------|
| Icon extraction | `sips -s format png` | `.desktop` files | 🔴 Phase 3 |
| IDE detection | `mdfind` (Spotlight) | `which`, path scan | 🔴 Phase 3 |
| Open in Finder | `open <path>` | `xdg-open <path>` | 🔴 Phase 3 |

---

## Implementation Checklist

### Phase 1: Environment Setup (Week 1)
- [ ] Create `docker/linux-dev/Dockerfile`
- [ ] Create `docker/linux-dev/docker-compose.yml`
- [ ] Test Docker environment with `npm run build`
- [ ] Verify `lsof`, `ps`, `kill` commands available

### Phase 2: Core Functionality (Week 2-3)
- [ ] Test `LinuxPortProvider.getListeningPorts()`
- [ ] Test `LinuxPortProvider.getBatchConnectionCounts()`
- [ ] Fix `ps` command flags (`%cpu` vs `pcpu`)
- [ ] Test `LinuxProcessProvider.getBatchProcessMetadata()`
- [ ] Test `LinuxProcessProvider.killProcess()`
- [ ] Test `LinuxBrowserProvider.openURL()`

### Phase 3: CLI Testing (Week 3)
- [ ] Test `npx portbd list` in Docker
- [ ] Test `npx portbd info <port>` in Docker
- [ ] Test `npx portbd kill <port>` in Docker
- [ ] Test `npx portbd docker ls` in Docker
- [ ] Create `scripts/test-linux.sh`

### Phase 4: CI Integration (Week 4)
- [ ] Create `.github/workflows/linux-test.yml`
- [ ] Test GitHub Actions workflow
- [ ] Add Linux compatibility badge to README
- [ ] Document Linux-specific limitations

### Phase 5: Advanced Features (Future)
- [ ] Icon extraction from `.desktop` files (Multipass VM)
- [ ] IDE detection (Multipass VM)
- [ ] Terminal integration (Multipass VM)

---

## Known Limitations

### Docker Environment
- ❌ **Icon display:** Cannot extract icons in headless container
- ❌ **IDE detection:** No desktop applications installed
- ❌ **Browser opening:** `xdg-open` fails without X11
- ✅ **Core CLI:** List, info, kill commands work
- ✅ **Docker integration:** Docker commands work if Docker socket mounted

### Solutions
- **Icons/IDE:** Defer to Phase 3 with Multipass VM
- **Browser opening:** Gracefully fail with error message
- **Testing:** Use GitHub Actions Ubuntu runner for real environment

---

## Success Metrics

### Phase 2 Complete When:
1. ✅ `npx portbd list` works in Docker Ubuntu container
2. ✅ Port listing shows correct process names, PIDs, ports
3. ✅ Connection count tracking works
4. ✅ `npx portbd kill <port>` successfully kills processes
5. ✅ All CLI commands work without errors

### Phase 4 Complete When:
1. ✅ GitHub Actions CI passes on every PR
2. ✅ Linux compatibility documented in README
3. ✅ No macOS-specific code in core platform providers

---

## Next Steps

1. **Start Now:** Create Docker environment
   ```bash
   mkdir -p docker/linux-dev
   # Create Dockerfile and docker-compose.yml
   ```

2. **Test Existing Code:**
   ```bash
   cd docker/linux-dev
   docker-compose run --rm linux-dev
   npm install && npm run build
   npx portbd list
   ```

3. **Fix `ps` Command Compatibility:**
   - Update `process-provider.ts` to handle `%cpu` vs `pcpu`

4. **Add Tests:**
   - Create `scripts/test-linux.sh`
   - Add GitHub Actions workflow

5. **Document:**
   - Update README with Linux support status
   - Add troubleshooting section

---

## Questions & Decisions

### Q1: Should we support older Ubuntu versions?
**Decision:** Start with Ubuntu 22.04 LTS (widely used, good `lsof` support)

### Q2: How to handle missing `lsof`?
**Decision:** Provide clear error message with installation instructions:
```
Error: lsof not found. Please install:
  Ubuntu/Debian: sudo apt-get install lsof
  Fedora/RHEL: sudo dnf install lsof
```

### Q3: Should we support Wayland vs X11?
**Decision:** Not critical for Phase 2 (CLI focus). Defer to Phase 3.

### Q4: How to test without physical Linux machine?
**Decision:** Use Docker (Phase 2) + GitHub Actions (Phase 4) + Community feedback

---

## Resources

- **Docker Documentation:** https://docs.docker.com/
- **lsof on Linux:** https://man7.org/linux/man-pages/man8/lsof.8.html
- **ps on Linux:** https://man7.org/linux/man-pages/man1/ps.1.html
- **XDG Desktop Entry Spec:** https://specifications.freedesktop.org/desktop-entry-spec/latest/

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Setup | 2 days | Docker environment ready |
| Phase 2: Core | 1 week | CLI commands working in Docker |
| Phase 3: Testing | 3 days | Test script + manual validation |
| Phase 4: CI | 2 days | GitHub Actions passing |
| Phase 5: Advanced | Future | Icon/IDE support (Multipass VM) |

**Total Time Estimate:** 2-3 weeks for Phases 1-4

---

**Last Updated:** 2025-01-21
**Status:** 📋 Planning phase
**Next Action:** Create Docker environment
