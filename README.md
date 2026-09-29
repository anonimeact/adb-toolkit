# ADB Toolkit

ADB Toolkit brings common [Android Debug Bridge](https://developer.android.com/tools/adb) workflows into Visual Studio Code: manage the adb server, connect devices, install apps, transfer files, and stream logs—without memorizing CLI flags.

**No telemetry.** Commands run locally via your installed `adb` binary.

## Requirements

- VS Code **1.85+**
- [Android platform-tools](https://developer.android.com/tools/releases/platform-tools) (`adb` on PATH), or set **`adbToolkit.adbPath`**

## Quick start

1. Install the extension.
2. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. Run **`ADB: Show All Actions`** to browse commands with technical descriptions.
4. Click the status bar item **`ADB: …`** to pick the active device (`-s SERIAL`).

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `adbToolkit.adbPath` | `adb` | Path to adb (`adb.exe` on Windows or full path to platform-tools). |
| `adbToolkit.defaultPort` | `5555` | Port for `adb tcpip` / connect hints. |
| `adbToolkit.logcatDefaultFilter` | *(empty)* | Extra logcat args appended in the Logcat terminal. |

## Commands (v1.0)

### Server

| Command | Summary |
|---------|---------|
| ADB: Kill Server | `adb kill-server` |
| ADB: Start Server | `adb start-server` |
| ADB: Restart Server | kill + start |
| ADB: Force Kill All | OS-level kill of adb processes |
| ADB: Show Version | `adb version` |

### Connection & device

Pair, connect, disconnect, list/select devices, reconnect, TCP/IP, USB, mDNS, wait-for-device, get-state, copy device IP.

### Power

Reboot, reboot recovery, reboot bootloader (confirmation required).

### Applications

Install APK (palette or right-click `.apk` in Explorer), uninstall, list packages, clear data, force-stop, launch/restart, grant/revoke permission, extract APK, open URL/deep link.

### Files

Push and pull files (local paths use native dialogs—safe for paths with spaces on Windows).

### Debug & log

Logcat (integrated terminal), clear logcat, screenshot, screen record, bugreport, battery info, device info.

Use **ADB: Show All Actions** for the full catalog with `description` and `detail` lines per command.

## Multi-device

- One authorized device → used automatically.
- Several devices → QuickPick (or status bar) sets the active serial for `-s`.
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
- **no devices** → USB debugging, authorize RSA prompt, run `ADB: List Devices`.
- Long operations (logcat, bugreport) run in a terminal or with extended timeouts—watch the **ADB Toolkit** output channel.

## Roadmap (v1.1+)

Port forwarding (reverse/forward), input/display helpers, root/remount/custom command, devices TreeView. See [CHANGELOG.md](CHANGELOG.md).

## Development

```bash
npm ci
npm run compile
npm run test:unit
# F5 → Run Extension
npm run package   # produces .vsix with vsce
```

## License

MIT — see [LICENSE](LICENSE).
