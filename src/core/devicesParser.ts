import type { AdbDevice } from "../types";
import { normalizeStdout } from "./validators";

/** adb device line states (single token before usb:/product: metadata). */
const DEVICE_STATE =
  /^(?<serial>.+?)\s+(?<state>device|offline|unauthorized|authorizing|recovery|sideload|bootloader)(?:\s+(?<rest>.*))?$/;

export function parseDevicesList(stdout: string): AdbDevice[] {
  const text = normalizeStdout(stdout);
  const lines = text.split("\n").slice(1);
  const devices: AdbDevice[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("*")) {
      continue;
    }
    const match = trimmed.match(DEVICE_STATE);
    if (!match?.groups) {
      continue;
    }
    const serial = match.groups.serial.trim();
    const state = match.groups.state;
    const rest = match.groups.rest ?? "";
    const device: AdbDevice = { serial, state };
    const modelMatch = rest.match(/model:(\S+)/);
    const productMatch = rest.match(/product:(\S+)/);
    const transportMatch = rest.match(/transport_id:(\d+)/);
    if (modelMatch) {
      device.model = modelMatch[1];
    }
    if (productMatch) {
      device.product = productMatch[1];
    }
    if (transportMatch) {
      device.transport = transportMatch[1];
    }
    devices.push(device);
  }

  return devices;
}

export interface DeviceListPresentation {
  /** Prominent name (model/product + connection hint). */
  title: string;
  /** Dimmed secondary line: serial — mobile. */
  subtitle: string;
}

function humanizeDeviceName(d: AdbDevice): string {
  const raw = d.model ?? d.product;
  if (raw) {
    return raw.replace(/_/g, " ");
  }
  if (d.serial.startsWith("emulator-")) {
    return "Emulator";
  }
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/u.test(d.serial)) {
    return "Android device";
  }
  return d.serial.length > 32 ? `${d.serial.slice(0, 32)}…` : d.serial;
}

function wirelessPairingSerial(d: AdbDevice): boolean {
  return (
    d.serial.includes("_adb-tls-connect._tcp") || d.serial.includes("._adb-")
  );
}

function connectionTitleSuffix(d: AdbDevice): string | undefined {
  if (wirelessPairingSerial(d)) {
    return "wireless";
  }
  if (d.serial.startsWith("emulator-")) {
    return "emulator";
  }
  if (
    /^\d+\.\d+\.\d+\.\d+:\d+$/u.test(d.serial) ||
    (d.serial.includes(":") && !wirelessPairingSerial(d))
  ) {
    return undefined;
  }
  return undefined;
}

export function getDeviceListPresentation(d: AdbDevice): DeviceListPresentation {
  const name = humanizeDeviceName(d);
  const suffix = connectionTitleSuffix(d);
  const title = suffix ? `${name} (${suffix})` : name;
  const subtitle = `${d.serial} - mobile`;
  return { title, subtitle };
}

/** @deprecated Prefer getDeviceListPresentation / deviceToQuickPickItem. */
export function formatDeviceLabel(d: AdbDevice): string {
  const { title, subtitle } = getDeviceListPresentation(d);
  return `${title}  ${subtitle}`;
}

export type DeviceQuickPickItem = {
  label: string;
  description: string;
  detail?: string;
  serial: string;
};

export function deviceToQuickPickItem(
  d: AdbDevice,
  options?: { selectedSerial?: string },
): DeviceQuickPickItem {
  const { title, subtitle } = getDeviceListPresentation(d);
  const item: DeviceQuickPickItem = {
    label: `$(device-mobile) ${title}`,
    description: subtitle,
    serial: d.serial,
  };
  if (options?.selectedSerial === d.serial) {
    item.detail = "Current Device";
  }
  if (d.state !== "device") {
    const stateLine = `State: ${d.state}`;
    item.detail = item.detail ? `${item.detail} · ${stateLine}` : stateLine;
  }
  return item;
}
