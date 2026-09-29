import * as vscode from "vscode";
import { showOutput } from "../core/output";
import { confirmDestructive } from "../core/ui";
import { inputPort } from "../core/ui";
import type { ExtensionContextBundle } from "../types";

export async function forwardPort(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  const local = await inputPort("Local TCP port on host");
  if (!local) {
    return;
  }
  const remote = await inputPort("Remote TCP port on device");
  if (!remote) {
    return;
  }
  await ctx.adb.run(
    ["forward", `tcp:${local}`, `tcp:${remote}`],
    { serial },
  );
  vscode.window.showInformationMessage(
    `Forward tcp:${local} → device tcp:${remote}`,
  );
}

export async function reversePort(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  const remote = await inputPort("Remote TCP port on device (adb reverse)");
  if (!remote) {
    return;
  }
  const local = await inputPort("Local TCP port on host");
  if (!local) {
    return;
  }
  await ctx.adb.run(
    ["reverse", `tcp:${remote}`, `tcp:${local}`],
    { serial },
  );
  vscode.window.showInformationMessage(
    `Reverse device tcp:${remote} → host tcp:${local}`,
  );
}

export async function listForwards(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  const out = await ctx.adb.run(["forward", "--list"], { serial });
  showOutput();
  if (!out.trim()) {
    vscode.window.showInformationMessage("No port forwards configured.");
    return;
  }
  vscode.window.showInformationMessage("Port forwards listed in Output channel.");
}

export async function removeAllForwards(
  ctx: ExtensionContextBundle,
): Promise<void> {
  const ok = await confirmDestructive(
    "Remove all port forwards for this device?",
    "adb forward --remove-all",
  );
  if (!ok) {
    return;
  }
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  await ctx.adb.run(["forward", "--remove-all"], { serial });
  vscode.window.showInformationMessage("All forwards removed.");
}
