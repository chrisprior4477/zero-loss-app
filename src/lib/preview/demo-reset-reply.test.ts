import { afterEach, expect, test, vi } from "vitest";
import { waitForDemoResetReply } from "./demo-reset-reply";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

test.each(["offline", "timeout"])("a pending %s releases the control without replaying the write", async interruption => {
  vi.useFakeTimers();
  let finish!: (value: string) => void;
  const request = vi.fn(() => new Promise<string>(resolve => { finish = resolve; }));
  const response = waitForDemoResetReply(request, "check");
  if (interruption === "offline") window.dispatchEvent(new Event("offline"));
  else await vi.advanceTimersByTimeAsync(15_000);
  expect(await response).toBe("check");
  finish("late confirmation");
  expect(await response).toBe("check");
  expect(request).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
