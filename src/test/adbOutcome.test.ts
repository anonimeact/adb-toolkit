import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adbFailureMessage,
  adbStatusMessage,
  formatAdbExecError,
} from "../core/adbOutcome";

describe("adbFailureMessage", () => {
  it("reads connect failures that adb prints with exit code 0", () => {
    const output =
      "failed to connect to '192.168.18.12:39029': No route to host";
    assert.equal(
      adbFailureMessage(["connect", "192.168.18.12:39029"], output),
      output,
    );
  });

  it("ignores daemon startup lines before a connect failure", () => {
    const output = [
      "* daemon not running; starting now at tcp:5037",
      "* daemon started successfully",
      "failed to connect to 10.0.0.8:5555",
    ].join("\n");
    assert.equal(
      adbFailureMessage(["connect", "10.0.0.8:5555"], output),
      "failed to connect to 10.0.0.8:5555",
    );
  });

  it("does not treat a successful connect as a failure", () => {
    assert.equal(
      adbFailureMessage(
        ["connect", "192.168.1.5:5555"],
        "connected to 192.168.1.5:5555",
      ),
      undefined,
    );
    assert.equal(
      adbFailureMessage(
        ["connect", "192.168.1.5:5555"],
        "already connected to 192.168.1.5:5555",
      ),
      undefined,
    );
  });

  it("reads disconnect, pair, install, and push failures", () => {
    assert.match(
      adbFailureMessage(
        ["disconnect", "192.168.18.12:39029"],
        "error: no such device '192.168.18.12:39029'",
      ) ?? "",
      /no such device/,
    );
    assert.match(
      adbFailureMessage(["pair", "192.168.1.5:37123", "123456"], "Failed: pairing rejected") ??
        "",
      /pairing rejected/,
    );
    assert.match(
      adbFailureMessage(
        ["install", "-r", "app.apk"],
        "Performing Streamed Install\nFailure [INSTALL_FAILED_VERSION_DOWNGRADE]",
      ) ?? "",
      /INSTALL_FAILED_VERSION_DOWNGRADE/,
    );
    assert.match(
      adbFailureMessage(
        ["push", "a.txt", "/sdcard/a.txt"],
        "adb: error: cannot stat 'a.txt': No such file or directory",
      ) ?? "",
      /cannot stat/,
    );
  });

  it("leaves install success and device dumps alone", () => {
    assert.equal(
      adbFailureMessage(
        ["install", "-r", "app.apk"],
        "Performing Streamed Install\nSuccess",
      ),
      undefined,
    );
    assert.equal(
      adbFailureMessage(
        ["shell", "dumpsys", "battery"],
        "Current Battery Service state:\n  status: 2\nerror: not a failure line in the middle",
      ),
      undefined,
    );
  });

  it("reads shell tool failures that still exit 0", () => {
    assert.equal(
      adbFailureMessage(["shell", "pm", "clear", "com.example"], "Failed"),
      "Failed",
    );
    assert.match(
      adbFailureMessage(
        ["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "foo"],
        "Starting: Intent { act=android.intent.action.VIEW dat=foo }\nError: Activity not started, unable to resolve Intent",
      ) ?? "",
      /Activity not started/,
    );
    assert.match(
      adbFailureMessage(
        ["shell", "monkey", "-p", "com.missing", "1"],
        "args: [-p, com.missing, 1]\n** No activities found to run, monkey aborted.",
      ) ?? "",
      /No activities found/,
    );
  });
});

describe("adbStatusMessage", () => {
  it("uses adb's status line and skips daemon noise", () => {
    assert.equal(
      adbStatusMessage(
        "* daemon started successfully\nconnected to 192.168.1.5:5555",
        "Connected",
      ),
      "connected to 192.168.1.5:5555",
    );
  });
});

describe("formatAdbExecError", () => {
  it("prefers adb's failure line over the process error wrapper", () => {
    assert.equal(
      formatAdbExecError(
        ["connect", "192.168.18.12:39029"],
        "failed to connect to '192.168.18.12:39029': No route to host",
        "",
        "Command failed: adb connect 192.168.18.12:39029",
      ),
      "failed to connect to '192.168.18.12:39029': No route to host",
    );
  });
});
