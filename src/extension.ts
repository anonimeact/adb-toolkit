import * as vscode from "vscode";
import { AdbRunner } from "./core/adbRunner";
import { DeviceManager } from "./core/deviceManager";
import { registerAllCommands } from "./commands/register";
import type { ExtensionContextBundle } from "./types";

let deviceManager: DeviceManager | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const adb = new AdbRunner();
  deviceManager = new DeviceManager(context, adb);

  const bundle: ExtensionContextBundle = {
    vscodeContext: context,
    adb,
    devices: deviceManager,
  };

  registerAllCommands(context, bundle);
}

export function deactivate(): void {
  deviceManager?.dispose();
  deviceManager = undefined;
}
