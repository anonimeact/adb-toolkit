import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildLogcatArgs,
  parseLogcatDefaultFilter,
  withLogcatTailFromNow,
} from "../core/logcatArgs";
import { splitAdbArgString, isValidPort } from "../core/validators";

describe("buildLogcatArgs", () => {
  it("uses pid when provided", () => {
    assert.deepEqual(buildLogcatArgs({ pid: "1234" }), [
      "logcat",
      "--pid=1234",
    ]);
  });

  it("uses level when no pid", () => {
    assert.deepEqual(buildLogcatArgs({ level: "W" }), ["logcat", "*:W"]);
  });

  it("appends extra tokens", () => {
    assert.deepEqual(
      buildLogcatArgs({ level: "I", extraTokens: ["-s", "MyTag"] }),
      ["logcat", "*:I", "-s", "MyTag"],
    );
  });

  it("defaults to plain logcat", () => {
    assert.deepEqual(buildLogcatArgs({}), ["logcat"]);
  });
});

describe("withLogcatTailFromNow", () => {
  it("inserts -T after logcat", () => {
    const d = new Date("2026-03-15T14:05:06.789");
    assert.deepEqual(
      withLogcatTailFromNow(["logcat", "*:I"], d),
      ["logcat", "-T", "03-15 14:05:06.789", "*:I"],
    );
  });
});

describe("parseLogcatDefaultFilter", () => {
  it("splits whitespace tokens", () => {
    assert.deepEqual(parseLogcatDefaultFilter("  -s Foo  "), ["-s", "Foo"]);
  });
});

describe("splitAdbArgString", () => {
  it("respects quoted segments", () => {
    assert.deepEqual(splitAdbArgString('shell echo "hello world"'), [
      "shell",
      "echo",
      "hello world",
    ]);
  });
});

describe("isValidPort", () => {
  it("accepts valid ports", () => {
    assert.equal(isValidPort("5555"), true);
    assert.equal(isValidPort("1"), true);
  });

  it("rejects invalid ports", () => {
    assert.equal(isValidPort("0"), false);
    assert.equal(isValidPort("70000"), false);
  });
});
