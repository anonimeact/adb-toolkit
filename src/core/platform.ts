import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export function resolveAdbExecutable(configured: string): string {
  const trimmed = configured.trim();
  if (trimmed !== "adb") {
    return trimmed;
  }
  return process.platform === "win32" ? "adb.exe" : "adb";
}

export function resolveScrcpyExecutable(configured: string): string {
  const trimmed = configured.trim();
  if (trimmed !== "scrcpy") {
    return trimmed;
  }
  return process.platform === "win32" ? "scrcpy.exe" : "scrcpy";
}

/** Quote path for integrated terminal one-liner (spaces on Windows). */
export function quoteForTerminal(path: string): string {
  if (/[\s"]/u.test(path)) {
    return `"${path.replace(/"/g, '\\"')}"`;
  }
  return path;
}

export async function forceKillHostAdbProcesses(): Promise<void> {
  if (process.platform === "win32") {
    try {
      await execFileAsync("taskkill", ["/F", "/IM", "adb.exe"], {
        windowsHide: true,
      });
    } catch (err: unknown) {
      const msg = String(err);
      if (
        msg.includes("not found") ||
        msg.includes("128") ||
        msg.includes("no tasks")
      ) {
        return;
      }
      throw err;
    }
    return;
  }

  try {
    await execFileAsync("killall", ["-9", "adb"]);
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.includes("No matching processes") || msg.includes("exit code 1")) {
      return;
    }
    throw err;
  }
}
