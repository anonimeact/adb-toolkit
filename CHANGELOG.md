# Change Log

## 1.2.1

### Connect

- **ADB: Connect** is an address field. Type `ip:port` and press Enter. The extra **Enter new address** row is gone.
- Recent endpoints stay in that field (newest first, **at most 5**). A sixth address drops the oldest.
- Each saved host also appears as **IP only**, so a new wireless-debugging port can be typed after the IP (`192.168.18.12:`).
- Connect, pair, and disconnect success toasts use adb’s own line (`connected to …`, `already connected to …`, `disconnected …`).
- The connect field starts empty. Typing or clearing is not overwritten by the list. **Tab** inserts the highlighted row (**IP only** → `192.168.18.12:`); after you move with the keyboard, Tab fills that row instead of skipping to the next endpoint. Enter or choosing another row replaces the field; Enter connects when it shows a full address.

### Command results

- A success toast is no longer shown when adb prints a failure and still exits 0. The notification is adb’s text, for example `failed to connect to '192.168.18.12:39029': No route to host`.
- Covers connect, disconnect, pair, install, uninstall, push, pull, forward, reverse, tcpip, usb, reconnect, and shell helpers (`pm clear` / `grant` / `revoke`, `am start`, `monkey`).
- When adb exits non-zero, the toast shows adb’s stdout/stderr instead of Node’s `Command failed:` wrapper.

## 1.2.0

### Display & mirror (scrcpy)

- **ADB: Mirror with scrcpy** — starts scrcpy in a dedicated integrated terminal tab per device (`scrcpy (SERIAL)`). Session QuickPick with plain-language options: standard mirror, keep phone awake, lower resolution (1024px), turn off phone screen, or custom flags (combined with `adbToolkit.scrcpyExtraArgs`).
- **scrcpy is not bundled** — install on your machine; modal with **Open Setup Guide** / releases link when scrcpy is missing.
- **ADB: Scrcpy Setup Guide** — opens `docs/SCRCPY.md` (macOS, Windows, Linux install steps).
- **ADB: Scrcpy Version** — runs `scrcpy --version` for verification.
- Settings: **`adbToolkit.scrcpyPath`**, **`adbToolkit.scrcpyExtraArgs`**.
- New command catalog group **Display & Mirror**; devices sidebar context menu to mirror the selected device.
- **Wireless mDNS serials** (names with spaces, e.g. `adb-… (2)._adb-tls-connect._tcp`): scrcpy cannot use them directly; the extension offers **Switch to TCP and mirror** (`adb tcpip` + `connect` → `ip:port` serial). Documented in `docs/SCRCPY.md`.

### Devices & connection

- **Device list parsing** — correct serial/state for mDNS Wi‑Fi pairing lines that contain spaces (fixes “no device in device state” when one device was listed).
- **Device picker UI** — model name prominent (e.g. `M2101K6G (wireless)`); serial and `mobile` on the dimmed line; **Current Device** for the active serial in QuickPick and sidebar.
- Clearer error when devices are connected but none are in `device` state (lists serial and state).
- Ignore `* daemon …` lines from `adb devices` output when parsing.

### Other

- README: scrcpy requirement, link to `docs/SCRCPY.md`, mirror commands.

## 1.1.0

### Devices sidebar

- Activity bar **ADB Toolkit** view with device tree from `adb devices -l`.
- Auto-refresh via `adbToolkit.deviceRefreshIntervalMs` (default 5s; `0` disables).
- **ADB: Refresh Devices**; click device to set active serial (status bar stays in sync).
- Context menu: copy serial; disconnect wireless/TCP endpoints.

### Logcat

- **Terminal or webview** per run or default `adbToolkit.logcatViewer`; **ADB: Logcat Viewer Setting**.
- Wizard: log level, optional app list (user-installed / system / all) and package search, optional tag tokens; Escape cancels the flow.
- **Webview panel**: app list + package search (list shown while search is focused), Apply, min-level filter, clear, **pause/resume stream**, copy.
- Package filter resolves app label for panel title; stream uses `logcat -T` on each start so resume does not dump the whole ring buffer.
- App label resolved from `dumpsys package` when filtering by package.

### Port forwarding

- **ADB: Forward Port**, **Reverse Port**, **List Forwards**, **Remove All Forwards** (per device).

### Shell

- **ADB: Open Shell** (integrated terminal).
- **ADB: Run Custom Command** with guard for global-only adb subcommands.

### Other

- User-friendly labels for installed-app list prompts (replacing `-3` / `-s` jargon).
- Activity bar icon uses `media/icon.png` for better visibility in Cursor/VS Code.

## 1.0.1

- Update extension marketplace icon (`media/icon.png`).

## 1.0.0

- Initial release: ADB commands categories A–F (server, connection, power, apps, files, debug).
- Command catalog with technical descriptions in **ADB: Show All Actions**.
- Multi-device support with status bar active serial.
- Settings: `adbToolkit.adbPath`, `adbToolkit.defaultPort`, `adbToolkit.logcatDefaultFilter`.
- Explorer context menu: Install APK on `.apk` files.
- Cross-platform: Windows, Linux, macOS (`execFile`, platform-specific force kill).

## Roadmap

- **Input & display** (beyond scrcpy): send text, key events, `wm` size/density, dark mode.
- **Advanced**: root/unroot, remount.
