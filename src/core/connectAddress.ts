import { isValidHostPort } from "./validators";

export const CONNECTION_HISTORY_LIMIT = 5;

export interface ConnectSuggestion {
  id: string;
  entry: "endpoint" | "host";
  label: string;
  description: string;
  host: string;
}

export function connectSuggestionKey(
  item: Pick<ConnectSuggestion, "entry" | "label">,
): string {
  return `${item.entry}:${item.label}`;
}

export function findConnectSuggestion(
  items: readonly ConnectSuggestion[],
  item: Pick<ConnectSuggestion, "entry" | "label"> | undefined,
): ConnectSuggestion | undefined {
  if (!item) {
    return undefined;
  }
  const key = connectSuggestionKey(item);
  return items.find((row) => row.id === key);
}

export type ConnectChoice =
  | { type: "connect"; address: string }
  | { type: "edit"; value: string }
  | { type: "invalid" };

export function hostFromEndpoint(endpoint: string): string | undefined {
  const trimmed = endpoint.trim();
  if (!isValidHostPort(trimmed)) {
    return undefined;
  }
  return trimmed.slice(0, trimmed.lastIndexOf(":"));
}

/** Newest first. A sixth entry drops the oldest (last) item. */
export function nextConnectionHistory(
  history: string[],
  entry: string,
  limit = CONNECTION_HISTORY_LIMIT,
): string[] {
  const normalized = entry.trim();
  if (!normalized) {
    return history.slice(0, limit);
  }
  return [normalized, ...history.filter((item) => item !== normalized)].slice(
    0,
    limit,
  );
}

function interleave(
  endpoints: ConnectSuggestion[],
  hosts: ConnectSuggestion[],
): ConnectSuggestion[] {
  const hostByName = new Map(hosts.map((item) => [item.host, item]));
  const emitted = new Set<string>();
  const items: ConnectSuggestion[] = [];
  for (const endpoint of endpoints) {
    items.push(endpoint);
    const hostItem = hostByName.get(endpoint.host);
    if (hostItem && !emitted.has(hostItem.host)) {
      emitted.add(hostItem.host);
      items.push(hostItem);
    }
  }
  return items;
}

/** Recent endpoints, plus one IP-only row per host so a new port can be typed. */
export function connectSuggestionItems(
  history: string[],
  query = "",
): ConnectSuggestion[] {
  const endpoints: ConnectSuggestion[] = [];
  const hosts: ConnectSuggestion[] = [];
  const seenHosts = new Set<string>();

  for (const entry of history) {
    const label = entry.trim();
    if (!label) {
      continue;
    }
    const host = hostFromEndpoint(label);
    const endpointItem: ConnectSuggestion = {
      id: connectSuggestionKey({ entry: "endpoint", label }),
      entry: "endpoint",
      label,
      description: "Recent",
      host: host ?? label,
    };
    endpoints.push(endpointItem);
    if (host && !seenHosts.has(host)) {
      seenHosts.add(host);
      hosts.push({
        id: connectSuggestionKey({ entry: "host", label: `${host}:` }),
        entry: "host",
        label: `${host}:`,
        description: "IP only",
        host,
      });
    }
  }

  const typed = query.trim();
  const matchingHosts =
    typed && !typed.includes(":")
      ? hosts.filter((item) =>
          item.host.toLowerCase().startsWith(typed.toLowerCase()),
        )
      : [];
  if (matchingHosts.length === 0) {
    return interleave(endpoints, hosts);
  }
  const promoted = new Set(matchingHosts.map((item) => item.host));
  return [
    ...matchingHosts,
    ...interleave(
      endpoints,
      hosts.filter((item) => !promoted.has(item.host)),
    ),
  ];
}

/** IP-only rows fill `ip:` so the next port can be typed. Full addresses fill as-is. */
export function valueForConnectSuggestion(item: ConnectSuggestion): string {
  return item.entry === "host" ? `${item.host}:` : item.label;
}

export function nextConnectSuggestion(
  items: readonly ConnectSuggestion[],
  active: ConnectSuggestion | undefined,
  query: string,
): ConnectSuggestion | undefined {
  const q = query.trim().toLowerCase();
  const visible = q
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.host.toLowerCase().includes(q),
      )
    : [...items];
  if (visible.length === 0) {
    return undefined;
  }
  if (!active) {
    return visible[0];
  }
  const index = visible.findIndex(
    (item) => item.entry === active.entry && item.label === active.label,
  );
  if (index < 0) {
    return visible[0];
  }
  return visible[(index + 1) % visible.length];
}

/**
 * Pick the list row that matches the address field. Quick Pick often highlights the
 * endpoint above an IP-only row while the field already shows `ip:`.
 */
export function connectChoiceItem(
  items: readonly ConnectSuggestion[],
  typedRaw: string,
  hinted: ConnectSuggestion | undefined,
): ConnectSuggestion | undefined {
  const typed = typedRaw.trim();
  if (!typed) {
    return hinted;
  }
  const exact = items.filter(
    (item) => valueForConnectSuggestion(item) === typed,
  );
  if (exact.length === 1) {
    return exact[0];
  }
  if (hinted) {
    const resolved = findConnectSuggestion(items, hinted);
    if (resolved && valueForConnectSuggestion(resolved) === typed) {
      return resolved;
    }
  }
  if (typed.endsWith(":")) {
    const hostPart = typed.slice(0, -1);
    const hostRow = items.find(
      (item) => item.entry === "host" && item.host === hostPart,
    );
    if (hostRow) {
      return hostRow;
    }
  }
  return findConnectSuggestion(items, hinted) ?? hinted;
}

/** Enter replaces from the list only when the user is not typing in the field. */
export function shouldReplaceFieldWithHint(
  typedRaw: string,
  hinted: ConnectSuggestion | undefined,
  manualEdit = false,
): boolean {
  if (!hinted || manualEdit) {
    return false;
  }
  const typed = typedRaw.trim();
  return typed !== valueForConnectSuggestion(hinted);
}

/** Tab after keyboard navigation inserts the highlighted row; otherwise advance then insert. */
export function connectTabTarget(
  items: readonly ConnectSuggestion[],
  active: ConnectSuggestion | undefined,
  manualEdit: boolean,
): ConnectSuggestion | undefined {
  if (manualEdit && active) {
    return active;
  }
  return nextConnectSuggestion(items, active, "");
}

/**
 * A highlighted row that differs from the field updates the field.
 * Enter connects only when the field already shows that full address.
 * A typed host:port still connects when the text was not inserted from the list.
 */
export function resolveConnectChoice(
  typedRaw: string,
  chosen: ConnectSuggestion | undefined,
  valueFromList = false,
): ConnectChoice {
  const typed = typedRaw.trim();
  if (chosen) {
    const filled = valueForConnectSuggestion(chosen);
    if (typed !== filled) {
      if (!valueFromList && isValidHostPort(typed)) {
        return { type: "connect", address: typed };
      }
      return { type: "edit", value: filled };
    }
    if (chosen.entry === "endpoint" && isValidHostPort(filled)) {
      return { type: "connect", address: filled };
    }
    return { type: "edit", value: filled };
  }
  if (isValidHostPort(typed)) {
    return { type: "connect", address: typed };
  }
  if (typed !== "" && !typed.includes(":")) {
    return { type: "edit", value: `${typed}:` };
  }
  return { type: "invalid" };
}
