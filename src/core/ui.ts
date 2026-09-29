import * as vscode from "vscode";
import { isValidHostPort, isValidPackageName } from "./validators";

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

export async function pickPackageFromList(
  packages: string[],
): Promise<string | undefined> {
  if (packages.length === 0) {
    return inputPackageName();
  }
  const picked = await vscode.window.showQuickPick(packages, {
    placeHolder: "Select package",
    matchOnDescription: true,
  });
  return picked ?? inputPackageName();
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

export async function inputRemotePath(
  prompt = "Remote path on device",
  value = "/sdcard/",
): Promise<string | undefined> {
  const v = await vscode.window.showInputBox({ prompt, value });
  return v?.trim() || undefined;
}
