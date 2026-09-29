import * as vscode from "vscode";
import { AdbRunner } from "./core/adbRunner";
import { ScrcpyRunner } from "./core/scrcpyRunner";
import { DeviceManager } from "./core/deviceManager";
import { registerAllCommands } from "./commands/register";
import type { ExtensionContextBundle } from "./types";
import { DevicesTreeProvider } from "./views/devicesTreeProvider";
import { startDeviceRefreshScheduler } from "./views/deviceRefreshScheduler";
import { LogcatPanel } from "./views/logcatPanel";

let deviceManager: DeviceManager | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const adb = new AdbRunner();
  const scrcpy = new ScrcpyRunner();
  deviceManager = new DeviceManager(context, adb);

  const bundle: ExtensionContextBundle = {
    vscodeContext: context,
    adb,
    scrcpy,
    devices: deviceManager,
  };

  const treeProvider = new DevicesTreeProvider(deviceManager);
  context.subscriptions.push(
    vscode.window.createTreeView("adbToolkit.devices", {
      treeDataProvider: treeProvider,
      showCollapseAll: false,
    }),
  );

  startDeviceRefreshScheduler(deviceManager, context);
  registerAllCommands(context, bundle);
  void deviceManager.refreshDevices();
}

export function deactivate(): void {
  LogcatPanel.disposeAll();
  deviceManager?.dispose();
  deviceManager = undefined;
}
