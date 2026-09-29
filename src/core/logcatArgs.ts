export type LogcatLevel = "V" | "D" | "I" | "W" | "E" | "F";

export function buildLogcatArgs(options: {
  pid?: string;
  level?: LogcatLevel | "all";
  extraTokens?: string[];
}): string[] {
  const extra = (options.extraTokens ?? []).filter((t) => t.length > 0);
  if (options.pid) {
    const base = ["logcat", `--pid=${options.pid}`];
    return extra.length ? base.concat(extra) : base;
  }
  if (options.level && options.level !== "all") {
    const base = ["logcat", `*:${options.level}`];
    return extra.length ? base.concat(extra) : base;
  }
  if (extra.length) {
    return ["logcat", ...extra];
  }
  return ["logcat"];
}

/** Timestamp for `adb logcat -T` (lines at or after this time). */
export function formatLogcatTailTime(date = new Date()): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

/** Only stream log lines emitted after stream start (avoids ring-buffer dump on reconnect). */
export function withLogcatTailFromNow(
  args: string[],
  date = new Date(),
): string[] {
  if (args[0] !== "logcat") {
    return args;
  }
  const tail = ["-T", formatLogcatTailTime(date)];
  return ["logcat", ...tail, ...args.slice(1)];
}

export function parseLogcatDefaultFilter(filter: string): string[] {
  const trimmed = filter.trim();
  if (!trimmed) {
    return [];
  }
  return trimmed.split(/\s+/);
}
