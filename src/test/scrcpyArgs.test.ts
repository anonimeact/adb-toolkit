import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildScrcpyArgs,
  parseScrcpyExtraArgs,
} from "../core/scrcpyArgs";

describe("buildScrcpyArgs", () => {
  it("inserts -s and serial", () => {
    assert.deepEqual(buildScrcpyArgs({ serial: "emulator-5554" }), [
      "-s",
      "emulator-5554",
    ]);
  });

  it("merges config and preset extras after serial", () => {
    assert.deepEqual(
      buildScrcpyArgs({
        serial: "ABC123",
        configExtra: ["--no-audio"],
        presetExtra: ["--stay-awake"],
      }),
      ["-s", "ABC123", "--no-audio", "--stay-awake"],
    );
  });
});

describe("parseScrcpyExtraArgs", () => {
  it("returns empty for blank setting", () => {
    assert.deepEqual(parseScrcpyExtraArgs(""), []);
    assert.deepEqual(parseScrcpyExtraArgs("   "), []);
  });

  it("splits quoted tokens", () => {
    assert.deepEqual(parseScrcpyExtraArgs('--no-audio --max-fps=30'), [
      "--no-audio",
      "--max-fps=30",
    ]);
  });
});
