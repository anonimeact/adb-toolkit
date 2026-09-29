import * as vscode from "vscode";
import {
  isGlobalOnlyAdbCommand,
  splitAdbArgString,
} from "../core/validators";
import type { ExtensionContextBundle } from "../types";

export async function openShell(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  ctx.adb.openInTerminal(["shell"], {
    serial,
    name: `ADB Shell (${serial})`,
  });
}

export async function runCustomCommand(
  ctx: ExtensionContextBundle,
): Promise<void> {
  const raw = await vscode.window.showInputBox({
    prompt: "Arguments after adb (e.g. shell getprop ro.build.version.release)",
    placeHolder: "shell …",
    validateInput: (v) => (v.trim() ? undefined : "Enter adb arguments"),
  });
  if (!raw) {
    return;
  }
  const tokens = splitAdbArgString(raw.trim());
  if (tokens.length === 0) {
    return;
  }

  let global = false;
  if (isGlobalOnlyAdbCommand(tokens[0])) {
    const choice = await vscode.window.showWarningMessage(
      `"${tokens[0]}" is normally a global adb command (no -s). Run without device serial?`,
      "Global",
      "Cancel",
    );
    if (choice !== "Global") {
      return;
    }
    global = true;
  }

  const serial = global ? undefined : await ctx.devices.resolveSerial();
  if (!global && !serial) {
    return;
  }

  await ctx.adb.run(tokens, { serial, global });
  vscode.window.showInformationMessage("Command finished — see Output channel.");
}
