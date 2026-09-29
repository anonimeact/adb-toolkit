import { execFile, spawn } from "child_process";
import * as vscode from "vscode";
import { log, logCommand } from "./output";
import { resolveAdbExecutable, quoteForTerminal } from "./platform";

export interface RunOptions {
  serial?: string;
  /** Skip -s injection (kill-server, connect, pair, devices, mdns, disconnect global). */
  global?: boolean;
  timeoutMs?: number;
  logDetail?: string;
}

const DEFAULT_TIMEOUT = 15000;

export class AdbRunner {
  getConfiguredPath(): string {
    return vscode.workspace
      .getConfiguration("adbToolkit")
      .get<string>("adbPath", "adb");
  }

  resolveExecutable(): string {
    return resolveAdbExecutable(this.getConfiguredPath());
  }

  buildArgs(args: string[], options?: RunOptions): string[] {
    const result: string[] = [];
    if (!options?.global && options?.serial) {
      result.push("-s", options.serial);
    }
    return result.concat(args);
  }

  async run(args: string[], options?: RunOptions): Promise<string> {
    const adb = this.resolveExecutable();
    const fullArgs = this.buildArgs(args, options);
    if (options?.logDetail) {
      logCommand(options.logDetail);
    } else {
      logCommand(`adb ${fullArgs.join(" ")}`);
    }

    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT;

    return new Promise((resolve, reject) => {
      execFile(
        adb,
        fullArgs,
        {
          timeout: timeoutMs,
          maxBuffer: 50 * 1024 * 1024,
          windowsHide: true,
        },
        (err, stdout, stderr) => {
          if (err) {
            const message = (stderr || err.message || String(err)).trim();
            if (message) {
              log(message);
            }
            const code = (err as NodeJS.ErrnoException).code;
            if (code === "ENOENT") {
              reject(
                new Error(
                  `adb not found (${adb}). Install Android platform-tools or set adbToolkit.adbPath.`,
                ),
              );
              return;
            }
            reject(new Error(message || err.message));
            return;
          }
          const out = (stdout + (stderr ? `\n${stderr}` : "")).trim();
          if (out) {
            log(out);
          }
          resolve(out);
        },
      );
    });
  }

  async runBuffer(args: string[], options?: RunOptions): Promise<Buffer> {
    const adb = this.resolveExecutable();
    const fullArgs = this.buildArgs(args, options);
    logCommand(`adb ${fullArgs.join(" ")} (binary)`);

    return new Promise((resolve, reject) => {
      execFile(
        adb,
        fullArgs,
        {
          encoding: "buffer",
          maxBuffer: 50 * 1024 * 1024,
          timeout: 60000,
          windowsHide: true,
        },
        (err, stdout, stderr) => {
          if (err) {
            const message = Buffer.isBuffer(stderr)
              ? stderr.toString("utf8")
              : String(stderr || err.message);
            reject(new Error(message.trim() || err.message));
            return;
          }
          resolve(Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout));
        },
      );
    });
  }

  openInTerminal(
    args: string[],
    options?: RunOptions & { name?: string },
  ): vscode.Terminal {
    const adb = quoteForTerminal(this.resolveExecutable());
    const fullArgs = this.buildArgs(args, options);
    const cmd = `${adb} ${fullArgs.map((a) => (/\s/.test(a) ? quoteForTerminal(a) : a)).join(" ")}`;
    const terminal = vscode.window.createTerminal({
      name: options?.name ?? "ADB Toolkit",
    });
    terminal.show();
    terminal.sendText(cmd, true);
    return terminal;
  }

  spawnLongRunning(
    args: string[],
    options?: RunOptions,
  ): ReturnType<typeof spawn> {
    const adb = this.resolveExecutable();
    const fullArgs = this.buildArgs(args, options);
    logCommand(`adb ${fullArgs.join(" ")} (spawn)`);
    return spawn(adb, fullArgs, {
      stdio: "inherit",
      windowsHide: true,
    });
  }

  spawnWithStdout(args: string[], options?: RunOptions): ReturnType<typeof spawn> {
    const adb = this.resolveExecutable();
    const fullArgs = this.buildArgs(args, options);
    logCommand(`adb ${fullArgs.join(" ")} (spawn stdout)`);
    return spawn(adb, fullArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  }
}
