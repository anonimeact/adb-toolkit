import * as vscode from "vscode";
import { adbStatusMessage } from "../core/adbOutcome";
import type { DeviceTreeItem } from "../views/devicesTreeProvider";
import type { ExtensionContextBundle } from "../types";

export async function refreshDevices(
  ctx: ExtensionContextBundle,
): Promise<void> {
  await ctx.devices.refreshDevices();
  vscode.window.showInformationMessage("Device list refreshed.");
}

export async function treeSelectDevice(
  ctx: ExtensionContextBundle,
  serial?: string,
): Promise<void> {
  if (!serial) {
    return;
  }
  await ctx.devices.setSelectedSerial(serial);
  vscode.window.showInformationMessage(`Active device: ${serial}`);
}

export async function copyDeviceSerial(
  _ctx: ExtensionContextBundle,
  item?: DeviceTreeItem,
): Promise<void> {
  const serial = item?.device?.serial;
  if (!serial) {
    return;
  }
  await vscode.env.clipboard.writeText(serial);
  vscode.window.showInformationMessage(`Copied serial: ${serial}`);
}

export async function disconnectTreeDevice(
  ctx: ExtensionContextBundle,
  item?: DeviceTreeItem,
): Promise<void> {
  const serial = item?.device?.serial;
  if (!serial) {
    return;
  }
  const out = await ctx.adb.run(["disconnect", serial], { global: true });
  await ctx.devices.refreshDevices();
  vscode.window.showInformationMessage(
    adbStatusMessage(out, `Disconnected ${serial}`),
  );
}
