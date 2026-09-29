import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getDeviceListPresentation,
  parseDevicesList,
} from "../core/devicesParser";

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

  it("parses mDNS serials with spaces before state", () => {
    const sample =
      "List of devices attached\n" +
      "adb-4dbce859-JTTZD2 (2)._adb-tls-connect._tcp device product:sweet_id model:M2101K6G device:sweet transport_id:1\n";

    const devices = parseDevicesList(sample);
    assert.equal(devices.length, 1);
    assert.equal(
      devices[0].serial,
      "adb-4dbce859-JTTZD2 (2)._adb-tls-connect._tcp",
    );
    assert.equal(devices[0].state, "device");
    assert.equal(devices[0].model, "M2101K6G");
  });

  it("formats list presentation with model title and serial subtitle", () => {
    const pres = getDeviceListPresentation({
      serial: "192.168.18.12:5555",
      state: "device",
      model: "M2101K6G",
    });
    assert.equal(pres.title, "M2101K6G");
    assert.equal(pres.subtitle, "192.168.18.12:5555 - mobile");
  });

  it("adds wireless suffix for mDNS serials", () => {
    const pres = getDeviceListPresentation({
      serial: "adb-4dbce859-JTTZD2 (2)._adb-tls-connect._tcp",
      state: "device",
      model: "M2101K6G",
    });
    assert.equal(pres.title, "M2101K6G (wireless)");
  });

  it("skips adb daemon status lines on stderr", () => {
    const sample =
      "List of devices attached\n" +
      "* daemon not running; starting now at tcp:5037\n" +
      "emulator-5554\tdevice transport_id:2\n";

    const devices = parseDevicesList(sample);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].serial, "emulator-5554");
  });
});
