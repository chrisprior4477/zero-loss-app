import { describe, expect, it } from "vitest";
import { readViewMessage, sharedDestination } from "./shared-view";

describe("shopping views shared between demo devices", () => {
  it("keeps an exact reward, entry, and published shopping search", () => {
    expect(sharedDestination("/account/wallet?rewardId=rw_42&view=history#reward-pass")).toBe(
      "/account/wallet?rewardId=rw_42&view=history#reward-pass",
    );
    expect(sharedDestination("/account/entries/ent_a9?entries=open")).toBe(
      "/account/entries/ent_a9?entries=open",
    );
    expect(sharedDestination("/browse?q=Sony+TV&min=25")).toBe("/browse?min=25&q=Sony+TV");
  });
  it("drops credentials, private routes and external destinations", () => {
    for (const route of [
      "/login",
      "/account/profile",
      "/account/security",
      "/support",
      "/api/personal-demo",
      "//example.com/browse",
    ])
      expect(sharedDestination(route)).toBeNull();
    expect(sharedDestination("/?access_token=private#demo-invite=secret")).toBe("/");
    expect(sharedDestination("/account/wallet?next=https%3A%2F%2Fexample.com&view=history")).toBe(
      "/account/wallet?view=history",
    );
  });
  it("only accepts a visual marker and a known shopping panel", () => {
    const message = {
      source: "342f4ee4-f69b-4e27-910d-d65fae418805",
      code: "0789",
      surface: "info",
      url: "/items/tv",
      mark: "tap",
      x: 100,
      y: 400,
    };
    expect(readViewMessage(JSON.stringify(message))).toEqual(message);
    for (const patch of [
      { x: 1001 },
      { surface: "purchase" },
      { url: "/items/tv?secret=1" },
      { mark: "Enter a password" },
    ]) {
      expect(readViewMessage(JSON.stringify({ ...message, ...patch }))).toBeNull();
    }
  });
});
