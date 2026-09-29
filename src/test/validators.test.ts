import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidHostPort,
  isValidPackageName,
  normalizeStdout,
} from "../core/validators";

describe("validators", () => {
  it("accepts valid host:port", () => {
    assert.equal(isValidHostPort("192.168.0.5:5555"), true);
    assert.equal(isValidHostPort("localhost:5037"), true);
  });

  it("rejects invalid host:port", () => {
    assert.equal(isValidHostPort("not-an-address"), false);
    assert.equal(isValidHostPort("1.1.1.1:99999"), false);
  });

  it("validates package names", () => {
    assert.equal(isValidPackageName("com.example.app"), true);
    assert.equal(isValidPackageName("bad..name"), false);
  });

  it("normalizes CRLF", () => {
    assert.equal(normalizeStdout("a\r\nb"), "a\nb");
  });
});
