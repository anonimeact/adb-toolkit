import * as vscode from "vscode";
import { getDeviceListPresentation } from "../core/devicesParser";
import type { DeviceManager } from "../core/deviceManager";
import type { AdbDevice } from "../types";

export class DeviceTreeItem extends vscode.TreeItem {
  constructor(
    public readonly device: AdbDevice,
    selectedSerial: string | undefined,
  ) {
    const { title, subtitle } = getDeviceListPresentation(device);
    super(title, vscode.TreeItemCollapsibleState.None);
    this.description =
      device.serial === selectedSerial ? "Current device" : subtitle;
    this.tooltip = `${device.serial}\n${device.state}`;
    this.contextValue =
      device.serial.includes(":") || device.serial.includes(".")
        ? "adbTcpDevice"
        : "adbDevice";
    if (device.serial === selectedSerial) {
      this.iconPath = new vscode.ThemeIcon(
        "radio-tower",
        new vscode.ThemeColor("charts.green"),
      );
    } else {
      this.iconPath = new vscode.ThemeIcon("device-mobile");
    }
    this.command = {
      command: "adbToolkit.treeSelectDevice",
      title: "Select device",
      arguments: [device.serial],
    };
  }
}

export class DevicesTreeProvider
  implements vscode.TreeDataProvider<DeviceTreeItem>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    DeviceTreeItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly devices: DeviceManager) {
    devices.onDidChangeDevices(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: DeviceTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<DeviceTreeItem[]> {
    const list = await this.devices.listDevices();
    const selected = this.devices.getSelectedSerial();
    return list.map((d) => new DeviceTreeItem(d, selected));
  }
}
