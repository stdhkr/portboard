# Windows Platform Provider Implementation Plan

## Overview

Implement full Windows platform support with organized provider structure matching macOS and Linux architectures.

**Goal**: Complete cross-platform compatibility for Portboard on Windows systems

**Status**: Partial implementation (port detection, connection counting, process metadata)

**Target**: Full implementation with icon extraction and IDE/Terminal detection

---

## Current Implementation Status

### ✅ Already Implemented

**Port Provider** (`server/services/platform/windows/port-provider.ts`):
- ✅ Port detection using `netstat -ano`
- ✅ Batch `wmic` for process information
- ✅ Connection counting with `netstat -ano | findstr "ESTABLISHED"`
- ✅ Port/PID matching for accurate connection counts

**Process Provider** (`server/services/platform/windows/process-provider.ts`):
- ✅ Process killing with `taskkill /PID`
- ✅ Batch `wmic` for process metadata
- ✅ ExecutablePath, WorkingSetSize, CreationDate extraction

**Browser Provider** (`server/services/platform/windows/browser-provider.ts`):
- ✅ Browser integration using `start` command
- ✅ Network URL generation with `os.networkInterfaces()`

### ❌ Not Yet Implemented

**Icon Provider** (`server/services/platform/windows/icon-provider.ts`):
- ❌ .ico file extraction from executables
- ❌ Icon caching
- ❌ Support for shortcut (.lnk) icon references

**Application Provider** (`server/services/platform/windows/application-provider.ts`):
- ❌ IDE detection (VS Code, Visual Studio, JetBrains family, etc.)
- ❌ Terminal detection (Windows Terminal, PowerShell, Command Prompt, etc.)
- ❌ Docker container shell access
- ❌ Application launching and integration

---

## Technical Approach

### 1. Icon Provider Implementation

**Goal**: Extract application icons from Windows executables and shortcuts

**Windows-Specific Challenges**:
- Icons are embedded in .exe files (not standalone like macOS .icns or Linux .desktop)
- Need to extract resources from PE (Portable Executable) files
- Shortcuts (.lnk files) may reference icons

**Implementation Strategy**:

#### Option A: Native Node.js Modules
Use Windows API bindings to extract icons:
- `node-win-icon` or similar package
- Extract icon resources from .exe files
- Convert to PNG for web display

```typescript
// Pseudo-code
async extractIcon(exePath: string): Promise<string | null> {
  // 1. Check if .exe file exists
  // 2. Use Windows API to extract icon resource
  // 3. Convert to PNG
  // 4. Cache in temp directory
  // 5. Return cached path
}
```

#### Option B: PowerShell Script Approach
Use PowerShell to extract icons:
```powershell
# Extract icon from .exe to .ico
Add-Type -AssemblyName System.Drawing
$icon = [System.Drawing.Icon]::ExtractAssociatedIcon("C:\path\to\app.exe")
$icon.ToBitmap().Save("C:\temp\icon.png")
```

**Recommended**: Option B (PowerShell) for easier implementation without native dependencies

**Icon Search Locations**:
- `C:\Program Files\` - Installed applications
- `C:\Program Files (x86)\` - 32-bit applications
- `%APPDATA%\Microsoft\Windows\Start Menu\Programs\` - User shortcuts
- `%ProgramData%\Microsoft\Windows\Start Menu\Programs\` - System shortcuts

**Caching Strategy**:
- Cache directory: `%TEMP%\portboard-icons\`
- Key: Hash of executable path
- Format: PNG (for web compatibility)

---

### 2. Application Provider Implementation

**Goal**: Detect installed IDEs and terminals, enable launching and Docker integration

**IDE Detection**:

**Common IDE Paths**:
```typescript
private readonly IDE_PATHS = [
  // Visual Studio Code
  { name: "VS Code", exe: "code.exe", paths: [
    "%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe",
    "%ProgramFiles%\\Microsoft VS Code\\Code.exe"
  ]},

  // Visual Studio
  { name: "Visual Studio 2022", exe: "devenv.exe", paths: [
    "%ProgramFiles%\\Microsoft Visual Studio\\2022\\Community\\Common7\\IDE\\devenv.exe",
    "%ProgramFiles%\\Microsoft Visual Studio\\2022\\Professional\\Common7\\IDE\\devenv.exe",
    "%ProgramFiles%\\Microsoft Visual Studio\\2022\\Enterprise\\Common7\\IDE\\devenv.exe"
  ]},

  // JetBrains IDEs
  { name: "IntelliJ IDEA", exe: "idea64.exe", paths: [
    "%ProgramFiles%\\JetBrains\\IntelliJ IDEA*\\bin\\idea64.exe"
  ]},
  { name: "PyCharm", exe: "pycharm64.exe", paths: [
    "%ProgramFiles%\\JetBrains\\PyCharm*\\bin\\pycharm64.exe"
  ]},
  { name: "WebStorm", exe: "webstorm64.exe", paths: [
    "%ProgramFiles%\\JetBrains\\WebStorm*\\bin\\webstorm64.exe"
  ]},

  // Cursor
  { name: "Cursor", exe: "Cursor.exe", paths: [
    "%LOCALAPPDATA%\\Programs\\Cursor\\Cursor.exe"
  ]},

  // Sublime Text
  { name: "Sublime Text", exe: "sublime_text.exe", paths: [
    "%ProgramFiles%\\Sublime Text\\sublime_text.exe"
  ]},

  // Notepad++
  { name: "Notepad++", exe: "notepad++.exe", paths: [
    "%ProgramFiles%\\Notepad++\\notepad++.exe",
    "%ProgramFiles(x86)%\\Notepad++\\notepad++.exe"
  ]}
];
```

**Detection Method**:
1. Check environment variables (`PATH`, registry)
2. Search common installation directories
3. Use PowerShell `Get-Command` for executables in PATH
4. Check Windows Registry for installed programs

```powershell
# Get installed programs from registry
Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* |
  Select-Object DisplayName, InstallLocation
```

**Terminal Detection**:

**Common Terminal Paths**:
```typescript
private readonly TERMINAL_PATHS = [
  // Windows Terminal
  { name: "Windows Terminal", exe: "wt.exe", command: "wt.exe" },

  // PowerShell 7+
  { name: "PowerShell", exe: "pwsh.exe", command: "pwsh.exe" },

  // Windows PowerShell 5.1
  { name: "Windows PowerShell", exe: "powershell.exe",
    paths: ["%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"] },

  // Command Prompt
  { name: "Command Prompt", exe: "cmd.exe",
    paths: ["%SystemRoot%\\System32\\cmd.exe"] },

  // Git Bash (if installed)
  { name: "Git Bash", exe: "bash.exe", paths: [
    "%ProgramFiles%\\Git\\bin\\bash.exe",
    "%ProgramFiles(x86)%\\Git\\bin\\bash.exe"
  ]},

  // Cmder
  { name: "Cmder", exe: "Cmder.exe", paths: [
    "%ProgramFiles%\\Cmder\\Cmder.exe"
  ]},

  // Hyper
  { name: "Hyper", exe: "Hyper.exe", paths: [
    "%LOCALAPPDATA%\\Programs\\Hyper\\Hyper.exe"
  ]}
];
```

**Opening IDE/Terminal**:
```typescript
async openInIDE(idePath: string, directoryPath: string): Promise<void> {
  // For VS Code: code.exe "C:\path\to\dir"
  // For Visual Studio: devenv.exe "C:\path\to\dir"
  // For JetBrains: idea64.exe "C:\path\to\dir"
  await execAsync(`"${idePath}" "${directoryPath}"`);
}

async openInTerminal(terminalPath: string, cwd: string): Promise<void> {
  // Windows Terminal: wt.exe -d "C:\path"
  // PowerShell: pwsh.exe -NoExit -Command "cd 'C:\path'"
  // cmd.exe: cmd.exe /K "cd /D C:\path"

  const terminalName = terminalPath.split("\\").pop() || "";

  if (terminalName.includes("wt.exe")) {
    await execAsync(`wt.exe -d "${cwd}"`);
  } else if (terminalName.includes("pwsh.exe")) {
    await execAsync(`pwsh.exe -NoExit -Command "cd '${cwd}'"`);
  } else if (terminalName.includes("powershell.exe")) {
    await execAsync(`powershell.exe -NoExit -Command "cd '${cwd}'"`);
  } else if (terminalName.includes("cmd.exe")) {
    await execAsync(`cmd.exe /K "cd /D ${cwd}"`);
  } else {
    // Generic approach
    await execAsync(`"${terminalPath}" "${cwd}"`);
  }
}
```

**Docker Container Shell Access**:
```typescript
async openContainerShell(
  containerId: string,
  terminalPath: string
): Promise<void> {
  const terminalName = terminalPath.split("\\").pop() || "";

  // Detect shell (bash/sh)
  const shell = await this.detectContainerShell(containerId);

  if (terminalName.includes("wt.exe")) {
    // Windows Terminal supports docker exec directly
    await execAsync(`wt.exe docker exec -it ${containerId} ${shell}`);
  } else if (terminalName.includes("pwsh.exe") || terminalName.includes("powershell.exe")) {
    // PowerShell
    await execAsync(`start ${terminalName} -ArgumentList "-NoExit","-Command","docker exec -it ${containerId} ${shell}"`);
  } else if (terminalName.includes("cmd.exe")) {
    // Command Prompt
    await execAsync(`start cmd.exe /K "docker exec -it ${containerId} ${shell}"`);
  } else {
    // Generic approach
    await execAsync(`start "${terminalPath}" "docker exec -it ${containerId} ${shell}"`);
  }
}
```

---

## Directory Structure

After implementation, the Windows directory should match macOS/Linux:

```
server/services/platform/windows/
├── index.ts                  # WindowsPlatformProvider (entry point)
├── port-provider.ts          # Port management (netstat) ✅
├── process-provider.ts       # Process management (wmic, taskkill) ✅
├── icon-provider.ts          # Icon extraction (.ico) ❌ TODO
├── application-provider.ts   # IDE/Terminal detection ❌ TODO
└── browser-provider.ts       # Browser integration (start) ✅
```

**Current**: 3 files (index.ts, port-provider.ts, process-provider.ts as monolith)
**Target**: 6 files (matching macOS/Linux structure)

---

## Development Setup

### UTM Windows 11 VM Setup

**VM Configuration**:
- **OS**: Windows 11 (ARM64 for Apple Silicon, x64 for Intel)
- **Virtualization**: UTM (free, open-source)
- **RAM**: 4-8 GB recommended
- **Disk**: 40-60 GB

**Installation Steps**:

1. **Download Windows 11 ISO**:
   - For ARM Macs: Windows 11 ARM64 Insider Preview
   - For Intel Macs: Windows 11 x64

2. **Create UTM VM**:
   - Open UTM → Create a New Virtual Machine
   - Virtualize (if ARM) or Emulate (if x64)
   - Install Windows from ISO
   - Complete Windows setup

3. **Install Development Tools**:
   ```powershell
   # Install Chocolatey (package manager)
   Set-ExecutionPolicy Bypass -Scope Process -Force
   [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
   iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

   # Install Node.js
   choco install nodejs-lts -y

   # Install Git
   choco install git -y

   # Install OpenSSH Server (for remote development)
   Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
   Start-Service sshd
   Set-Service -Name sshd -StartupType 'Automatic'
   ```

4. **SSH Access from macOS**:
   ```bash
   # Find VM IP address (in Windows PowerShell)
   ipconfig

   # From macOS, SSH into Windows VM
   ssh username@<VM_IP_ADDRESS>
   ```

5. **File Sync**:
   - **Option A**: Git-based sync (push from macOS, pull in VM)
   - **Option B**: SMB share (enable file sharing in Windows)
   - **Option C**: VS Code Remote SSH

---

## Testing Strategy

### Test Environment
- **OS**: Windows 11 (UTM VM)
- **Node.js**: LTS version (20.x)
- **PowerShell**: 7.x recommended

### Test Cases

**Icon Provider**:
- ✅ Extract icon from .exe file (VS Code, Chrome, etc.)
- ✅ Handle missing/corrupt icons gracefully
- ✅ Cache icons in temp directory
- ✅ Serve cached icons via API

**Application Provider**:
- ✅ Detect installed IDEs (VS Code, Visual Studio, JetBrains)
- ✅ Detect installed terminals (Windows Terminal, PowerShell, cmd)
- ✅ Open working directory in IDE
- ✅ Open terminal with working directory
- ✅ Docker container shell access
- ✅ Handle missing applications gracefully

**Integration**:
- ✅ API endpoints: `/api/ports/available-ides`, `/api/ports/available-terminals`
- ✅ Icon serving: `/api/icons/:iconPath`
- ✅ CLI commands work correctly

---

## Implementation Checklist

### Phase 1: Icon Provider
- [ ] Create `icon-provider.ts` file
- [ ] Implement PowerShell-based icon extraction
- [ ] Add icon caching to `%TEMP%\portboard-icons\`
- [ ] Handle .exe and .lnk files
- [ ] Test with common Windows applications

### Phase 2: Application Provider
- [ ] Create `application-provider.ts` file
- [ ] Implement IDE detection (15+ IDEs)
  - [ ] VS Code
  - [ ] Visual Studio
  - [ ] JetBrains family (IntelliJ, PyCharm, WebStorm, etc.)
  - [ ] Cursor
  - [ ] Sublime Text
  - [ ] Notepad++
- [ ] Implement Terminal detection (7+ terminals)
  - [ ] Windows Terminal
  - [ ] PowerShell 7+
  - [ ] Windows PowerShell 5.1
  - [ ] Command Prompt
  - [ ] Git Bash
  - [ ] Cmder
  - [ ] Hyper
- [ ] Implement `openInIDE()` method
- [ ] Implement `openInTerminal()` method
- [ ] Implement `openContainerShell()` for Docker

### Phase 3: Refactoring & Testing
- [ ] Refactor existing providers to match macOS/Linux structure
- [ ] Split monolithic files into organized modules
- [ ] Add comprehensive error handling
- [ ] Test all functionality on Windows 11
- [ ] Update documentation (README.md, CLAUDE.md)

### Phase 4: Documentation
- [ ] Create Windows setup guide
- [ ] Document Windows-specific commands and tools
- [ ] Add troubleshooting section
- [ ] Update platform comparison table

---

## Estimated Effort

**Timeline**: 3-4 days (similar to Linux implementation)

- **Day 1**: UTM setup, Windows 11 installation, SSH configuration, Git setup
- **Day 2**: Icon Provider implementation and testing
- **Day 3**: Application Provider implementation (IDE/Terminal detection)
- **Day 4**: Docker integration, documentation, testing

**Lines of Code**: ~400-500 lines
- IconProvider: ~150 lines
- ApplicationProvider: ~250 lines
- Documentation updates: ~100 lines

---

## Known Challenges

### 1. Icon Extraction Complexity
**Challenge**: Windows icons are embedded in PE files, not standalone
**Solution**: Use PowerShell with System.Drawing API

### 2. Path Resolution
**Challenge**: Environment variable expansion (%ProgramFiles%, %LOCALAPPDATA%)
**Solution**: Use `process.env` in Node.js or PowerShell expansion

### 3. Terminal Diversity
**Challenge**: Each terminal has different launch syntax
**Solution**: Terminal-specific handling (similar to Linux approach)

### 4. Permissions
**Challenge**: Some operations may require elevated permissions
**Solution**: Check permissions before operations, provide clear error messages

---

## Success Criteria

- ✅ All 5 platform providers implemented
- ✅ Icon extraction working for common applications
- ✅ 15+ IDEs detected and launchable
- ✅ 7+ terminals detected and launchable
- ✅ Docker container shell access working
- ✅ All API endpoints functional
- ✅ CLI commands work correctly
- ✅ Build passes on Windows
- ✅ Documentation complete

---

## References

### Windows Commands
- `netstat -ano` - Network statistics with PID
- `wmic process` - Process information
- `taskkill /PID` - Kill process
- `Get-Command` - PowerShell command lookup
- `Get-ItemProperty` - Registry reading

### Windows Paths
- `%ProgramFiles%` - C:\Program Files
- `%ProgramFiles(x86)%` - C:\Program Files (x86)
- `%LOCALAPPDATA%` - C:\Users\<user>\AppData\Local
- `%APPDATA%` - C:\Users\<user>\AppData\Roaming
- `%TEMP%` - Temporary files directory

### PowerShell Resources
- [System.Drawing.Icon Class](https://docs.microsoft.com/en-us/dotnet/api/system.drawing.icon)
- [Get-Command Documentation](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-command)
- [Start-Process Documentation](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process)

---

**Status**: Planning Phase
**Next Steps**: Set up UTM Windows 11 VM and begin Icon Provider implementation
