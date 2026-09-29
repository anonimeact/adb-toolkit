import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { parseScrcpyExtraArgs } from "../core/scrcpyArgs";
import {
  connectTcpSerialForScrcpy,
  serialNeedsScrcpyTcpWorkaround,
} from "../core/scrcpySerial";
import { showOutput } from "../core/output";
import type { ExtensionContextBundle } from "../types";

const SCRCPY_RELEASES_URL = "https://github.com/Genymobile/scrcpy/releases";

export async function scrcpySetupGuide(
  ctx: ExtensionContextBundle,
): Promise<void> {
  const guidePath = path.join(ctx.vscodeContext.extensionPath, "docs", "SCRCPY.md");
  if (!fs.existsSync(guidePath)) {
    vscode.window.showErrorMessage("Scrcpy setup guide not found in extension package.");
    return;
  }
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(guidePath));
  await vscode.window.showTextDocument(doc, { preview: false });
}

export async function scrcpyVersion(ctx: ExtensionContextBundle): Promise<void> {
  const out = await ctx.scrcpy.runVersion();
  showOutput();
  vscode.window.showInformationMessage(out.split("\n")[0] || "scrcpy OK");
}

async function ensureScrcpyAvailable(
  ctx: ExtensionContextBundle,
): Promise<boolean> {
  const check = await ctx.scrcpy.checkAvailable();
  if (check.ok) {
    return true;
  }

  const choice = await vscode.window.showWarningMessage(
    "scrcpy is not installed",
    {
      modal: true,
      detail:
        "ADB Toolkit does not bundle scrcpy. Install it on your system, then set adbToolkit.scrcpyPath if needed. See ADB: Scrcpy Setup Guide.",
    },
    "Open Setup Guide",
    "Open scrcpy releases",
  );

  if (choice === "Open Setup Guide") {
    await scrcpySetupGuide(ctx);
  } else if (choice === "Open scrcpy releases") {
    await vscode.env.openExternal(vscode.Uri.parse(SCRCPY_RELEASES_URL));
  }
  return false;
}

type MirrorPresetItem = vscode.QuickPickItem & { extra: string[] };

async function pickMirrorPreset(): Promise<string[] | undefined> {
  const picked = await vscode.window.showQuickPick<MirrorPresetItem>(
    [
      {
        label: "Standard mirror",
        description: "No extra options for this session",
        detail:
          "Opens scrcpy with only your global setting adbToolkit.scrcpyExtraArgs (if any). Best choice if you are unsure.",
        extra: [],
      },
      {
        label: "Keep phone awake while mirroring",
        description: "Adds --stay-awake",
        detail:
          "Prevents the device screen from sleeping while the mirror is connected. Useful for long demos or testing.",
        extra: ["--stay-awake"],
      },
      {
        label: "Lower mirror resolution (max 1024px)",
        description: "Adds --max-size=1024",
        detail:
          "Scales the video so the longest side is at most 1024 pixels. Reduces lag on slow USB/Wi‑Fi or weak PCs.",
        extra: ["--max-size=1024"],
      },
      {
        label: "Mirror on PC, turn off phone screen",
        description: "Adds --turn-screen-off",
        detail:
          "Shows the display only in the scrcpy window and turns off the physical device screen to save battery. Touch still works on the device if you pick it up.",
        extra: ["--turn-screen-off"],
      },
      {
        label: "Custom flags for this session only",
        description: "Type scrcpy arguments yourself",
        detail:
          "One-time flags (e.g. --no-audio, --max-fps=30). Combined with adbToolkit.scrcpyExtraArgs. See scrcpy --help in a terminal.",
        extra: ["__custom__"],
      },
    ],
    {
      placeHolder:
        "How do you want to mirror? (global extras from adbToolkit.scrcpyExtraArgs are always applied)",
      matchOnDescription: true,
      matchOnDetail: true,
    },
  );
  if (!picked) {
    return undefined;
  }
  if (picked.extra[0] === "__custom__") {
    const raw = await vscode.window.showInputBox({
      prompt:
        "Extra scrcpy flags for this mirror only (space-separated). Global adbToolkit.scrcpyExtraArgs still apply.",
      placeHolder: "e.g. --no-audio --max-fps=30  (leave empty for none; Esc to cancel)",
    });
    if (raw === undefined) {
      return undefined;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }
    return parseScrcpyExtraArgs(trimmed);
  }
  return picked.extra;
}

export async function mirrorScrcpy(
  ctx: ExtensionContextBundle,
  serialOverride?: string,
): Promise<void> {
  let serial = serialOverride;
  if (serial) {
    await ctx.devices.setSelectedSerial(serial);
  } else {
    serial = await ctx.devices.resolveSerial();
  }
  if (!serial) {
    return;
  }

  if (!(await ensureScrcpyAvailable(ctx))) {
    return;
  }

  const presetExtra = await pickMirrorPreset();
  if (presetExtra === undefined) {
    return;
  }

  let launchSerial = serial;
  if (serialNeedsScrcpyTcpWorkaround(serial)) {
    const port = vscode.workspace
      .getConfiguration("adbToolkit")
      .get<number>("defaultPort", 5555);
    const choice = await vscode.window.showWarningMessage(
      "scrcpy cannot use this wireless device ID",
      {
        modal: true,
        detail:
          "Wi‑Fi pairing shows a long serial with spaces (mDNS, e.g. adb-… (2)._adb-tls-connect._tcp). adb works with that ID, but scrcpy splits it on spaces and fails — on macOS, Windows, and Linux. Switch to classic TCP (adb tcpip + connect) so the serial becomes ip:port, then mirror.",
      },
      "Switch to TCP and mirror",
      "Cancel",
    );
    if (choice !== "Switch to TCP and mirror") {
      return;
    }
    const tcpSerial = await connectTcpSerialForScrcpy(ctx.adb, serial, port);
    if (!tcpSerial) {
      vscode.window.showErrorMessage(
        `Could not switch to TCP. Try USB, or run ADB: Enable TCP/IP then adb connect <phone-ip>:${port}. See docs/SCRCPY.md.`,
      );
      return;
    }
    launchSerial = tcpSerial;
    await ctx.devices.setSelectedSerial(tcpSerial);
    await ctx.devices.refreshDevices();
  }

  ctx.scrcpy.openInTerminal(launchSerial, presetExtra);
  vscode.window.showInformationMessage(
    `scrcpy started in a separate terminal for ${launchSerial}. Close scrcpy window or stop the terminal to end mirroring.`,
  );
}
