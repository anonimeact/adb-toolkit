import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  connectSuggestionItems,
  connectChoiceItem,
  connectSuggestionKey,
  connectTabTarget,
  shouldReplaceFieldWithHint,
  nextConnectSuggestion,
  nextConnectionHistory,
  resolveConnectChoice,
  valueForConnectSuggestion,
  type ConnectSuggestion,
} from "../core/connectAddress";

const endpoint = (label: string): ConnectSuggestion => ({
  id: connectSuggestionKey({ entry: "endpoint", label }),
  entry: "endpoint",
  label,
  description: "Recent",
  host: label.slice(0, label.lastIndexOf(":")),
});

const host = (ip: string): ConnectSuggestion => ({
  id: connectSuggestionKey({ entry: "host", label: `${ip}:` }),
  entry: "host",
  label: `${ip}:`,
  description: "IP only",
  host: ip,
});

describe("nextConnectionHistory", () => {
  it("keeps at most five addresses and drops the oldest", () => {
    const history = ["1.1.1.1:1", "1.1.1.1:2", "1.1.1.1:3", "1.1.1.1:4", "1.1.1.1:5"];
    assert.deepEqual(nextConnectionHistory(history, "1.1.1.1:6"), [
      "1.1.1.1:6",
      "1.1.1.1:1",
      "1.1.1.1:2",
      "1.1.1.1:3",
      "1.1.1.1:4",
    ]);
  });

  it("moves a duplicate to the front without dropping another entry", () => {
    const history = ["10.0.0.2:5555", "10.0.0.3:5555", "10.0.0.4:5555"];
    assert.deepEqual(nextConnectionHistory(history, "10.0.0.4:5555"), [
      "10.0.0.4:5555",
      "10.0.0.2:5555",
      "10.0.0.3:5555",
    ]);
  });
});

describe("connectSuggestionItems", () => {
  it("lists each recent endpoint and one IP-only row for that host", () => {
    assert.deepEqual(
      connectSuggestionItems([
        "192.168.18.12:39029",
        "192.168.18.12:5555",
        "10.0.0.4:5555",
      ]),
      [
        endpoint("192.168.18.12:39029"),
        host("192.168.18.12"),
        endpoint("192.168.18.12:5555"),
        endpoint("10.0.0.4:5555"),
        host("10.0.0.4"),
      ],
    );
  });

  it("promotes the matching IP when the box has no port yet", () => {
    const items = connectSuggestionItems(
      ["192.168.18.12:39029", "10.0.0.4:5555"],
      "192.168.18.12",
    );
    assert.equal(items[0]?.entry, "host");
    assert.equal(items[0]?.label, "192.168.18.12:");
  });
});

describe("resolveConnectChoice", () => {
  it("connects a typed host:port even if another row is highlighted", () => {
    assert.deepEqual(
      resolveConnectChoice(
        "192.168.18.12:40000",
        endpoint("192.168.18.12:39029"),
      ),
      { type: "connect", address: "192.168.18.12:40000" },
    );
  });

  it("fills an empty box from the highlighted endpoint", () => {
    assert.deepEqual(resolveConnectChoice("", endpoint("10.0.0.4:5555")), {
      type: "edit",
      value: "10.0.0.4:5555",
    });
  });

  it("connects when the field already shows that endpoint", () => {
    assert.deepEqual(
      resolveConnectChoice("10.0.0.4:5555", endpoint("10.0.0.4:5555"), true),
      { type: "connect", address: "10.0.0.4:5555" },
    );
  });

  it("replaces a filled field when another list item is accepted", () => {
    assert.deepEqual(
      resolveConnectChoice("192.168.18.12:39029", host("10.0.0.4"), true),
      { type: "edit", value: "10.0.0.4:" },
    );
    assert.deepEqual(
      resolveConnectChoice(
        "192.168.18.12:39029",
        endpoint("10.0.0.4:5555"),
        true,
      ),
      { type: "edit", value: "10.0.0.4:5555" },
    );
  });

  it("keeps the box open at ip: when the IP-only row is accepted", () => {
    assert.deepEqual(resolveConnectChoice("192.168.18.12", host("192.168.18.12")), {
      type: "edit",
      value: "192.168.18.12:",
    });
  });
});

describe("valueForConnectSuggestion", () => {
  it("inserts a trailing colon for an IP-only row", () => {
    assert.equal(valueForConnectSuggestion(host("192.168.18.12")), "192.168.18.12:");
  });

  it("inserts the full address for a recent endpoint", () => {
    assert.equal(
      valueForConnectSuggestion(endpoint("192.168.18.12:39029")),
      "192.168.18.12:39029",
    );
  });
});

describe("nextConnectSuggestion", () => {
  it("moves from a recent endpoint to its IP-only row", () => {
    const recent = endpoint("192.168.18.12:39029");
    const ip = host("192.168.18.12");
    assert.equal(nextConnectSuggestion([recent, ip], recent, "")?.label, ip.label);
  });
});

describe("shouldReplaceFieldWithHint", () => {
  it("replaces when Enter targets a different highlighted row", () => {
    const recent = endpoint("192.168.18.12:39029");
    const ip = host("192.168.18.12");
    assert.equal(
      shouldReplaceFieldWithHint("192.168.18.12:39029", ip, false),
      true,
    );
    assert.equal(
      shouldReplaceFieldWithHint("192.168.18.12:", ip, false),
      false,
    );
  });

  it("does not replace while the user is typing a port after IP only", () => {
    const ip = host("192.168.18.12");
    assert.equal(
      shouldReplaceFieldWithHint("192.168.18.12:39029", ip, true),
      false,
    );
  });
});

describe("connectChoiceItem", () => {
  it("prefers the IP-only row when the field already ends with a colon", () => {
    const recent = endpoint("192.168.18.12:39029");
    const ip = host("192.168.18.12");
    const items = [recent, ip];
    assert.equal(
      connectChoiceItem(items, "192.168.18.12:", recent)?.entry,
      "host",
    );
  });
});

describe("connectTabTarget", () => {
  it("inserts the highlighted IP row instead of the next endpoint", () => {
    const recent = endpoint("192.168.18.12:39029");
    const ip = host("192.168.18.12");
    const older = endpoint("192.168.18.12:5555");
    const items = [recent, ip, older];
    assert.equal(connectTabTarget(items, ip, true)?.entry, "host");
    assert.equal(connectTabTarget(items, ip, true)?.label, "192.168.18.12:");
  });

  it("advances to the next row when the value already came from the list", () => {
    const recent = endpoint("192.168.18.12:39029");
    const ip = host("192.168.18.12");
    assert.equal(connectTabTarget([recent, ip], recent, false)?.label, ip.label);
  });
});
