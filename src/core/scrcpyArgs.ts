import { splitAdbArgString } from "./validators";

export function parseScrcpyExtraArgs(filter: string): string[] {
  const trimmed = filter.trim();
  if (!trimmed) {
    return [];
  }
  return splitAdbArgString(trimmed);
}

export function buildScrcpyArgs(options: {
  serial: string;
  configExtra?: string[];
  presetExtra?: string[];
}): string[] {
  const config = options.configExtra ?? [];
  const preset = options.presetExtra ?? [];
  return ["-s", options.serial, ...config, ...preset];
}
