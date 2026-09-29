import * as vscode from "vscode";
import { showOutput } from "../core/output";
import type { ExtensionContextBundle } from "../types";

export async function runCommand(
  title: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`${title}: ${message}`);
    showOutput();
  }
}

export type Cmd = (ctx: ExtensionContextBundle, uri?: vscode.Uri) => Promise<void>;
