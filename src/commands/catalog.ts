export type CommandGroup =
  | "server"
  | "connection"
  | "power"
  | "apps"
  | "files"
  | "debug"
  | "menu";

export interface CommandMeta {
  id: string;
  title: string;
  group: CommandGroup;
  description: string;
  detail: string;
  needsDevice?: boolean;
  destructive?: boolean;
}

export const GROUP_LABELS: Record<CommandGroup, string> = {
  server: "Server",
  connection: "Connection & Device",
  power: "Power & Reboot",
  apps: "Applications",
  files: "Files",
  debug: "Debug & Log",
  menu: "Menu",
};

export const COMMAND_CATALOG: CommandMeta[] = [
  {
    id: "adbToolkit.killServer",
    title: "ADB: Kill Server",
    group: "server",
    description: "Stop the host adb daemon and close its listening socket.",
    detail: "adb kill-server",
  },
  {
    id: "adbToolkit.startServer",
    title: "ADB: Start Server",
    group: "server",
    description: "Start adb server (default port 5037) if not running.",
    detail: "adb start-server",
  },
  {
    id: "adbToolkit.restartServer",
    title: "ADB: Restart Server",
    group: "server",
    description: "Kill then start adb server; resets server-side device list.",
    detail: "adb kill-server → adb start-server",
  },
  {
    id: "adbToolkit.forceKill",
    title: "ADB: Force Kill All",
    group: "server",
    description:
      "Force-terminate all adb OS processes on the host (outside adb CLI).",
    detail:
      "macOS/Linux: killall -9 adb; Windows: taskkill /F /IM adb.exe",
  },
  {
    id: "adbToolkit.showVersion",
    title: "ADB: Show Version",
    group: "server",
    description: "Print platform-tools ADB build version.",
    detail: "adb version",
  },
  {
    id: "adbToolkit.pair",
    title: "ADB: Pair",
    group: "connection",
    description: "Pair wireless debugging using a one-time code (Android 11+).",
    detail: "adb pair HOST:PORT CODE",
  },
  {
    id: "adbToolkit.connect",
    title: "ADB: Connect",
    group: "connection",
    description: "Open a TCP transport to a device at the given endpoint.",
    detail: "adb connect HOST:PORT",
  },
  {
    id: "adbToolkit.disconnect",
    title: "ADB: Disconnect",
    group: "connection",
    description: "Drop TCP connection for one wireless/emulator endpoint.",
    detail: "adb disconnect HOST:PORT",
  },
  {
    id: "adbToolkit.disconnectAll",
    title: "ADB: Disconnect All",
    group: "connection",
    description: "Disconnect every adb connect TCP session.",
    detail: "adb disconnect",
  },
  {
    id: "adbToolkit.listDevices",
    title: "ADB: List Devices",
    group: "connection",
    description:
      "List attached devices/emulators with state and devices -l properties.",
    detail: "adb devices -l",
  },
  {
    id: "adbToolkit.selectDevice",
    title: "ADB: Select Active Device",
    group: "connection",
    description: "Set the active device serial used for -s on per-device commands.",
    detail: "Extension state → adb -s SERIAL …",
  },
  {
    id: "adbToolkit.reconnect",
    title: "ADB: Reconnect",
    group: "connection",
    description: "Reset connection; optionally target offline devices only.",
    detail: "adb reconnect or adb reconnect offline",
  },
  {
    id: "adbToolkit.enableTcpIp",
    title: "ADB: Enable TCP/IP",
    group: "connection",
    description:
      "Restart adbd in TCP mode on the given port (USB connection required once).",
    detail: "adb tcpip PORT (default 5555)",
    needsDevice: true,
  },
  {
    id: "adbToolkit.switchUsb",
    title: "ADB: Switch to USB",
    group: "connection",
    description: "Switch adbd back to USB mode on the device.",
    detail: "adb usb",
    needsDevice: true,
  },
  {
    id: "adbToolkit.mdnsDiscover",
    title: "ADB: Discover Devices (mDNS)",
    group: "connection",
    description: "List discovered wireless debugging services on the LAN.",
    detail: "adb mdns services",
  },
  {
    id: "adbToolkit.waitForDevice",
    title: "ADB: Wait for Device",
    group: "connection",
    description: "Block until adb reports a device in device state.",
    detail: "adb wait-for-device (integrated terminal)",
  },
  {
    id: "adbToolkit.getState",
    title: "ADB: Get State",
    group: "connection",
    description: "Return connection state for the selected device.",
    detail: "adb get-state → device | offline | unauthorized",
    needsDevice: true,
  },
  {
    id: "adbToolkit.copyDeviceIp",
    title: "ADB: Copy Device IP",
    group: "connection",
    description: "Resolve WLAN IPv4 on device and copy to clipboard.",
    detail: "adb shell ip route / ip addr show wlan0",
    needsDevice: true,
  },
  {
    id: "adbToolkit.reboot",
    title: "ADB: Reboot",
    group: "power",
    description: "Reboot the device into normal Android.",
    detail: "adb reboot",
    needsDevice: true,
    destructive: true,
  },
  {
    id: "adbToolkit.rebootRecovery",
    title: "ADB: Reboot to Recovery",
    group: "power",
    description: "Reboot into recovery partition.",
    detail: "adb reboot recovery",
    needsDevice: true,
    destructive: true,
  },
  {
    id: "adbToolkit.rebootBootloader",
    title: "ADB: Reboot to Bootloader",
    group: "power",
    description: "Reboot into bootloader/fastboot.",
    detail: "adb reboot bootloader",
    needsDevice: true,
    destructive: true,
  },
  {
    id: "adbToolkit.installApk",
    title: "ADB: Install APK",
    group: "apps",
    description: "Install or replace an APK on the selected device (-r).",
    detail: "adb install -r PATH.apk",
    needsDevice: true,
  },
  {
    id: "adbToolkit.uninstallApp",
    title: "ADB: Uninstall App",
    group: "apps",
    description: "Remove an installed package and its data.",
    detail: "adb uninstall PACKAGE",
    needsDevice: true,
    destructive: true,
  },
  {
    id: "adbToolkit.listPackages",
    title: "ADB: List Packages",
    group: "apps",
    description: "List installed packages; optional third-party or system filter.",
    detail: "adb shell pm list packages [-3|-s]",
    needsDevice: true,
  },
  {
    id: "adbToolkit.clearAppData",
    title: "ADB: Clear App Data",
    group: "apps",
    description: "Wipe app user data and cache for one package.",
    detail: "adb shell pm clear PACKAGE",
    needsDevice: true,
    destructive: true,
  },
  {
    id: "adbToolkit.forceStopApp",
    title: "ADB: Force Stop App",
    group: "apps",
    description: "Stop running processes for the package.",
    detail: "adb shell am force-stop PACKAGE",
    needsDevice: true,
  },
  {
    id: "adbToolkit.launchApp",
    title: "ADB: Launch App",
    group: "apps",
    description: "Start the app's launcher activity via monkey stub.",
    detail: "adb shell monkey -p PACKAGE 1",
    needsDevice: true,
  },
  {
    id: "adbToolkit.restartApp",
    title: "ADB: Restart App",
    group: "apps",
    description: "Force-stop then launch the package.",
    detail: "am force-stop + monkey -p PACKAGE 1",
    needsDevice: true,
  },
  {
    id: "adbToolkit.grantPermission",
    title: "ADB: Grant Permission",
    group: "apps",
    description: "Grant a runtime permission to the app.",
    detail: "adb shell pm grant PACKAGE android.permission.*",
    needsDevice: true,
  },
  {
    id: "adbToolkit.revokePermission",
    title: "ADB: Revoke Permission",
    group: "apps",
    description: "Revoke a runtime permission from the app.",
    detail: "adb shell pm revoke PACKAGE android.permission.*",
    needsDevice: true,
  },
  {
    id: "adbToolkit.extractApk",
    title: "ADB: Extract APK",
    group: "apps",
    description: "Copy the installed APK from device storage to the host.",
    detail: "adb shell pm path PACKAGE → adb pull APK_PATH",
    needsDevice: true,
  },
  {
    id: "adbToolkit.openUrl",
    title: "ADB: Open URL / Deep Link",
    group: "apps",
    description: "Fire VIEW intent with the given URI (deep link / browser).",
    detail: "adb shell am start -a android.intent.action.VIEW -d URI",
    needsDevice: true,
  },
  {
    id: "adbToolkit.pushFile",
    title: "ADB: Push File",
    group: "files",
    description: "Copy a host file into device filesystem.",
    detail: "adb push LOCAL_PATH REMOTE_PATH",
    needsDevice: true,
  },
  {
    id: "adbToolkit.pullFile",
    title: "ADB: Pull File",
    group: "files",
    description: "Copy a device file to the host.",
    detail: "adb pull REMOTE_PATH LOCAL_PATH",
    needsDevice: true,
  },
  {
    id: "adbToolkit.logcat",
    title: "ADB: Logcat",
    group: "debug",
    description: "Stream system log buffer in an integrated terminal.",
    detail: "adb logcat [optional filters]",
    needsDevice: true,
  },
  {
    id: "adbToolkit.clearLogcat",
    title: "ADB: Clear Logcat",
    group: "debug",
    description: "Clear on-device log buffers.",
    detail: "adb logcat -c",
    needsDevice: true,
  },
  {
    id: "adbToolkit.screenshot",
    title: "ADB: Screenshot",
    group: "debug",
    description: "Capture framebuffer as PNG via adb binary stream.",
    detail: "adb exec-out screencap -p",
    needsDevice: true,
  },
  {
    id: "adbToolkit.screenRecord",
    title: "ADB: Screen Record",
    group: "debug",
    description: "Record screen on device, then pull the MP4.",
    detail: "adb shell screenrecord → adb pull",
    needsDevice: true,
  },
  {
    id: "adbToolkit.bugreport",
    title: "ADB: Bugreport",
    group: "debug",
    description: "Generate full bugreport archive (large, slow).",
    detail: "adb bugreport OUTPUT_DIR",
    needsDevice: true,
    destructive: true,
  },
  {
    id: "adbToolkit.batteryInfo",
    title: "ADB: Battery Info",
    group: "debug",
    description: "Dump battery service state (level, status, health).",
    detail: "adb shell dumpsys battery",
    needsDevice: true,
  },
  {
    id: "adbToolkit.deviceInfo",
    title: "ADB: Device Info",
    group: "debug",
    description: "Show key getprop fields: model, release, SDK, ABI.",
    detail: "adb shell getprop ro.product.* ro.build.version.*",
    needsDevice: true,
  },
  {
    id: "adbToolkit.showActions",
    title: "ADB: Show All Actions",
    group: "menu",
    description:
      "Browse all ADB Toolkit commands by category with technical summaries.",
    detail: "Opens grouped QuickPick from catalog",
  },
];

export function getMetaById(id: string): CommandMeta | undefined {
  return COMMAND_CATALOG.find((c) => c.id === id);
}
