import type { AdbRunner } from "./adbRunner";

export type PackageListFlag = "" | "-3" | "-s";

export async function fetchPackageNames(
  adb: AdbRunner,
  serial: string,
  flag: PackageListFlag,
): Promise<string[]> {
  const args = ["shell", "pm", "list", "packages"];
  if (flag) {
    args.push(flag);
  }
  const out = await adb.run(args, { serial, timeoutMs: 60000 });
  return out
    .split("\n")
    .map((l) => l.replace(/^package:/, "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}
