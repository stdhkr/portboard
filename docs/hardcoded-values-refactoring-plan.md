# Hardcoded Values Refactoring Plan

## Overview

This document outlines the plan to eliminate hardcoded values throughout the Portboard codebase and centralize configuration into constants files and environment variables.

**Goal**: Make the application more maintainable, configurable, and easier to deploy in different environments.

**Total Hardcoded Values Identified**: 28 across 15+ files

---

## Phase 1: Critical API & Server Configuration (HIGH PRIORITY)

### 1.1 Create Shared Constants Files

#### Backend Constants
**File**: `server/config/constants.ts` (NEW)

```typescript
export const SERVER_CONFIG = {
  DEFAULT_PORT: 3033,
  MAX_PORT_ATTEMPTS: 10,
  DEFAULT_HOST: '127.0.0.1',
} as const;

export const TIMING = {
  AUTO_REFRESH_INTERVAL: 5000, // 5 seconds
  DOCKER_LOGS_REFRESH: 5000,
  COPY_FEEDBACK_TIMEOUT: 2000,
  DIALOG_CLOSE_DELAY: 200,
} as const;

export const DOCKER = {
  DEFAULT_LOG_LINES: 20,
  LOG_LINE_OPTIONS: [20, 50, 100, 200] as const,
  LOGS_MAX_BUFFER: 10 * 1024 * 1024, // 10MB
} as const;

export const ICON = {
  CACHE_DIR: 'portboard-icons',
  RESIZE_SIZE: 64,
  DEFAULT_NAMES: ['AppIcon.icns', 'app.icns', 'icon.icns', 'Icon.icns'] as const,
} as const;

export const NETWORK = {
  HTTPS_PORT: 443,
} as const;
```

#### Frontend Constants
**File**: `src/config/constants.ts` (NEW)

```typescript
export const TIMING = {
  AUTO_REFRESH_INTERVAL: 5000, // 5 seconds
  DOCKER_LOGS_REFRESH: 5000,
  COPY_FEEDBACK_TIMEOUT: 2000,
  DIALOG_CLOSE_DELAY: 200,
} as const;

export const DOCKER = {
  DEFAULT_LOG_LINES: 20,
  LOG_LINE_OPTIONS: [20, 50, 100, 200] as const,
} as const;

export const UI = {
  MAX_LAYOUT_WIDTH: 'max-w-5xl',
  LOCALE: 'ja-JP',
} as const;
```

#### API Configuration with Environment Variable Support
**File**: `src/config/api.ts` (NEW)

```typescript
// Auto-detect API URL from environment or window location
const getApiBaseUrl = () => {
  // Development: use env variable if provided
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Production: auto-detect from current location
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = import.meta.env.VITE_API_PORT || '3033';

  return `${protocol}//${hostname}:${port}/api`;
};

const getAssetsBaseUrl = () => {
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace('/api', '');
};

export const API_BASE_URL = getApiBaseUrl();
export const ASSETS_BASE_URL = getAssetsBaseUrl();
```

### 1.2 Environment Variables Setup

**File**: `.env.example` (NEW)

```bash
# Server Configuration
PORT=3033
HOST=127.0.0.1

# API Configuration (for frontend build)
VITE_API_PORT=3033
VITE_API_HOST=127.0.0.1
VITE_API_BASE_URL=http://127.0.0.1:3033/api

# Cache Configuration
ICON_CACHE_DIR=/tmp/portboard-icons

# Timing Configuration (optional overrides)
AUTO_REFRESH_INTERVAL=5000
DOCKER_LOGS_REFRESH=5000
```

**File**: `.env` (gitignored, user-specific)

Copy from `.env.example` and customize as needed.

### 1.3 Update Files to Use New Constants

#### Backend Files to Update

1. **server/index.ts** (3 changes)
   - Line 24: `DEFAULT_PORT` → `import { SERVER_CONFIG } from './config/constants'`
   - Line 25: `MAX_PORT_ATTEMPTS` → `SERVER_CONFIG.MAX_PORT_ATTEMPTS`
   - Line 38: `hostname: "127.0.0.1"` → `hostname: process.env.HOST || SERVER_CONFIG.DEFAULT_HOST`

2. **server/routes/logs.ts** (2 changes)
   - Line 12: `"20"` → `DOCKER.DEFAULT_LOG_LINES.toString()`
   - Line 37: `1024 * 1024 * 10` → `DOCKER.LOGS_MAX_BUFFER`

3. **server/routes/ports.ts** (1 change)
   - Line 297: `443` → `NETWORK.HTTPS_PORT`

4. **server/services/browser-service.ts** (1 change)
   - Line 39: `443` → `NETWORK.HTTPS_PORT`

5. **server/services/icon-service.ts** (3 changes)
   - Line 11: `"portboard-icons"` → `process.env.ICON_CACHE_DIR || ICON.CACHE_DIR`
   - Line 84: Icon candidates array → `ICON.DEFAULT_NAMES`
   - Line 118: `64` → `ICON.RESIZE_SIZE`

#### Frontend Files to Update

6. **src/lib/api.ts** (8 changes)
   - Line 3: Replace hardcoded URL → `import { API_BASE_URL } from '@/config/api'`
   - Line 199: `lines = 20` → `lines = DOCKER.DEFAULT_LOG_LINES`
   - Remove all hardcoded image URLs (6 occurrences will be fixed at import sites)

7. **src/components/port-table/index.tsx** (2 changes)
   - Line 42: `5000` → `import { TIMING } from '@/config/constants'`
   - Line 184: `[AUTO-REFRESH: 5S]` → ``[AUTO-REFRESH: ${TIMING.AUTO_REFRESH_INTERVAL / 1000}S]``

8. **src/components/port-table/port-detail-dialog.tsx** (7 changes)
   - Line 72: `2000` → `TIMING.COPY_FEEDBACK_TIMEOUT`
   - Line 181: `5000` → `TIMING.DOCKER_LOGS_REFRESH`
   - Lines 278-286: `"ja-JP"` → `UI.LOCALE`
   - Line 469-472: `[20, 50, 100, 200]` → `DOCKER.LOG_LINE_OPTIONS`
   - Lines 300, 611, 651, 730, 764: Hardcoded URLs → `import { ASSETS_BASE_URL } from '@/config/api'`

9. **src/components/port-table/port-row.tsx** (1 change)
   - Line 65: Hardcoded URL → `import { ASSETS_BASE_URL } from '@/config/api'`

10. **src/store/port-store.ts** (1 change)
    - Line 40: `200` → `TIMING.DIALOG_CLOSE_DELAY`

11. **src/App.tsx** (1 change)
    - Line 8: `max-w-5xl` → `import { UI } from '@/config/constants'` and use `${UI.MAX_LAYOUT_WIDTH}`

---

## Phase 2: IDE/Terminal Configuration (MEDIUM PRIORITY)

### 2.1 Create IDE/Terminal Config File

**File**: `server/config/ide-terminal-config.json` (NEW)

```json
{
  "ides": [
    {
      "id": "cursor",
      "name": "Cursor",
      "paths": ["/Applications/Cursor.app"],
      "command": "cursor",
      "iconPattern": "Cursor.app/Contents/Resources/electron.icns"
    },
    {
      "id": "vscode",
      "name": "Visual Studio Code",
      "paths": ["/Applications/Visual Studio Code.app"],
      "command": "code",
      "iconPattern": "Visual Studio Code.app/Contents/Resources/Code.icns"
    }
    // ... (all 11 IDEs)
  ],
  "terminals": [
    {
      "id": "ghostty",
      "name": "Ghostty",
      "paths": ["/Applications/Ghostty.app"],
      "iconPattern": "Ghostty.app/Contents/Resources/AppIcon.icns"
    }
    // ... (all 7 terminals)
  ]
}
```

### 2.2 Update IDE Detection Service

**File**: `server/services/ide-detection-service.ts`

- Replace hardcoded arrays (lines 40-117) with JSON config loading
- Add config file reading function
- Support user overrides via `~/.portboard/ide-config.json`

---

## Phase 3: Docker & Icon Configuration (MEDIUM PRIORITY)

### 3.1 Environment Variable Support

Update `.env.example`:

```bash
# Docker Configuration
DOCKER_DEFAULT_LOG_LINES=20
DOCKER_LOGS_MAX_BUFFER=10485760  # 10MB in bytes

# Icon Configuration
ICON_CACHE_DIR=/tmp/portboard-icons
ICON_RESIZE_SIZE=64
```

### 3.2 Runtime Config Loading

Create `server/config/load-config.ts` to merge:
1. Default constants
2. Environment variables
3. User config file (optional)

---

## Phase 4: UI Preferences (LOW PRIORITY)

### 4.1 User Preferences System

**File**: `src/config/user-preferences.ts` (NEW)

```typescript
export interface UserPreferences {
  locale: string;
  autoRefreshInterval: number;
  dockerLogsRefreshInterval: number;
  theme: 'light' | 'dark' | 'system';
}

const DEFAULT_PREFERENCES: UserPreferences = {
  locale: navigator.language || 'ja-JP',
  autoRefreshInterval: 5000,
  dockerLogsRefreshInterval: 5000,
  theme: 'system',
};

// Load from localStorage
export const loadPreferences = (): UserPreferences => {
  // Implementation
};

// Save to localStorage
export const savePreferences = (prefs: UserPreferences): void => {
  // Implementation
};
```

### 4.2 Settings UI

Add a settings panel for user-configurable values:
- Auto-refresh interval
- Docker logs refresh interval
- Locale preference
- Theme preference

---

## Implementation Checklist

### Phase 1: Critical (Immediate)
- [ ] Create `server/config/constants.ts`
- [ ] Create `src/config/constants.ts`
- [ ] Create `src/config/api.ts`
- [ ] Create `.env.example`
- [ ] Update `server/index.ts` (3 changes)
- [ ] Update `server/routes/logs.ts` (2 changes)
- [ ] Update `server/routes/ports.ts` (1 change)
- [ ] Update `server/services/browser-service.ts` (1 change)
- [ ] Update `server/services/icon-service.ts` (3 changes)
- [ ] Update `src/lib/api.ts` (8 changes)
- [ ] Update `src/components/port-table/index.tsx` (2 changes)
- [ ] Update `src/components/port-table/port-detail-dialog.tsx` (7 changes)
- [ ] Update `src/components/port-table/port-row.tsx` (1 change)
- [ ] Update `src/store/port-store.ts` (1 change)
- [ ] Update `src/App.tsx` (1 change)
- [ ] Test all functionality after changes
- [ ] Update `CLAUDE.md` with new architecture

### Phase 2: IDE/Terminal Config (Next)
- [ ] Create `server/config/ide-terminal-config.json`
- [ ] Update `server/services/ide-detection-service.ts`
- [ ] Add user config override support
- [ ] Test IDE/Terminal detection

### Phase 3: Docker & Icon Config (Future)
- [ ] Add environment variable support to config loader
- [ ] Create config merging system
- [ ] Test Docker and icon functionality

### Phase 4: User Preferences (Future)
- [ ] Create user preferences system
- [ ] Add settings UI panel
- [ ] Add localStorage persistence
- [ ] Test preferences saving/loading

---

## Benefits

### Maintainability
- **Single source of truth**: One place to update each constant
- **Type safety**: TypeScript constants with `as const` for literal types
- **Discoverability**: Developers know where to look for configuration

### Configurability
- **Environment-specific**: Different settings for dev/staging/production
- **User customization**: Users can override IDE paths, intervals, etc.
- **No code changes**: Adjust behavior via `.env` file

### Security
- **No hardcoded secrets**: Environment variables for sensitive data
- **Default safe values**: Localhost-only binding by default

### Developer Experience
- **Clear naming**: `SERVER_CONFIG.DEFAULT_PORT` is more readable than `3033`
- **Documentation**: Constants file serves as config documentation
- **Easy testing**: Mock constants for unit tests

---

## Migration Strategy

1. **Create new files first** (non-breaking)
2. **Update imports gradually** (file by file)
3. **Test after each file update**
4. **Remove old hardcoded values** once confirmed working
5. **Update documentation** (CLAUDE.md, README.md)

---

## Estimated Effort

- **Phase 1**: 2-3 hours (30 changes across 15 files)
- **Phase 2**: 1-2 hours (IDE/Terminal config refactor)
- **Phase 3**: 1 hour (Environment variable integration)
- **Phase 4**: 2-3 hours (User preferences system + UI)

**Total**: 6-9 hours for complete refactoring

---

## Notes

- Keep backward compatibility during migration
- Add JSDoc comments to constants explaining their purpose
- Consider adding validation for environment variables
- Document all new environment variables in README.md
- Add TypeScript strict mode checks for config values

---

## References

- Hardcoded values audit: [Full report from exploration](#)
- Environment variable best practices: [12-factor app methodology](https://12factor.net/config)
- TypeScript const assertions: [TypeScript docs](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions)
