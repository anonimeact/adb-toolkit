import * as vscode from "vscode";
import { isValidHostPort, isValidPackageName, isValidPort } from "./validators";

export async function confirmDestructive(
  message: string,
  detail?: string,
): Promise<boolean> {
  const choice = await vscode.window.showWarningMessage(
    message,
    { modal: true, detail },
    "Confirm",
  );
  return choice === "Confirm";
}

export async function inputHostPort(
  prompt: string,
  value?: string,
): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt,
    value,
    validateInput: (v) =>
      isValidHostPort(v)
        ? undefined
        : "Enter host:port (e.g. 192.168.1.10:5555)",
  });
}

export interface PackageListFilterOption {
  label: string;
  description: string;
  flag: "" | "-3" | "-s";
}

const PACKAGE_LIST_FILTERS: PackageListFilterOption[] = [
  {
    label: "User-installed apps",
    description: "Apps you installed (store, APK, sideload)",
    flag: "-3",
  },
  {
    label: "System apps",
    description: "Pre-installed with the device or ROM",
    flag: "-s",
  },
  {
    label: "All apps",
    description: "Every package on the device",
    flag: "",
  },
];

export async function pickPackageListFilter(): Promise<
  PackageListFilterOption | undefined
> {
  return vscode.window.showQuickPick(PACKAGE_LIST_FILTERS, {
    placeHolder: "Which apps to list?",
  });
}

export async function pickPackageFromList(
  packages: string[],
  options?: { manualEntryOnEmpty?: boolean },
): Promise<string | undefined> {
  const manualFallback = options?.manualEntryOnEmpty ?? true;
  if (packages.length === 0) {
    return manualFallback ? inputPackageName() : undefined;
  }

  const picked = await vscode.window.showQuickPick(packages, {
    placeHolder: "Search package name (type to filter)",
  });
  if (picked) {
    return picked;
  }
  return manualFallback ? inputPackageName() : undefined;
}

export async function inputPackageName(
  prompt = "Package name (com.example.app)",
): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt,
    validateInput: (v) =>
      isValidPackageName(v) ? undefined : "Invalid package name",
  });
}

export async function inputPort(prompt: string): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt,
    validateInput: (v) =>
      isValidPort(v) ? undefined : "Enter a port number (1–65535)",
  });
}

export async function inputRemotePath(
  prompt = "Remote path on device",
  value = "/sdcard/",
): Promise<string | undefined> {
  const v = await vscode.window.showInputBox({ prompt, value });
  return v?.trim() || undefined;
}
