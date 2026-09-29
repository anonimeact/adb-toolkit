import * as vscode from "vscode";
import { inputRemotePath } from "../core/ui";
import type { ExtensionContextBundle } from "../types";

export async function pushFile(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  const local = await vscode.window.showOpenDialog({ canSelectMany: false });
  const localPath = local?.[0]?.fsPath;
  if (!localPath) {
    return;
  }
  const remote = await inputRemotePath("Remote destination path", "/sdcard/");
  if (!remote) {
    return;
  }
  await ctx.adb.run(["push", localPath, remote], {
    serial,
    timeoutMs: 300000,
  });
  vscode.window.showInformationMessage(`Pushed to ${remote}`);
}

export async function pullFile(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  const remote = await inputRemotePath("Remote file path");
  if (!remote) {
    return;
  }
  const local = await vscode.window.showSaveDialog({});
  if (!local) {
    return;
  }
  const localPath = local.fsPath;
  await ctx.adb.run(["pull", remote, localPath], {
    serial,
    timeoutMs: 300000,
  });
  vscode.window.showInformationMessage(`Pulled to ${localPath}`);
}
