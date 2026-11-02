import { describe, expect, it } from "vitest";
import { addressTimeZone } from "./address-timezone";
import { safeTimeZone } from "./timezone";

describe("address time zones", () => {
  it("uses ZIP locations, including states with more than one time zone", () => {
    expect(addressTimeZone("United States", "NC", "28401")).toBe("America/New_York");
    expect(addressTimeZone("United States", "Florida", "32401")).toBe("America/Chicago");
    expect(addressTimeZone("United States", "Texas", "79901")).toBe("America/Denver");
    expect(addressTimeZone("United States", "CA", "90001")).toBe("America/Los_Angeles");
    expect(addressTimeZone("United States", "AZ", "85001")).toBe("America/Phoenix");
    expect(addressTimeZone("United States", "AK", "99501")).toBe("America/Anchorage");
  });
  it("does not guess from an unknown or mismatched address", () => {
    expect(addressTimeZone("United States", "TX", "90001")).toBeNull();
    expect(addressTimeZone("Canada", "ON", "M5V 3A8")).toBeNull();
    expect(safeTimeZone(null)).toBe("America/New_York");
    expect(safeTimeZone("not-a-zone")).toBe("America/New_York");
  });
});
