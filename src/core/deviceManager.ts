import * as vscode from "vscode";
import type { AdbDevice } from "../types";
import type { AdbRunner } from "./adbRunner";
import {
  CONNECTION_HISTORY_LIMIT,
  nextConnectionHistory,
} from "./connectAddress";
import { parseDevicesList, deviceToQuickPickItem } from "./devicesParser";

const SELECTED_SERIAL_KEY = "adbToolkit.selectedSerial";
const CONNECTION_HISTORY_KEY = "adbToolkit.connectionHistory";

export class DeviceManager {
  private statusBar: vscode.StatusBarItem;
  private adb: AdbRunner;
  private readonly _onDidChangeDevices = new vscode.EventEmitter<void>();
  readonly onDidChangeDevices = this._onDidChangeDevices.event;

  constructor(
    private readonly context: vscode.ExtensionContext,
    adb: AdbRunner,
  ) {
    this.adb = adb;
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.statusBar.command = "adbToolkit.selectDevice";
    this.refreshStatusBar();
    this.statusBar.show();
  }

  dispose(): void {
    this.statusBar.dispose();
  }

  getSelectedSerial(): string | undefined {
    return this.context.globalState.get<string>(SELECTED_SERIAL_KEY);
  }

  async setSelectedSerial(serial: string): Promise<void> {
    await this.context.globalState.update(SELECTED_SERIAL_KEY, serial);
    this.refreshStatusBar();
    this._onDidChangeDevices.fire();
  }

  notifyDevicesChanged(): void {
    this._onDidChangeDevices.fire();
  }

  async refreshDevices(): Promise<AdbDevice[]> {
    const devices = await this.listDevices();
    this._onDidChangeDevices.fire();
    return devices;
  }

  refreshStatusBar(): void {
    const serial = this.getSelectedSerial();
    this.statusBar.text = serial
      ? `$(device-mobile) ADB: ${serial}`
      : "$(device-mobile) ADB: no device";
    this.statusBar.tooltip = "Click to select active device (adb -s SERIAL)";
  }

  async listDevices(): Promise<AdbDevice[]> {
    const out = await this.adb.run(["devices", "-l"], { global: true });
    return parseDevicesList(out);
  }

  async pickDevice(
    prompt = "Select device",
    allowOffline = false,
  ): Promise<string | undefined> {
    const devices = await this.listDevices();
    const usable = devices.filter(
      (d) => allowOffline || d.state === "device",
    );

    if (usable.length === 0) {
      vscode.window.showErrorMessage(
        "No authorized devices. Run adb devices and authorize USB debugging.",
      );
      return undefined;
    }

    if (usable.length === 1) {
      await this.setSelectedSerial(usable[0].serial);
      return usable[0].serial;
    }

    const selected = this.getSelectedSerial();
    const picked = await vscode.window.showQuickPick(
      usable.map((d) =>
        deviceToQuickPickItem(d, { selectedSerial: selected }),
      ),
      {
        placeHolder: prompt,
        matchOnDescription: true,
        matchOnDetail: true,
      },
    );

    if (!picked) {
      return undefined;
    }
    await this.setSelectedSerial(picked.serial);
    return picked.serial;
  }

  /** Resolve serial for per-device commands: 0/1/many handling. */
  async resolveSerial(requireDevice = true): Promise<string | undefined> {
    const devices = await this.listDevices();
    const ready = devices.filter((d) => d.state === "device");

    if (ready.length === 0) {
      if (requireDevice) {
        if (devices.length > 0) {
          const summary = devices
            .map((d) => `${d.serial} (${d.state})`)
            .join(", ");
          vscode.window.showErrorMessage(
            `No device in 'device' state. Connected: ${summary}`,
          );
        } else {
          vscode.window.showErrorMessage("No device in 'device' state.");
        }
      }
      return undefined;
    }

    const selected = this.getSelectedSerial();
    if (selected && ready.some((d) => d.serial === selected)) {
      return selected;
    }

    if (ready.length === 1) {
      await this.setSelectedSerial(ready[0].serial);
      return ready[0].serial;
    }

    return this.pickDevice("Select a device to use");
  }

  async getConnectionHistory(): Promise<string[]> {
    const stored =
      this.context.globalState.get<string[]>(CONNECTION_HISTORY_KEY) ?? [];
    const history = stored.slice(0, CONNECTION_HISTORY_LIMIT);
    if (stored.length > history.length) {
      await this.context.globalState.update(CONNECTION_HISTORY_KEY, history);
    }
    return history;
  }

  async pushConnectionHistory(hostPort: string): Promise<void> {
    const history = nextConnectionHistory(
      await this.getConnectionHistory(),
      hostPort,
    );
    await this.context.globalState.update(CONNECTION_HISTORY_KEY, history);
  }

  listTcpEndpoints(devices: AdbDevice[]): string[] {
    return devices
      .map((d) => d.serial)
      .filter((s) => s.includes(":") || s.includes("."));
  }
}
