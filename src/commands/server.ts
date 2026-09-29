import * as vscode from "vscode";
import { forceKillHostAdbProcesses } from "../core/platform";
import { getMetaById } from "./catalog";
import type { ExtensionContextBundle } from "../types";

export async function killServer(ctx: ExtensionContextBundle): Promise<void> {
  const meta = getMetaById("adbToolkit.killServer");
  await ctx.adb.run(["kill-server"], {
    global: true,
    logDetail: meta?.detail,
  });
  vscode.window.showInformationMessage("ADB server stopped.");
}

export async function startServer(ctx: ExtensionContextBundle): Promise<void> {
  const meta = getMetaById("adbToolkit.startServer");
  await ctx.adb.run(["start-server"], {
    global: true,
    logDetail: meta?.detail,
  });
  vscode.window.showInformationMessage("ADB server started.");
}

export async function restartServer(ctx: ExtensionContextBundle): Promise<void> {
  await killServer(ctx);
  await startServer(ctx);
}

export async function forceKill(ctx: ExtensionContextBundle): Promise<void> {
  await forceKillHostAdbProcesses();
  vscode.window.showInformationMessage("Host adb processes terminated.");
}

export async function showVersion(ctx: ExtensionContextBundle): Promise<void> {
  const out = await ctx.adb.run(["version"], { global: true });
  vscode.window.showInformationMessage(out.split("\n")[0] ?? out);
}
