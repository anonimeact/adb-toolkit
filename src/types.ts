import type * as vscode from "vscode";
import type { AdbRunner } from "./core/adbRunner";
import type { DeviceManager } from "./core/deviceManager";
import type { ScrcpyRunner } from "./core/scrcpyRunner";

export interface ExtensionContextBundle {
  vscodeContext: vscode.ExtensionContext;
  adb: AdbRunner;
  scrcpy: ScrcpyRunner;
  devices: DeviceManager;
}

export interface AdbDevice {
  serial: string;
  state: string;
  model?: string;
  product?: string;
  transport?: string;
}
