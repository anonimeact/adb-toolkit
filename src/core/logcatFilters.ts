import * as vscode from "vscode";
import {
  pickPackageFromList,
  inputPackageName,
  pickPackageListFilter,
} from "./ui";
import type { AdbRunner } from "./adbRunner";
import { resolveApplicationLabel } from "./appLabel";
import type { PackageListFlag } from "./packageList";
import {
  buildLogcatArgs,
  parseLogcatDefaultFilter,
  type LogcatLevel,
} from "./logcatArgs";

export type { LogcatLevel } from "./logcatArgs";
export { buildLogcatArgs, parseLogcatDefaultFilter };

export interface LogcatFilterResult {
  logcatArgs: string[];
  level: LogcatLevel | "all";
  extraTokens: string[];
  packageName?: string;
  appLabel?: string;
  packageListFlag: PackageListFlag;
}

export async function resolvePackagePid(
  adb: AdbRunner,
  serial: string,
  packageName: string,
): Promise<string | undefined> {
  try {
    const out = await adb.run(
      ["shell", "pidof", "-s", packageName],
      { serial, timeoutMs: 10000 },
    );
    const pid = out.trim().split(/\s+/)[0];
    if (/^\d+$/.test(pid)) {
      return pid;
    }
  } catch {
    // fallback
  }
  try {
    const out = await adb.run(["shell", "pidof", packageName], {
      serial,
      timeoutMs: 10000,
    });
    const pid = out.trim().split(/\s+/)[0];
    if (/^\d+$/.test(pid)) {
      return pid;
    }
  } catch {
    // ignore
  }
  return undefined;
}

export async function pickLogcatLevel(): Promise<LogcatLevel | "all" | undefined> {
  const picked = await vscode.window.showQuickPick(
    [
      { label: "All levels", level: "all" as const },
      { label: "Verbose (V)", level: "V" as const },
      { label: "Debug (D)", level: "D" as const },
      { label: "Info (I)", level: "I" as const },
      { label: "Warn (W)", level: "W" as const },
      { label: "Error (E)", level: "E" as const },
      { label: "Fatal (F)", level: "F" as const },
    ],
    { placeHolder: "Minimum log level" },
  );
  return picked?.level;
}

interface PackagePickResult {
  packageName?: string;
  packageListFlag: PackageListFlag;
}

/** `false` = user cancelled (Escape). */
async function pickOptionalPackage(
  adb: AdbRunner,
  serial: string,
): Promise<PackagePickResult | false> {
  const mode = await vscode.window.showQuickPick(
    [
      { label: "No package filter", id: "skip" },
      { label: "Pick installed package", id: "list" },
      { label: "Enter package name", id: "input" },
    ],
    { placeHolder: "Filter by app package (optional)" },
  );
  if (!mode) {
    return false;
  }
  if (mode.id === "skip") {
    return { packageName: undefined, packageListFlag: "-3" };
  }
  if (mode.id === "input") {
    const pkg = await inputPackageName();
    if (!pkg) {
      return false;
    }
    return { packageName: pkg, packageListFlag: "-3" };
  }
  const filter = await pickPackageListFilter();
  if (!filter) {
    return false;
  }
  const args = ["shell", "pm", "list", "packages"];
  if (filter.flag) {
    args.push(filter.flag);
  }
  const out = await adb.run(args, { serial, timeoutMs: 60000 });
  const packages = out
    .split("\n")
    .map((l) => l.replace(/^package:/, "").trim())
    .filter(Boolean);
  const pkg = await pickPackageFromList(packages, {
    manualEntryOnEmpty: false,
  });
  if (!pkg) {
    return false;
  }
  return { packageName: pkg, packageListFlag: filter.flag };
}

export async function collectLogcatFilters(
  adb: AdbRunner,
  serial: string,
): Promise<LogcatFilterResult | undefined> {
  const level = await pickLogcatLevel();
  if (!level) {
    return undefined;
  }

  const packagePick = await pickOptionalPackage(adb, serial);
  if (packagePick === false) {
    return undefined;
  }
  const packageName = packagePick.packageName;
  const packageListFlag = packagePick.packageListFlag;
  let pid: string | undefined;
  if (packageName) {
    pid = await resolvePackagePid(adb, serial, packageName);
    if (!pid) {
      const cont = await vscode.window.showWarningMessage(
        `Could not resolve PID for ${packageName}. Continue without package filter?`,
        "Continue",
        "Cancel",
      );
      if (cont !== "Continue") {
        return undefined;
      }
    }
  }

  const tagFilter = await vscode.window.showInputBox({
    prompt: "Optional tag or logcat filter tokens (empty = skip, Esc = cancel)",
    placeHolder: "e.g. MyTag:S or -s MyTag",
  });
  if (tagFilter === undefined) {
    return undefined;
  }

  const defaultFilter = vscode.workspace
    .getConfiguration("adbToolkit")
    .get<string>("logcatDefaultFilter", "");
  const extraTokens = [
    ...parseLogcatDefaultFilter(defaultFilter),
    ...(tagFilter?.trim() ? parseLogcatDefaultFilter(tagFilter) : []),
  ];

  let appLabel: string | undefined;
  if (packageName) {
    appLabel = await resolveApplicationLabel(adb, serial, packageName);
  }

  const logcatArgs = buildLogcatArgs({ pid, level, extraTokens });
  return {
    logcatArgs,
    level,
    extraTokens,
    packageName,
    appLabel,
    packageListFlag,
  };
}

export type LogcatViewerMode = "terminal" | "webview";

let sessionLogcatViewer: LogcatViewerMode | undefined;

export function getSessionLogcatViewer(): LogcatViewerMode | undefined {
  return sessionLogcatViewer;
}

export function setSessionLogcatViewer(mode: LogcatViewerMode | undefined): void {
  sessionLogcatViewer = mode;
}

export async function resolveLogcatViewer(): Promise<LogcatViewerMode | undefined> {
  const setting = vscode.workspace
    .getConfiguration("adbToolkit")
    .get<LogcatViewerMode>("logcatViewer", "terminal");

  const picked = await vscode.window.showQuickPick(
    [
      {
        label: `Use setting (${setting})`,
        mode: "setting" as const,
      },
      { label: "Terminal this time", mode: "terminal" as const },
      { label: "Webview this time", mode: "webview" as const },
    ],
    { placeHolder: "Logcat viewer" },
  );
  if (!picked) {
    return undefined;
  }
  if (picked.mode === "setting") {
    return sessionLogcatViewer ?? setting;
  }
  setSessionLogcatViewer(picked.mode);
  return picked.mode;
}

export function getConfiguredLogcatViewer(): LogcatViewerMode {
  const setting = vscode.workspace
    .getConfiguration("adbToolkit")
    .get<LogcatViewerMode>("logcatViewer", "terminal");
  return sessionLogcatViewer ?? setting;
}
