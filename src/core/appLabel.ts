import type { AdbRunner } from "./adbRunner";

/** Parse human-readable app name from `dumpsys package` output. */
export function parseApplicationLabelFromDumpsys(
  dumpsys: string,
): string | undefined {
  const quoted = dumpsys.match(/application-label(?:-\w+)?='([^']+)'/);
  if (quoted?.[1]) {
    return quoted[1];
  }
  const nonLocalized = dumpsys.match(/\bnonLocalizedLabel=([^\s\n]+)/);
  if (nonLocalized?.[1]) {
    return nonLocalized[1];
  }
  return undefined;
}

export async function resolveApplicationLabel(
  adb: AdbRunner,
  serial: string,
  packageName: string,
): Promise<string | undefined> {
  try {
    const out = await adb.run(["shell", "dumpsys", "package", packageName], {
      serial,
      timeoutMs: 20000,
    });
    return parseApplicationLabelFromDumpsys(out);
  } catch {
    return undefined;
  }
}

export function formatLogcatSessionTitle(
  serial: string,
  packageName?: string,
  appLabel?: string,
): string {
  if (packageName) {
    const name = appLabel?.trim() || packageName;
    const pkg =
      appLabel && appLabel !== packageName ? ` (${packageName})` : "";
    return `ADB Logcat: ${name}${pkg} — ${serial}`;
  }
  return `ADB Logcat (${serial})`;
}
