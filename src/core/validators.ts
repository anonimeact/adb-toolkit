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
