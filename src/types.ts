import type * as vscode from "vscode";
import type { AdbRunner } from "./core/adbRunner";
import type { DeviceManager } from "./core/deviceManager";

export interface ExtensionContextBundle {
  vscodeContext: vscode.ExtensionContext;
  adb: AdbRunner;
  devices: DeviceManager;
}

export interface AdbDevice {
  serial: string;
  state: string;
  model?: string;
  product?: string;
  transport?: string;
}
