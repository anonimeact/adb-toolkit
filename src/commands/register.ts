import * as vscode from "vscode";
import type { ExtensionContextBundle } from "../types";
import { runCommand } from "./helpers";
import * as server from "./server";
import * as connection from "./connection";
import * as power from "./power";
import * as apps from "./apps";
import * as files from "./files";
import * as debug from "./debug";
import * as forwarding from "./forwarding";
import * as shell from "./shell";
import * as scrcpy from "./scrcpy";
import * as devicesView from "./devicesView";
import { acceptConnectAddressTab } from "../core/ui";
import { showActions } from "./actionsMenu";
import { getMetaById } from "./catalog";
import type { DeviceTreeItem } from "../views/devicesTreeProvider";

type Handler = (
  ctx: ExtensionContextBundle,
  uri?: vscode.Uri,
) => Promise<void>;

const HANDLERS: Record<string, Handler> = {
  "adbToolkit.killServer": server.killServer,
  "adbToolkit.startServer": server.startServer,
  "adbToolkit.restartServer": server.restartServer,
  "adbToolkit.forceKill": server.forceKill,
  "adbToolkit.showVersion": server.showVersion,
  "adbToolkit.pair": connection.pair,
  "adbToolkit.connect": connection.connect,
  "adbToolkit.disconnect": connection.disconnect,
  "adbToolkit.disconnectAll": connection.disconnectAll,
  "adbToolkit.listDevices": connection.listDevices,
  "adbToolkit.selectDevice": connection.selectDevice,
  "adbToolkit.reconnect": connection.reconnect,
  "adbToolkit.enableTcpIp": connection.enableTcpIp,
  "adbToolkit.switchUsb": connection.switchUsb,
  "adbToolkit.mdnsDiscover": connection.mdnsDiscover,
  "adbToolkit.waitForDevice": connection.waitForDevice,
  "adbToolkit.getState": connection.getState,
  "adbToolkit.copyDeviceIp": connection.copyDeviceIp,
  "adbToolkit.reboot": power.reboot,
  "adbToolkit.rebootRecovery": power.rebootRecovery,
  "adbToolkit.rebootBootloader": power.rebootBootloader,
  "adbToolkit.installApk": apps.installApk,
  "adbToolkit.uninstallApp": apps.uninstallApp,
  "adbToolkit.listPackages": apps.listPackages,
  "adbToolkit.clearAppData": apps.clearAppData,
  "adbToolkit.forceStopApp": apps.forceStopApp,
  "adbToolkit.launchApp": apps.launchApp,
  "adbToolkit.restartApp": apps.restartApp,
  "adbToolkit.grantPermission": apps.grantPermission,
  "adbToolkit.revokePermission": apps.revokePermission,
  "adbToolkit.extractApk": apps.extractApk,
  "adbToolkit.openUrl": apps.openUrl,
  "adbToolkit.pushFile": files.pushFile,
  "adbToolkit.pullFile": files.pullFile,
  "adbToolkit.logcat": debug.logcat,
  "adbToolkit.logcatChooseViewer": debug.logcatChooseViewer,
  "adbToolkit.clearLogcat": debug.clearLogcat,
  "adbToolkit.screenshot": debug.screenshot,
  "adbToolkit.screenRecord": debug.screenRecord,
  "adbToolkit.bugreport": debug.bugreport,
  "adbToolkit.batteryInfo": debug.batteryInfo,
  "adbToolkit.deviceInfo": debug.deviceInfo,
  "adbToolkit.refreshDevices": devicesView.refreshDevices,
  "adbToolkit.forwardPort": forwarding.forwardPort,
  "adbToolkit.reversePort": forwarding.reversePort,
  "adbToolkit.listForwards": forwarding.listForwards,
  "adbToolkit.removeAllForwards": forwarding.removeAllForwards,
  "adbToolkit.openShell": shell.openShell,
  "adbToolkit.runCustomCommand": shell.runCustomCommand,
  "adbToolkit.mirrorScrcpy": (ctx) => scrcpy.mirrorScrcpy(ctx),
  "adbToolkit.scrcpySetupGuide": scrcpy.scrcpySetupGuide,
  "adbToolkit.scrcpyVersion": scrcpy.scrcpyVersion,
};

export function registerAllCommands(
  context: vscode.ExtensionContext,
  bundle: ExtensionContextBundle,
): void {
  const executeId = async (id: string, uri?: vscode.Uri) => {
    if (id === "adbToolkit.showActions") {
      await showActions(bundle, (cmdId) => executeId(cmdId));
      return;
    }
    const handler = HANDLERS[id];
    if (!handler) {
      vscode.window.showErrorMessage(`Unknown command: ${id}`);
      return;
    }
    const meta = getMetaById(id);
    await runCommand(meta?.title ?? id, () => handler(bundle, uri));
  };

  for (const [id, handler] of Object.entries(HANDLERS)) {
    if (id === "adbToolkit.mirrorScrcpy") {
      continue;
    }
    const meta = getMetaById(id);
    context.subscriptions.push(
      vscode.commands.registerCommand(id, (uri?: vscode.Uri) =>
        runCommand(meta?.title ?? id, () => handler(bundle, uri)),
      ),
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("adbToolkit.showActions", () =>
      showActions(bundle, (cmdId) => executeId(cmdId)),
    ),
    vscode.commands.registerCommand("adbToolkit.connectAddressTab", () => {
      acceptConnectAddressTab();
    }),
    vscode.commands.registerCommand("adbToolkit.treeSelectDevice", (serial?: string) =>
      runCommand("ADB: Select Device", () =>
        devicesView.treeSelectDevice(bundle, serial),
      ),
    ),
    vscode.commands.registerCommand(
      "adbToolkit.copyDeviceSerial",
      (item?: DeviceTreeItem) =>
        runCommand("ADB: Copy Device Serial", () =>
          devicesView.copyDeviceSerial(bundle, item),
        ),
    ),
    vscode.commands.registerCommand(
      "adbToolkit.disconnectTreeDevice",
      (item?: DeviceTreeItem) =>
        runCommand("ADB: Disconnect Device", () =>
          devicesView.disconnectTreeDevice(bundle, item),
        ),
    ),
    vscode.commands.registerCommand(
      "adbToolkit.mirrorScrcpy",
      (item?: DeviceTreeItem) =>
        runCommand("ADB: Mirror with scrcpy", () =>
          scrcpy.mirrorScrcpy(bundle, item?.device?.serial),
        ),
    ),
  );
}
