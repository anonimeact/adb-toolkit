import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { confirmDestructive } from "../core/ui";
import type { ExtensionContextBundle } from "../types";

export async function logcat(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  const filter = vscode.workspace
    .getConfiguration("adbToolkit")
    .get<string>("logcatDefaultFilter", "");
  const extra = filter.trim();
  const args = extra ? ["logcat", ...extra.split(/\s+/)] : ["logcat"];
  ctx.adb.openInTerminal(args, {
    serial,
    name: `ADB Logcat (${serial})`,
  });
}

export async function clearLogcat(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  await ctx.adb.run(["logcat", "-c"], { serial });
  vscode.window.showInformationMessage("Logcat buffers cleared.");
}

export async function screenshot(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  const buf = await ctx.adb.runBuffer(["exec-out", "screencap", "-p"], {
    serial,
  });
  const save = await vscode.window.showSaveDialog({
    filters: { PNG: ["png"] },
    defaultUri: vscode.Uri.file(
      path.join(
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "",
        `screenshot-${Date.now()}.png`,
      ),
    ),
  });
  if (!save) {
    return;
  }
  await fs.promises.writeFile(save.fsPath, buf);
  vscode.window.showInformationMessage(`Screenshot saved: ${save.fsPath}`);
}

export async function screenRecord(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  const seconds = await vscode.window.showInputBox({
    prompt: "Recording duration in seconds (max 180)",
    value: "30",
    validateInput: (v) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 1 || n > 180) {
        return "Enter 1–180";
      }
      return undefined;
    },
  });
  if (!seconds) {
    return;
  }
  const remote = `/sdcard/adb-toolkit-${Date.now()}.mp4`;
  vscode.window.showInformationMessage(
    `Recording ${seconds}s on device. Terminal will run screenrecord; then pull manually or run Pull File for ${remote}`,
  );
  ctx.adb.openInTerminal(
    ["shell", "screenrecord", "--time-limit", seconds, remote],
    { serial, name: "ADB Screen Record" },
  );
  const pull = await vscode.window.showInformationMessage(
    "When recording finishes, pull the file?",
    "Pull now",
    "Later",
  );
  if (pull === "Pull now") {
    const dest = await vscode.window.showSaveDialog({
      filters: { MP4: ["mp4"] },
      defaultUri: vscode.Uri.file(`screenrecord-${Date.now()}.mp4`),
    });
    if (dest) {
      await ctx.adb.run(["pull", remote, dest.fsPath], {
        serial,
        timeoutMs: 300000,
      });
      vscode.window.showInformationMessage(`Saved ${dest.fsPath}`);
    }
  }
}

export async function bugreport(ctx: ExtensionContextBundle): Promise<void> {
  const ok = await confirmDestructive(
    "Generate bugreport?",
    "This may take several minutes and produce a large archive.",
  );
  if (!ok) {
    return;
  }
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  const folder = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    openLabel: "Bugreport output folder",
  });
  const outDir = folder?.[0]?.fsPath;
  if (!outDir) {
    return;
  }
  vscode.window.showInformationMessage("Bugreport started — see Output channel.");
  await ctx.adb.run(["bugreport", outDir], {
    serial,
    timeoutMs: 600000,
  });
  vscode.window.showInformationMessage(`Bugreport written under ${outDir}`);
}

export async function batteryInfo(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  const out = await ctx.adb.run(["shell", "dumpsys", "battery"], { serial });
  const doc = await vscode.workspace.openTextDocument({
    content: out,
    language: "plaintext",
  });
  await vscode.window.showTextDocument(doc);
}

export async function deviceInfo(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  const keys = [
    "ro.product.model",
    "ro.product.manufacturer",
    "ro.build.version.release",
    "ro.build.version.sdk",
    "ro.product.cpu.abi",
    "ro.serialno",
  ];
  const lines: string[] = [];
  for (const key of keys) {
    try {
      const val = await ctx.adb.run(["shell", "getprop", key], { serial });
      lines.push(`${key}=${val}`);
    } catch {
      lines.push(`${key}=`);
    }
  }
  const doc = await vscode.workspace.openTextDocument({
    content: lines.join("\n"),
    language: "plaintext",
  });
  await vscode.window.showTextDocument(doc);
}
