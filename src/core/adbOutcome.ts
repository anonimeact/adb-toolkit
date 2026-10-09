/**
 * adb often exits 0 and prints the real result on stdout
 * (`failed to connect to '…': No route to host`, `Failure […]`, …).
 * These helpers turn that text into an error instead of a success toast.
 */

const HOST_FAILURE =
  /^(?:(?:failed|cannot|unable) to connect to\b|failed to disconnect\b|failed to pair\b|Failed\b|error:|adb: error:|adb: failed\b|Failure \[)/i;

const STATUS_COMMANDS = new Set([
  "connect",
  "disconnect",
  "pair",
  "install",
  "install-multiple",
  "install-multi-package",
  "uninstall",
  "push",
  "pull",
  "sync",
  "forward",
  "reverse",
  "tcpip",
  "usb",
  "reconnect",
  "reboot",
  "root",
  "unroot",
  "remount",
  "sideload",
]);

const TOAST_MAX = 800;

export function adbSubcommand(args: string[]): string | undefined {
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "-s" || arg === "-t" || arg === "-H" || arg === "-P" || arg === "-L") {
      i += 2;
      continue;
    }
    if (arg === "-d" || arg === "-e") {
      i += 1;
      continue;
    }
    return arg;
  }
  return undefined;
}

function significantLines(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("* daemon"));
}

function clip(text: string, max = TOAST_MAX): string {
  const flat = text.trim();
  if (flat.length <= max) {
    return flat;
  }
  return `${flat.slice(0, max - 1)}…`;
}

function fromMatch(lines: string[], pattern: RegExp): string | undefined {
  const index = lines.findIndex((line) => pattern.test(line));
  if (index < 0) {
    return undefined;
  }
  return clip(lines.slice(index, index + 8).join("\n"));
}

function shellFailure(args: string[], lines: string[]): string | undefined {
  const shellAt = args.indexOf("shell");
  const rest = shellAt >= 0 ? args.slice(shellAt + 1) : args.slice(1);
  const bin = rest[0];
  const sub = rest[1];

  if (
    bin === "pm" &&
    (sub === "clear" ||
      sub === "grant" ||
      sub === "revoke" ||
      sub === "install" ||
      sub === "uninstall")
  ) {
    return fromMatch(
      lines,
      /^(?:Failed$|Failure \[|Security exception:|Exception occurred while executing\b|Error:|java\.lang\.\w*Exception:)/,
    );
  }

  if (bin === "am" && (sub === "start" || sub === "start-activity")) {
    return fromMatch(
      lines,
      /^(?:Error:|Error type \d+|Exception occurred while executing\b|Security exception:)/,
    );
  }

  if (bin === "monkey") {
    return fromMatch(lines, /^(?:\*\* No activities found\b|Error:)/);
  }

  return undefined;
}

/** adb's own failure text, or undefined when the output is not a failure. */
export function adbFailureMessage(
  args: string[],
  output: string,
): string | undefined {
  const lines = significantLines(output);
  if (lines.length === 0) {
    return undefined;
  }
  const command = adbSubcommand(args);
  if (!command) {
    return undefined;
  }
  if (command === "shell") {
    return shellFailure(args, lines);
  }
  if (!STATUS_COMMANDS.has(command)) {
    return undefined;
  }
  return fromMatch(lines, HOST_FAILURE);
}

/** First real adb status line, ignoring daemon startup noise. */
export function adbStatusMessage(output: string, fallback: string): string {
  const line = significantLines(output)[0];
  if (!line || line.length > 300) {
    return fallback;
  }
  return line;
}

export function formatAdbExecError(
  args: string[],
  stdout: string,
  stderr: string,
  fallback: string,
): string {
  const combined = [stdout, stderr].filter((part) => part.trim()).join("\n");
  const reported = adbFailureMessage(args, combined);
  if (reported) {
    return reported;
  }
  const errText = stderr.trim();
  const outText = stdout.trim();
  if (
    errText &&
    outText &&
    !errText.includes(outText) &&
    !outText.includes(errText)
  ) {
    return clip(`${outText}\n${errText}`);
  }
  return clip(errText || outText || fallback);
}
