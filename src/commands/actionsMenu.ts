import * as vscode from "vscode";
import {
  COMMAND_CATALOG,
  GROUP_LABELS,
  type CommandGroup,
} from "./catalog";
import type { ExtensionContextBundle } from "../types";

const GROUP_ORDER: CommandGroup[] = [
  "server",
  "connection",
  "power",
  "apps",
  "files",
  "debug",
];

export async function showActions(
  ctx: ExtensionContextBundle,
  execute: (commandId: string) => Promise<void>,
): Promise<void> {
  const items: vscode.QuickPickItem[] = [];

  for (const group of GROUP_ORDER) {
    items.push({
      label: GROUP_LABELS[group],
      kind: vscode.QuickPickItemKind.Separator,
    });
    for (const meta of COMMAND_CATALOG.filter(
      (c) => c.group === group && c.id !== "adbToolkit.showActions",
    )) {
      items.push({
        label: meta.title,
        description: meta.description,
        detail: meta.detail,
      });
    }
  }

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: "ADB Toolkit — all commands",
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (!picked || picked.kind === vscode.QuickPickItemKind.Separator) {
    return;
  }
  const meta = COMMAND_CATALOG.find((c) => c.title === picked.label);
  if (meta) {
    await execute(meta.id);
  }
}
