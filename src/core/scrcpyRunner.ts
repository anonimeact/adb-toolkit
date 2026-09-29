import { execFile } from "child_process";
import * as vscode from "vscode";
import { log, logCommand } from "./output";
import { quoteForTerminal, resolveScrcpyExecutable } from "./platform";
import { buildScrcpyArgs, parseScrcpyExtraArgs } from "./scrcpyArgs";

export class ScrcpyRunner {
  getConfiguredPath(): string {
    return vscode.workspace
      .getConfiguration("adbToolkit")
      .get<string>("scrcpyPath", "scrcpy");
  }

  resolveExecutable(): string {
    return resolveScrcpyExecutable(this.getConfiguredPath());
  }

  getConfigExtraArgs(): string[] {
    const raw = vscode.workspace
      .getConfiguration("adbToolkit")
      .get<string>("scrcpyExtraArgs", "");
    return parseScrcpyExtraArgs(raw);
  }

  buildFullArgs(serial: string, presetExtra: string[] = []): string[] {
    return buildScrcpyArgs({
      serial,
      configExtra: this.getConfigExtraArgs(),
      presetExtra,
    });
  }

  async checkAvailable(): Promise<{ ok: true } | { ok: false; message: string }> {
    const scrcpy = this.resolveExecutable();
    return new Promise((resolve) => {
      execFile(
        scrcpy,
        ["--version"],
        { timeout: 8000, windowsHide: true },
        (err, stdout, stderr) => {
          if (err) {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === "ENOENT") {
              resolve({
                ok: false,
                message: `scrcpy not found (${scrcpy}). Install scrcpy and/or set adbToolkit.scrcpyPath.`,
              });
              return;
            }
            const message = (stderr || err.message || String(err)).trim();
            resolve({
              ok: false,
              message: message || "scrcpy --version failed",
            });
            return;
          }
          const out = (stdout + stderr).trim();
          if (out) {
            log(`scrcpy: ${out.split("\n")[0]}`);
          }
          resolve({ ok: true });
        },
      );
    });
  }

  async runVersion(): Promise<string> {
    const scrcpy = this.resolveExecutable();
    return new Promise((resolve, reject) => {
      execFile(
        scrcpy,
        ["--version"],
        { timeout: 8000, windowsHide: true },
        (err, stdout, stderr) => {
          if (err) {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === "ENOENT") {
              reject(
                new Error(
                  `scrcpy not found (${scrcpy}). Install scrcpy or set adbToolkit.scrcpyPath.`,
                ),
              );
              return;
            }
            reject(new Error((stderr || err.message).trim()));
            return;
          }
          resolve((stdout + stderr).trim());
        },
      );
    });
  }

  openInTerminal(serial: string, presetExtra: string[] = []): vscode.Terminal {
    const scrcpy = quoteForTerminal(this.resolveExecutable());
    const args = this.buildFullArgs(serial, presetExtra);
    const cmd = `${scrcpy} ${args
      .map((a) => (/\s/.test(a) ? quoteForTerminal(a) : a))
      .join(" ")}`;
    logCommand(cmd);
    const terminal = vscode.window.createTerminal({
      name: `scrcpy (${serial})`,
    });
    terminal.show();
    terminal.sendText(cmd, true);
    return terminal;
  }
}
