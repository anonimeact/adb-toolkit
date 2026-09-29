import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { serialNeedsScrcpyTcpWorkaround } from "../core/scrcpySerial";

describe("serialNeedsScrcpyTcpWorkaround", () => {
  it("detects mDNS serials with spaces", () => {
    assert.equal(
      serialNeedsScrcpyTcpWorkaround(
        "adb-4dbce859-JTTZD2 (2)._adb-tls-connect._tcp",
      ),
      true,
    );
  });

  it("ignores normal serials", () => {
    assert.equal(serialNeedsScrcpyTcpWorkaround("192.168.18.12:5555"), false);
    assert.equal(serialNeedsScrcpyTcpWorkaround("emulator-5554"), false);
  });
});
