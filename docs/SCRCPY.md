# scrcpy setup for ADB Toolkit

**ADB Toolkit does not include scrcpy.** You must install scrcpy on your computer before using **ADB: Mirror with scrcpy**. The extension only runs your installed `scrcpy` binary (see `adbToolkit.scrcpyPath` in settings).

You also need **adb** working (USB debugging authorized, or wireless `adb connect`) — same as the rest of this extension.

## Verify installation

In a terminal (the same environment VS Code/Cursor uses):

```bash
scrcpy --version
```

If that fails inside the IDE but works in your system terminal, set **`adbToolkit.scrcpyPath`** to the full path of the executable.

After install, run **ADB: Scrcpy Version** in the Command Palette to confirm the extension can find scrcpy.

---

## macOS

1. Install scrcpy (recommended):

   ```bash
   brew install scrcpy
   ```

2. Ensure **adb** is available:

   ```bash
   brew install android-platform-tools
   ```

   Or use the `adb` from Android Studio SDK platform-tools.

3. Typical paths:

   - Apple Silicon: `/opt/homebrew/bin/scrcpy`
   - Intel: `/usr/local/bin/scrcpy`

4. Set `adbToolkit.scrcpyPath` if the IDE cannot find `scrcpy` on PATH.

---

## Windows

1. **Scoop** (recommended):

   ```powershell
   scoop install scrcpy
   ```

2. **Chocolatey**:

   ```powershell
   choco install scrcpy
   ```

3. **Manual**: download a release from [Genymobile/scrcpy releases](https://github.com/Genymobile/scrcpy/releases), extract, add the folder to **PATH**, or set `adbToolkit.scrcpyPath` to `scrcpy.exe`.

4. Enable USB debugging on the device; install OEM USB drivers if the device is not detected.

5. Allow scrcpy through Windows Firewall on first run if prompted.

---

## Linux

**Debian / Ubuntu**

```bash
sudo apt update
sudo apt install scrcpy
```

Or Snap (often newer):

```bash
sudo snap install scrcpy
```

**Fedora**

```bash
sudo dnf install scrcpy
```

**Arch Linux**

```bash
sudo pacman -S scrcpy
```

Configure **udev rules** for adb if the device stays unauthorized — see the main README Linux troubleshooting section.

---

## Wireless mirroring

Use the same device serial as adb (e.g. `192.168.1.10:5555`) after `adb connect`. Select the device in the ADB Toolkit sidebar or status bar, then run **ADB: Mirror with scrcpy**.

### mDNS / Wi‑Fi pairing serials (spaces in the name)

If `adb devices` shows a serial like `adb-XXXX (2)._adb-tls-connect._tcp`, **adb** accepts it, but **scrcpy 3.x** often fails with `Could not find ADB device` because scrcpy parses the device list by spaces. This is not specific to macOS.

**Fix (recommended):** use a classic TCP serial without spaces:

1. Run **ADB: Enable TCP/IP** (or `adb tcpip 5555` with your device selected).
2. `adb connect <phone-ip>:5555` (same Wi‑Fi; get IP from **ADB: Copy Device IP** if needed).
3. In the sidebar, select the `ip:port` device and run **ADB: Mirror with scrcpy** again.

**ADB: Mirror with scrcpy** can also offer **Switch to TCP and mirror** when it detects this serial shape.

---

## More help

- Official project: [github.com/Genymobile/scrcpy](https://github.com/Genymobile/scrcpy)
- Extension setting: `adbToolkit.scrcpyExtraArgs` for default flags (e.g. `--no-audio`)
