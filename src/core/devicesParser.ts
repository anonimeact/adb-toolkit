import type { AdbDevice } from "../types";
import { normalizeStdout } from "./validators";

export function parseDevicesList(stdout: string): AdbDevice[] {
  const text = normalizeStdout(stdout);
  const lines = text.split("\n").slice(1);
  const devices: AdbDevice[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      continue;
    }
    const serial = parts[0];
    const state = parts[1];
    const device: AdbDevice = { serial, state };
    const rest = trimmed.slice(serial.length).trim();
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

export function formatDeviceLabel(d: AdbDevice): string {
  const extra = d.model ?? d.product ?? "";
  return extra ? `${d.serial} (${d.state}) — ${extra}` : `${d.serial} (${d.state})`;
}
