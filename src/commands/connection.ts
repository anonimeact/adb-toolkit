import * as vscode from "vscode";
import { adbStatusMessage } from "../core/adbOutcome";
import { deviceToQuickPickItem } from "../core/devicesParser";
import { inputHostPort, pickConnectAddress } from "../core/ui";
import { getMetaById } from "./catalog";
import type { ExtensionContextBundle } from "../types";

export async function pair(ctx: ExtensionContextBundle): Promise<void> {
  const hostPort = await inputHostPort("Pairing host:port");
  if (!hostPort) {
    return;
  }
  const code = await vscode.window.showInputBox({
    prompt: "Pairing code",
    password: true,
    validateInput: (v) => (v.trim() ? undefined : "Code required"),
  });
  if (!code) {
    return;
  }
  const meta = getMetaById("adbToolkit.pair");
  const out = await ctx.adb.run(["pair", hostPort.trim(), code.trim()], {
    global: true,
    logDetail: meta?.detail,
    timeoutMs: 60000,
  });
  vscode.window.showInformationMessage(
    adbStatusMessage(out, `Paired with ${hostPort}`),
  );
}

export async function connect(ctx: ExtensionContextBundle): Promise<void> {
  const history = await ctx.devices.getConnectionHistory();
  const hostPort = (await pickConnectAddress(history))?.trim();
  if (!hostPort) {
    return;
  }
  const meta = getMetaById("adbToolkit.connect");
  await ctx.devices.pushConnectionHistory(hostPort);
  const out = await ctx.adb.run(["connect", hostPort], {
    global: true,
    logDetail: meta?.detail,
  });
  await ctx.devices.refreshDevices();
  vscode.window.showInformationMessage(
    adbStatusMessage(out, `Connected to ${hostPort}`),
  );
}

export async function disconnect(ctx: ExtensionContextBundle): Promise<void> {
  const devices = await ctx.devices.listDevices();
  const endpoints = ctx.devices.listTcpEndpoints(devices);
  if (endpoints.length === 0) {
    const manual = await inputHostPort("Disconnect host:port");
    if (!manual) {
      return;
    }
    const out = await ctx.adb.run(["disconnect", manual.trim()], {
      global: true,
    });
    vscode.window.showInformationMessage(
      adbStatusMessage(out, `Disconnected ${manual.trim()}`),
    );
    return;
  }
  const picked = await vscode.window.showQuickPick(endpoints, {
    placeHolder: "Disconnect endpoint",
  });
  if (!picked) {
    return;
  }
  const out = await ctx.adb.run(["disconnect", picked], { global: true });
  vscode.window.showInformationMessage(
    adbStatusMessage(out, `Disconnected ${picked}`),
  );
}

export async function disconnectAll(
  ctx: ExtensionContextBundle,
): Promise<void> {
  const out = await ctx.adb.run(["disconnect"], { global: true });
  vscode.window.showInformationMessage(
    adbStatusMessage(out, "All TCP connections closed."),
  );
}

export async function listDevices(ctx: ExtensionContextBundle): Promise<void> {
  const devices = await ctx.devices.listDevices();
  if (devices.length === 0) {
    vscode.window.showInformationMessage("No devices listed.");
    return;
  }
  const selected = ctx.devices.getSelectedSerial();
  await vscode.window.showQuickPick(
    devices.map((d) => deviceToQuickPickItem(d, { selectedSerial: selected })),
    {
      placeHolder: "Connected devices (informational)",
      matchOnDescription: true,
      matchOnDetail: true,
    },
  );
}

export async function selectDevice(ctx: ExtensionContextBundle): Promise<void> {
  await ctx.devices.pickDevice("Select a device to use");
}

export async function reconnect(ctx: ExtensionContextBundle): Promise<void> {
  const mode = await vscode.window.showQuickPick(
    [
      { label: "reconnect", description: "adb reconnect" },
      { label: "reconnect offline", description: "adb reconnect offline" },
    ],
    { placeHolder: "Reconnect mode" },
  );
  if (!mode) {
    return;
  }
  const serial = await ctx.devices.resolveSerial(false);
  const args =
    mode.label === "reconnect offline"
      ? ["reconnect", "offline"]
      : ["reconnect"];
  await ctx.adb.run(args, {
    global: !serial,
    serial,
  });
  vscode.window.showInformationMessage("Reconnect issued.");
}

export async function enableTcpIp(ctx: ExtensionContextBundle): Promise<void> {
  const port = vscode.workspace
    .getConfiguration("adbToolkit")
    .get<number>("defaultPort", 5555);
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  await ctx.adb.run(["tcpip", String(port)], { serial });
  vscode.window.showInformationMessage(
    `TCP mode enabled on port ${port}. Connect with adb connect <ip>:${port}`,
  );
}

export async function switchUsb(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  await ctx.adb.run(["usb"], { serial });
  vscode.window.showInformationMessage("Device switched to USB mode.");
}

export async function mdnsDiscover(ctx: ExtensionContextBundle): Promise<void> {
  const out = await ctx.adb.run(["mdns", "services"], {
    global: true,
    timeoutMs: 30000,
  });
  const lines = out.split("\n").filter((l) => l.trim());
  if (lines.length === 0) {
    vscode.window.showInformationMessage("No mDNS services found.");
    return;
  }
  const picked = await vscode.window.showQuickPick(lines, {
    placeHolder: "mDNS services (select to copy line)",
  });
  if (picked) {
    await vscode.env.clipboard.writeText(picked);
    vscode.window.showInformationMessage("Copied mDNS line to clipboard.");
  }
}

export async function waitForDevice(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial(false);
  ctx.adb.openInTerminal(["wait-for-device"], {
    global: !serial,
    serial,
    name: "ADB Wait for Device",
  });
}

export async function getState(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  const state = await ctx.adb.run(["get-state"], { serial });
  vscode.window.showInformationMessage(`Device state: ${state}`);
}

export async function copyDeviceIp(ctx: ExtensionContextBundle): Promise<void> {
  const serial = await ctx.devices.resolveSerial();
  if (!serial) {
    return;
  }
  let ip: string | undefined;
  try {
    const route = await ctx.adb.run(
      ["shell", "ip", "-f", "inet", "route", "show", "table", "wlan0"],
      { serial, timeoutMs: 10000 },
    );
    const match = route.match(/src\s+(\d+\.\d+\.\d+\.\d+)/);
    if (match) {
      ip = match[1];
    }
  } catch {
    // fallback
  }
  if (!ip) {
    try {
      const addr = await ctx.adb.run(
        ["shell", "ip", "-f", "inet", "addr", "show", "wlan0"],
        { serial, timeoutMs: 10000 },
      );
      const match = addr.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
      if (match) {
        ip = match[1];
      }
    } catch {
      // fallback
    }
  }
  if (!ip) {
    const fallback = await ctx.adb.run(["shell", "ip", "route"], { serial });
    const match = fallback.match(/src\s+(\d+\.\d+\.\d+\.\d+)/);
    ip = match?.[1];
  }
  if (!ip) {
    vscode.window.showErrorMessage("Could not resolve device WLAN IP.");
    return;
  }
  await vscode.env.clipboard.writeText(ip);
  vscode.window.showInformationMessage(`Copied device IP: ${ip}`);
}
