import * as path from "path";
import * as vscode from "vscode";
import {
  confirmDestructive,
  inputPackageName,
  pickPackageFromList,
  pickPackageListFilter,
} from "../core/ui";
import { fetchPackageNames } from "../core/packageList";
import type { ExtensionContextBundle } from "../types";

const LAST_PACKAGE_KEY = "adbToolkit.lastPackage";

async function listPackagesOnDevice(
  ctx: ExtensionContextBundle,
  serial: string,
  flag: "" | "-3" | "-s",
): Promise<string[]> {
  return fetchPackageNames(ctx.adb, serial, flag);
}

async function resolvePackage(
  ctx: ExtensionContextBundle,
): Promise<string | undefined> {
  const last = ctx.vscodeContext.workspaceState.get<string>(LAST_PACKAGE_KEY);
  const useList = await vscode.window.showQuickPick(
    [
      { label: "Pick from installed packages", id: "list" },
      { label: "Enter package name", id: "input" },
      ...(last
        ? [{ label: `Last used: ${last}`, id: "last" }]
        : []),
    ],
    { placeHolder: "Package selection" },
  );
  if (!useList) {
    return undefined;
  }
  let pkg: string | undefined;
  if (useList.id === "last" && last) {
    pkg = last;
  } else if (useList.id === "list") {
    const serial = await ctx.devices.resolveSerial();
    if (!serial) {
      return undefined;
    }
    const filter = await pickPackageListFilter();
    if (!filter) {
      return undefined;
    }
    const packages = await listPackagesOnDevice(ctx, serial, filter.flag);
    pkg = await pickPackageFromList(packages);
  } else {
    pkg = await inputPackageName();
  }
  if (pkg) {
    await ctx.vscodeContext.workspaceState.update(LAST_PACKAGE_KEY, pkg);
  }
  return pkg;
}

export async function installApk(
  ctx: ExtensionContextBundle,
  uri?: vscode.Uri,
): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  let apkPath: string | undefined;
  if (uri?.fsPath) {
    apkPath = uri.fsPath;
  } else {
    const picks = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: { APK: ["apk"] },
    });
    apkPath = picks?.[0]?.fsPath;
  }
  if (!apkPath) {
    return;
  }
  await ctx.adb.run(["install", "-r", apkPath], {
    serial,
    timeoutMs: 120000,
  });
  vscode.window.showInformationMessage(`Installed ${path.basename(apkPath)}`);
}

export async function uninstallApp(ctx: ExtensionContextBundle): Promise<void> {
  const pkg = await resolvePackage(ctx);
  if (!pkg) {
    return;
  }
  const ok = await confirmDestructive(`Uninstall ${pkg}?`);
  if (!ok) {
    return;
  }
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  await ctx.adb.run(["uninstall", pkg], { serial });
  vscode.window.showInformationMessage(`Uninstalled ${pkg}`);
}

export async function listPackages(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  const filter = await pickPackageListFilter();
  if (!filter) {
    return;
  }
  const packages = await listPackagesOnDevice(ctx, serial, filter.flag);
  const doc = await vscode.workspace.openTextDocument({
    content: packages.join("\n"),
    language: "plaintext",
  });
  await vscode.window.showTextDocument(doc, { preview: true });
}

export async function clearAppData(ctx: ExtensionContextBundle): Promise<void> {
  const pkg = await resolvePackage(ctx);
  if (!pkg) {
    return;
  }
  const ok = await confirmDestructive(`Clear all data for ${pkg}?`);
  if (!ok) {
    return;
  }
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  await ctx.adb.run(["shell", "pm", "clear", pkg], { serial });
  vscode.window.showInformationMessage(`Cleared data for ${pkg}`);
}

export async function forceStopApp(ctx: ExtensionContextBundle): Promise<void> {
  const pkg = await resolvePackage(ctx);
  if (!pkg) {
    return;
  }
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  await ctx.adb.run(["shell", "am", "force-stop", pkg], { serial });
  vscode.window.showInformationMessage(`Force-stopped ${pkg}`);
}

export async function launchApp(ctx: ExtensionContextBundle): Promise<void> {
  const pkg = await resolvePackage(ctx);
  if (!pkg) {
    return;
  }
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  await ctx.adb.run(["shell", "monkey", "-p", pkg, "1"], { serial });
  vscode.window.showInformationMessage(`Launched ${pkg}`);
}

export async function restartApp(ctx: ExtensionContextBundle): Promise<void> {
  const pkg = await resolvePackage(ctx);
  if (!pkg) {
    return;
  }
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  await ctx.adb.run(["shell", "am", "force-stop", pkg], { serial });
  await ctx.adb.run(["shell", "monkey", "-p", pkg, "1"], { serial });
  vscode.window.showInformationMessage(`Restarted ${pkg}`);
}

export async function grantPermission(
  ctx: ExtensionContextBundle,
): Promise<void> {
  const pkg = await resolvePackage(ctx);
  if (!pkg) {
    return;
  }
  const perm = await vscode.window.showInputBox({
    prompt: "Permission (e.g. android.permission.CAMERA)",
    validateInput: (v) =>
      v.includes(".") ? undefined : "Enter full permission name",
  });
  if (!perm) {
    return;
  }
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  await ctx.adb.run(["shell", "pm", "grant", pkg, perm.trim()], { serial });
  vscode.window.showInformationMessage(`Granted ${perm} to ${pkg}`);
}

export async function revokePermission(
  ctx: ExtensionContextBundle,
): Promise<void> {
  const pkg = await resolvePackage(ctx);
  if (!pkg) {
    return;
  }
  const perm = await vscode.window.showInputBox({
    prompt: "Permission to revoke",
    validateInput: (v) =>
      v.includes(".") ? undefined : "Enter full permission name",
  });
  if (!perm) {
    return;
  }
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  await ctx.adb.run(["shell", "pm", "revoke", pkg, perm.trim()], { serial });
  vscode.window.showInformationMessage(`Revoked ${perm} from ${pkg}`);
}

export async function extractApk(ctx: ExtensionContextBundle): Promise<void> {
  const pkg = await resolvePackage(ctx);
  if (!pkg) {
    return;
  }
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  const pathOut = await ctx.adb.run(["shell", "pm", "path", pkg], { serial });
  const remote = pathOut
    .split("\n")
    .map((l) => l.replace(/^package:/, "").trim())
    .find(Boolean);
  if (!remote) {
    vscode.window.showErrorMessage("Could not resolve APK path on device.");
    return;
  }
  const folder = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    openLabel: "Save APK here",
  });
  const destDir = folder?.[0]?.fsPath;
  if (!destDir) {
    return;
  }
  const dest = path.join(destDir, `${pkg}.apk`);
  await ctx.adb.run(["pull", remote, dest], { serial, timeoutMs: 120000 });
  vscode.window.showInformationMessage(`APK saved to ${dest}`);
}

export async function openUrl(ctx: ExtensionContextBundle): Promise<void> {
  const url = await vscode.window.showInputBox({
    prompt: "URL or deep link",
    validateInput: (v) => (v.trim() ? undefined : "URL required"),
  });
  if (!url) {
    return;
  }
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  await ctx.adb.run(
    [
      "shell",
      "am",
      "start",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      url.trim(),
    ],
    { serial },
  );
  vscode.window.showInformationMessage("VIEW intent sent.");
}
