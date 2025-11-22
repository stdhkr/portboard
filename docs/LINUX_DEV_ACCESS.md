# Linux Development Environment Access Guide

This document explains how to access and work with the Ubuntu Linux development environment for Portboard.

---

## Environment Details

**VM Platform:** UTM (macOS virtualization)
**OS:** Ubuntu 22.04 LTS ARM64 Server
**Hostname:** ubuntu-dev
**IP Address:** 192.168.64.2
**Username:** dev
**Password:** dev

**VM Resources:**
- CPU: 2 cores
- Memory: 4GB
- Disk: 25GB
- Node.js: v20.19.5

---

## Quick Access Methods

### Method 1: SSH from macOS Terminal (Recommended)

```bash
ssh dev@192.168.64.2
```

**Password:** `dev`

**SSH Key Setup (password-less login):**
```bash
ssh-copy-id dev@192.168.64.2
# Enter password: dev
```

After this, you can SSH without entering a password.

---

### Method 2: VSCode Remote-SSH (Best for Development)

**Setup:**
1. Install **Remote-SSH** extension in VSCode
2. Press `Cmd+Shift+P` → `Remote-SSH: Connect to Host`
3. Enter: `dev@192.168.64.2`
4. Enter password: `dev`
5. Open folder: `/home/dev/portboard`

**Benefits:**
- Edit code directly in VM using macOS VSCode
- Full IntelliSense and debugging support
- Terminal integrated in VSCode

---

### Method 3: UTM Console (Fallback)

If SSH is not working:
1. Open UTM application
2. Select **Ubuntu-Portboard-Dev**
3. Click **▶️ (Play button)**
4. Login in the console window

**Note:** Keyboard input may be tricky due to macOS/Linux key mapping differences.

---

## Project Location

**Portboard project path:** `/home/dev/portboard`

```bash
cd /home/dev/portboard
```

---

## Common Development Tasks

### Build Portboard

```bash
cd /home/dev/portboard
npm run build
```

### Run CLI Commands

```bash
# List ports
npx portbd list

# Get port info
npx portbd info 3000

# Kill process
npx portbd kill 3000
```

### Test with a Sample Server

```bash
# Start test HTTP server
node -e "require('http').createServer().listen(3000)" &

# List ports
npx portbd list

# Get detailed info
npx portbd info 3000

# Kill the server
npx portbd kill 3000
```

### Update Code from macOS

Since the project is copied to the VM, you need to transfer changes:

**Option A: Manual file transfer (via HTTP)**

macOS Terminal:
```bash
cd /Users/std/development/portboard
tar czf /tmp/portboard.tar.gz --exclude=node_modules --exclude=.git .
cd /tmp
python3 -m http.server 8000
```

Ubuntu VM:
```bash
cd /home/dev
rm -rf portboard
mkdir portboard
cd portboard
curl http://192.168.64.1:8000/portboard.tar.gz -o portboard.tar.gz
tar xzf portboard.tar.gz
npm install
npm run build
```

**Option B: Git workflow (Recommended)**

macOS:
```bash
cd /Users/std/development/portboard
# Make changes
git add .
git commit -m "Update Linux implementation"
git push
```

Ubuntu VM:
```bash
cd /home/dev/portboard
git pull
npm run build
```

**Option C: VSCode Remote-SSH (Easiest)**

Just edit files directly in VSCode using Remote-SSH extension. Changes are instant!

---

## VM Management

### Start VM

```bash
# From macOS
open -a UTM
# Then click ▶️ on Ubuntu-Portboard-Dev
```

### Stop VM

**Inside VM:**
```bash
sudo shutdown -h now
```

**From UTM:**
- Click ⏹ (Stop button)
- Or: Menu → Virtual Machine → Shut Down

### Restart VM

**Inside VM:**
```bash
sudo reboot
```

---

## Troubleshooting

### SSH Connection Refused

1. Check if VM is running:
   ```bash
   ping 192.168.64.2
   ```

2. Verify SSH service is running (inside VM):
   ```bash
   sudo systemctl status ssh
   sudo systemctl start ssh
   ```

### IP Address Changed

If the IP address changes after VM restart:

**Inside VM:**
```bash
ip addr show
# Look for inet 192.168.64.X
```

Update your SSH config:
```bash
ssh dev@<NEW_IP_ADDRESS>
```

### Permission Denied Errors

If you get permission errors in `/home/dev/portboard`:

```bash
sudo chown -R dev:dev /home/dev/portboard
chmod -R u+w /home/dev/portboard
```

### Keyboard Issues in UTM Console

If keyboard input doesn't work correctly in UTM console:
- Use SSH instead: `ssh dev@192.168.64.2`
- Or use VSCode Remote-SSH

---

## Snapshots (Backup & Restore)

### Create Snapshot

1. Shut down VM: `sudo shutdown -h now`
2. In UTM: Right-click **Ubuntu-Portboard-Dev** → **Clone**
3. Name: `Ubuntu-Portboard-Dev-Backup-YYYY-MM-DD`

### Restore from Snapshot

1. In UTM: Right-click backup clone → **Clone**
2. Name: `Ubuntu-Portboard-Dev`
3. Delete old VM if needed

---

## Performance Tips

### Free Up Disk Space

```bash
# Clean npm cache
npm cache clean --force

# Remove old logs
sudo journalctl --vacuum-time=7d

# Clean apt cache
sudo apt-get clean
```

### Check Resource Usage

```bash
# Disk usage
df -h

# Memory usage
free -h

# Top processes
htop  # or: top
```

---

## Network Configuration

**VM Network Type:** Shared Network (NAT)

**Access from macOS to VM:**
- ✅ SSH: `ssh dev@192.168.64.2`
- ✅ HTTP: `http://192.168.64.2:PORT`

**Access from VM to macOS:**
- ✅ Gateway IP: `192.168.64.1`
- Example: `curl http://192.168.64.1:8000/file.txt`

**Access from VM to Internet:**
- ✅ Automatic via UTM NAT

---

## Development Workflow Example

**1. Edit code on macOS (VSCode)**
```bash
# Option A: Use Remote-SSH extension
code --folder-uri vscode-remote://ssh-remote+dev@192.168.64.2/home/dev/portboard

# Option B: Edit locally and transfer
code /Users/std/development/portboard
```

**2. Test on Linux VM**
```bash
# Via SSH
ssh dev@192.168.64.2
cd /home/dev/portboard
npm run build
npx portbd list
```

**3. Verify results**
```bash
# Test specific functionality
node -e "require('http').createServer().listen(8080)" &
npx portbd info 8080
npx portbd kill 8080
```

---

## Quick Reference

| Task | Command |
|------|---------|
| SSH to VM | `ssh dev@192.168.64.2` |
| VSCode Remote-SSH | `Cmd+Shift+P` → `Remote-SSH: Connect` → `dev@192.168.64.2` |
| Project path | `/home/dev/portboard` |
| Build Portboard | `npm run build` |
| List ports | `npx portbd list` |
| Port info | `npx portbd info <port>` |
| Kill process | `npx portbd kill <port>` |
| Shutdown VM | `sudo shutdown -h now` |
| Reboot VM | `sudo reboot` |

---

## Related Documentation

- [VIRTUALBOX_SETUP.md](./VIRTUALBOX_SETUP.md) - VirtualBox setup guide (deprecated, use UTM)
- [LINUX_IMPLEMENTATION_PLAN.md](./LINUX_IMPLEMENTATION_PLAN.md) - Linux implementation roadmap
- [CLAUDE.md](../CLAUDE.md) - Project overview

---

**Last Updated:** 2025-11-21
**VM Status:** ✅ Active and tested
**Linux Implementation Status:** ✅ Core functionality working (CLI, ports, process management)
