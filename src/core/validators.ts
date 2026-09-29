const HOST_PORT_RE =
  /^(?:\d{1,3}(?:\.\d{1,3}){3}|\[[\da-f:]+\]|localhost|[\w.-]+):\d{1,5}$/i;

const PACKAGE_RE = /^[a-zA-Z][\w.]*$/;

export function isValidHostPort(value: string): boolean {
  const trimmed = value.trim();
  if (!HOST_PORT_RE.test(trimmed)) {
    return false;
  }
  const portPart = trimmed.includes(":")
    ? trimmed.slice(trimmed.lastIndexOf(":") + 1)
    : "";
  const port = Number(portPart);
  return port >= 1 && port <= 65535;
}

export function isValidPackageName(value: string): boolean {
  const trimmed = value.trim();
  if (!PACKAGE_RE.test(trimmed) || trimmed.includes("..")) {
    return false;
  }
  return true;
}

export function normalizeStdout(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function isValidPort(value: string): boolean {
  const n = Number(value.trim());
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

const GLOBAL_ONLY_COMMANDS = new Set([
  "kill-server",
  "start-server",
  "connect",
  "disconnect",
  "pair",
  "devices",
  "mdns",
  "help",
  "version",
  "wait-for-device",
  "reconnect",
  "usb",
  "tcpip",
]);

export function isGlobalOnlyAdbCommand(firstToken: string): boolean {
  return GLOBAL_ONLY_COMMANDS.has(firstToken.toLowerCase());
}

/** Split adb args respecting simple double-quoted segments. */
export function splitAdbArgString(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && /\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current) {
    tokens.push(current);
  }
  return tokens;
}
