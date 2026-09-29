import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDevicesList } from "../core/devicesParser";

describe("devicesParser", () => {
  it("parses adb devices -l output", () => {
    const sample =
      "List of devices attached\r\n" +
      "emulator-5554\toffline transport_id:1\r\n" +
      "R3CN30AB\tdevice product:sdk model:Pixel_6 device:oriole transport_id:2\r\n";

    const devices = parseDevicesList(sample);
    assert.equal(devices.length, 2);
    assert.equal(devices[1].serial, "R3CN30AB");
    assert.equal(devices[1].state, "device");
    assert.equal(devices[1].model, "Pixel_6");
  });
});
