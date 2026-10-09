# ADB Toolkit

ADB Toolkit brings common [Android Debug Bridge](https://developer.android.com/tools/adb) workflows into Visual Studio Code: manage the adb server, connect devices, install apps, transfer files, and stream logs—without memorizing CLI flags.

**No telemetry.** Commands run locally via your installed `adb` binary.

## Requirements

- VS Code **1.85+**
- [Android platform-tools](https://developer.android.com/tools/releases/platform-tools) (`adb` on PATH), or set **`adbToolkit.adbPath`**
- **[scrcpy](https://github.com/Genymobile/scrcpy)** (optional, for screen mirroring only — not bundled). See [docs/SCRCPY.md](docs/SCRCPY.md).

## Quick start

1. Install the extension.
2. Open the **ADB Toolkit** activity bar icon → **Devices** sidebar (or use the status bar).
3. Run **`ADB: Show All Actions`** to browse commands with technical descriptions.
4. Click the status bar item **`ADB: …`** or a device in the sidebar to set the active serial (`-s SERIAL`).

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `adbToolkit.adbPath` | `adb` | Path to adb (`adb.exe` on Windows or full path to platform-tools). |
| `adbToolkit.defaultPort` | `5555` | Port for `adb tcpip` / connect hints. |
| `adbToolkit.logcatDefaultFilter` | *(empty)* | Extra logcat filter tokens (tags, `-s`, etc.). |
| `adbToolkit.logcatViewer` | `terminal` | Default logcat UI: `terminal` or `webview`. |
| `adbToolkit.deviceRefreshIntervalMs` | `5000` | Device tree auto-refresh interval (`0` = off). |
| `adbToolkit.scrcpyPath` | `scrcpy` | Path to scrcpy for mirroring (manual install). |
| `adbToolkit.scrcpyExtraArgs` | *(empty)* | Extra flags for every scrcpy session (e.g. `--no-audio`). |

### Installing scrcpy

Mirroring requires scrcpy on your system. Full OS-specific steps: **[docs/SCRCPY.md](docs/SCRCPY.md)**. Run **ADB: Scrcpy Setup Guide** from the command palette.

## Devices sidebar (v1.1)

- Lists devices from `adb devices -l`; active device highlighted.
- Toolbar **Refresh** or **ADB: Refresh Devices**.
- Right-click: copy serial; disconnect wireless endpoints; **Mirror with scrcpy** (when scrcpy is installed).

## Commands (v1.1)

### Server

Kill/start/restart server, force-kill host adb, show version.

### Connection & device

Pair, connect, disconnect, list/select devices, reconnect, TCP/IP, USB, mDNS, wait-for-device, get-state, copy device IP, refresh devices.

### Power

Reboot, reboot recovery, reboot bootloader (confirmation required).

### Applications

Install APK (palette or right-click `.apk` in Explorer), uninstall, list packages, clear data, force-stop, launch/restart, grant/revoke permission, extract APK, open URL/deep link.

### Files

Push and pull files (local paths use native dialogs—safe for paths with spaces on Windows).

### Port forwarding

Forward, reverse, list forwards, remove all (per device).

### Shell & custom

Open interactive `adb shell` in a terminal; run custom adb arguments (global-only commands require confirmation).

### Display & mirror

**ADB: Mirror with scrcpy** — dedicated terminal tab; optional presets. **ADB: Scrcpy Setup Guide** and **ADB: Scrcpy Version** if you need install help or verification.

### Debug & log

**ADB: Logcat** — choose terminal or webview, then level, optional app list + package (searchable QuickPick), optional tag tokens.

**Webview logcat** — change user/system/all app list and package from the panel (search + Apply); min-level filter; clear; pause/resume stream (new logs only after each start, via `logcat -T`); copy. App name in the tab title when a package is filtered.

Also: clear logcat, screenshot, screen record, bugreport, battery info, device info.

Use **ADB: Show All Actions** for the full catalog with `description` and `detail` lines per command.

## Multi-device

- One authorized device → used automatically.
- Several devices → QuickPick, status bar, or Devices sidebar sets the active serial for `-s`.
- Global commands (server, connect, pair, `devices`, mDNS) do not use `-s`.

## Troubleshooting

### Windows

- Install platform-tools; default SDK path: `%LOCALAPPDATA%\Android\Sdk\platform-tools`.
- Add folder to **PATH** or set `adbToolkit.adbPath` to `adb.exe` full path.
- Allow adb through Windows Firewall for wireless debugging.

### Linux

- Install `android-sdk-platform-tools` or unpack Google platform-tools.
- If the device stays **unauthorized**, configure [udev rules](https://developer.android.com/tools/device#udev) for your vendor ID.

### macOS

- Platform-tools via Android Studio or Homebrew; ensure `adb` is on PATH in the environment VS Code inherits.
- For wireless pairing, phone and Mac must be on the same network without AP isolation.

### General

- **adb not found** → set `adbToolkit.adbPath`.
- **no devices** → USB debugging, authorize RSA prompt, run **ADB: Refresh Devices**.
- Long operations (logcat, bugreport) run in a terminal or webview—watch the **ADB Toolkit** output channel for other commands.

## Roadmap

Input helpers, root/remount. See [CHANGELOG.md](CHANGELOG.md).

## Development

```bash
npm ci
npm run compile
npm run test:unit
# F5 → Run Extension
npx @vscode/vsce package   # → adb-toolkit-1.2.1.vsix
```

### Publish (maintainers)

```bash
npm run compile
npx @vscode/vsce package
# Extensions: Install from VSIX… (local test)
# npx @vscode/vsce publish   # when marketplace token is configured
```

## License

MIT — see [LICENSE](LICENSE).
