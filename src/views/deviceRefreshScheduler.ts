import * as vscode from "vscode";
import type { DeviceManager } from "../core/deviceManager";

export function startDeviceRefreshScheduler(
  devices: DeviceManager,
  context: vscode.ExtensionContext,
): void {
  let timer: ReturnType<typeof setInterval> | undefined;

  const apply = () => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
    const ms = vscode.workspace
      .getConfiguration("adbToolkit")
      .get<number>("deviceRefreshIntervalMs", 5000);
    if (ms > 0) {
      timer = setInterval(() => {
        void devices.refreshDevices();
      }, ms);
    }
  };

  apply();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("adbToolkit.deviceRefreshIntervalMs")) {
        apply();
      }
    }),
    { dispose: () => timer && clearInterval(timer) },
  );
}
