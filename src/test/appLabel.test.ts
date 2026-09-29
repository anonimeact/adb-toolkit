import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatLogcatSessionTitle,
  parseApplicationLabelFromDumpsys,
} from "../core/appLabel";

describe("parseApplicationLabelFromDumpsys", () => {
  it("reads application-label", () => {
    const sample = "  application-label='My Cool App'\n  versionName=1.0";
    assert.equal(parseApplicationLabelFromDumpsys(sample), "My Cool App");
  });

  it("reads localized application-label", () => {
    const sample = "  application-label-en='Hello'\n";
    assert.equal(parseApplicationLabelFromDumpsys(sample), "Hello");
  });
});

describe("formatLogcatSessionTitle", () => {
  it("includes app label and package", () => {
    assert.equal(
      formatLogcatSessionTitle("emulator-5554", "com.foo", "Foo App"),
      "ADB Logcat: Foo App (com.foo) — emulator-5554",
    );
  });

  it("falls back to serial only", () => {
    assert.equal(
      formatLogcatSessionTitle("ABC123"),
      "ADB Logcat (ABC123)",
    );
  });
});
