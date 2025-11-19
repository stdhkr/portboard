# Desktop Notifications Troubleshooting

Portboard can send desktop notifications when new ports are opened. This document helps you troubleshoot notification issues.

## Quick Start

1. **Enable Notifications**: Click the Bell icon in the top-right corner
2. **Grant Permission**: Allow notifications when your browser prompts you
3. **Test**: You should see a test notification immediately
4. **Monitor**: New ports will trigger notifications automatically

## Common Issues

### Notifications Not Appearing

#### 1. Browser Permission Not Granted

**Symptoms:**
- No test notification appears when enabling notifications
- Browser shows notification permission as "denied" or "default"

**Solution:**
1. Click the lock/info icon in your browser's address bar
2. Find "Notifications" in the permissions list
3. Change setting to "Allow"
4. Refresh the page and try again

**Browser-Specific Instructions:**

**Chrome/Brave:**
- Address bar → 🔒 icon → Site settings → Notifications → Allow

**Firefox:**
- Address bar → 🔒 icon → Permissions → Notifications → Allow

**Safari:**
- Safari menu → Settings for This Website → Notifications → Allow

#### 2. macOS Focus Mode (Do Not Disturb) Enabled

**Symptoms:**
- Browser permission is granted
- Test notification appears in Notification Center but not on screen
- No sound or banner for notifications

**Solution:**
1. Open **System Settings** → **Focus**
2. Check if any Focus mode is active (e.g., Do Not Disturb, Work, Sleep)
3. Turn off Focus mode, or
4. Configure Focus to allow notifications from your browser:
   - Click the active Focus mode
   - **Apps** → Add your browser (Chrome, Firefox, Safari, etc.)

#### 3. macOS System Notifications Disabled for Browser

**Symptoms:**
- Browser permission is granted
- Focus mode is off
- Still no notifications

**Solution:**
1. Open **System Settings** → **Notifications**
2. Scroll down and find your browser (Chrome, Firefox, Safari, etc.)
3. Ensure **Allow notifications** is ON
4. Set notification style to **Banners** or **Alerts**
5. Enable **Play sound for notifications** (optional)

#### 4. Browser Tab in Background

**Note:** Some browsers suppress notifications from background tabs.

**Solution:**
- Keep the Portboard tab active/visible, or
- Use browser settings to allow background notifications

#### 5. Notification Setting Not Saved

**Symptoms:**
- Notification toggle resets to OFF after page reload

**Solution:**
1. Check browser console (F12) for localStorage errors
2. Ensure cookies/localStorage are enabled
3. Check if browser is in Private/Incognito mode (some browsers restrict localStorage)

## Verifying Notification Functionality

### Step 1: Check Browser Support

Open browser console (F12) and run:
```javascript
"Notification" in window
```
Should return `true`. If `false`, your browser doesn't support notifications.

### Step 2: Check Permission Status

In browser console:
```javascript
Notification.permission
```
Should return:
- `"granted"` - Notifications enabled ✓
- `"denied"` - Permission blocked (follow Browser Permission fix above)
- `"default"` - Permission not requested yet (click the Bell toggle)

### Step 3: Test Notification Directly

In browser console:
```javascript
new Notification("Test", { body: "This is a test notification" });
```
If this works, Portboard notifications should work too.

## Technical Details

### How Portboard Notifications Work

1. **Toggle ON**: User clicks Bell icon
2. **Permission Request**: Browser asks for notification permission (if not already granted)
3. **Detection**: Every 5 seconds, Portboard checks for new ports
4. **Filtering**: Excludes Portboard's own ports (3033, 3000)
5. **Notification**: Groups multiple new ports into a single notification
6. **Auto-Close**: Notification automatically closes after 5 seconds

### Excluded Ports

The following ports are automatically excluded from notifications:
- **3033** - Portboard API server
- **3000** - Vite dev server (development only)

### Notification Settings Storage

Settings are stored in `localStorage` with the key:
```
portboard:notifications-enabled
```

To manually check/reset:
```javascript
// Check current setting
localStorage.getItem("portboard:notifications-enabled")

// Reset to default (OFF)
localStorage.removeItem("portboard:notifications-enabled")
```

## Platform-Specific Notes

### macOS

- **Focus Modes** can completely suppress notifications
- **Screen Time** restrictions may block notifications
- **Notification Center** stores all notifications (swipe from right edge of trackpad)

### Windows

- **Focus Assist** (similar to macOS Focus Mode) can suppress notifications
- Check **Settings** → **System** → **Notifications**

### Linux

- Notification behavior depends on desktop environment (GNOME, KDE, etc.)
- Check notification daemon settings (e.g., `dunst`, `notify-osd`)

## Still Having Issues?

1. Try a different browser
2. Check browser console (F12) for error messages
3. Restart your browser
4. Restart your computer (to reset notification permissions)
5. [Open an issue on GitHub](https://github.com/stdhkr/portboard/issues) with:
   - Browser and version
   - Operating system and version
   - Console error messages (if any)
   - Result of verification steps above

## Related Documentation

- [Browser Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [macOS Focus Modes](https://support.apple.com/guide/mac-help/turn-a-focus-on-or-off-mchl999b7c1a/mac)
