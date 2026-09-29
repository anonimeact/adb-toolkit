import type { AdbRunner } from "./adbRunner";
import { parseDevicesList } from "./devicesParser";

/** scrcpy splits `adb devices` on spaces and breaks mDNS serials like `adb-… (2)._adb-tls-connect._tcp`. */
export function serialNeedsScrcpyTcpWorkaround(serial: string): boolean {
  return /\s/u.test(serial.trim());
}

export async function fetchDeviceWlanIp(
  adb: AdbRunner,
  serial: string,
): Promise<string | undefined> {
  try {
    const route = await adb.run(
      ["shell", "ip", "-f", "inet", "route", "show", "table", "wlan0"],
      { serial, timeoutMs: 10000 },
    );
    const match = route.match(/src\s+(\d+\.\d+\.\d+\.\d+)/);
    if (match) {
      return match[1];
    }
  } catch {
    // fallback below
  }
  try {
    const addr = await adb.run(
      ["shell", "ip", "-f", "inet", "addr", "show", "wlan0"],
      { serial, timeoutMs: 10000 },
    );
    const match = addr.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
    if (match) {
      return match[1];
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** adb tcpip + connect so scrcpy gets a space-free serial (e.g. 192.168.1.5:5555). */
export async function connectTcpSerialForScrcpy(
  adb: AdbRunner,
  serial: string,
  port: number,
): Promise<string | undefined> {
  const ip = await fetchDeviceWlanIp(adb, serial);
  if (!ip) {
    return undefined;
  }
  await adb.run(["tcpip", String(port)], { serial });
  const target = `${ip}:${port}`;
  await adb.run(["connect", target], { global: true });
  const out = await adb.run(["devices", "-l"], { global: true });
  const devices = parseDevicesList(out);
  const match = devices.find(
    (d) => d.serial === target && d.state === "device",
  );
  return match?.serial;
}
