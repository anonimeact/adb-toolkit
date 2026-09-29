import * as vscode from "vscode";
import { confirmDestructive } from "../core/ui";
import type { ExtensionContextBundle } from "../types";

async function rebootWith(
  ctx: ExtensionContextBundle,
  args: string[],
  label: string,
): Promise<void> {
  const ok = await confirmDestructive(
    `${label}?`,
    "The device will disconnect until it finishes rebooting.",
  );
  if (!ok) {
    return;
  }
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  await ctx.adb.run(args, { serial, timeoutMs: 5000 });
  vscode.window.showInformationMessage(`${label} command sent.`);
}

export async function reboot(ctx: ExtensionContextBundle): Promise<void> {
  await rebootWith(ctx, ["reboot"], "Reboot device");
}

export async function rebootRecovery(ctx: ExtensionContextBundle): Promise<void> {
  await rebootWith(ctx, ["reboot", "recovery"], "Reboot to recovery");
}

export async function rebootBootloader(
  ctx: ExtensionContextBundle,
): Promise<void> {
  await rebootWith(ctx, ["reboot", "bootloader"], "Reboot to bootloader");
}
