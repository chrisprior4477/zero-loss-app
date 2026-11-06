import { expect, test, vi } from "vitest";
import { retryAccountLoad } from "./load-retry";

test.each([{error:{code:"57014"}}, {error:{message:"TypeError: fetch failed"},status:0}, {error:{message:"unavailable"},status:503}])("retries a temporary account read once: %j", async first => {
  const load = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce({error:null,data:"verified"});
  expect(await retryAccountLoad(load)).toEqual({error:null,data:"verified"});
  expect(load).toHaveBeenCalledTimes(2);
});
test.each([{error:{code:"42501"},status:403},{error:{message:"invalid credentials"},status:401},{error:{code:"22023"},status:400}])("does not retry a denied or invalid response: %j", async result => {
  const load = vi.fn().mockResolvedValue(result);
  expect(await retryAccountLoad(load)).toBe(result);
  expect(load).toHaveBeenCalledOnce();
});
test("persistent failures stop at two calls", async () => {
  const load = vi.fn().mockResolvedValue({error:{code:"PGRST003"},status:504});
  expect((await retryAccountLoad(load)).error).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(2);
});
test("a rejected transport request can recover, and a persistent rejection still throws", async () => {
  const load = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce({error:null});
  expect(await retryAccountLoad(load)).toEqual({error:null});
  const failed = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
  await expect(retryAccountLoad(failed)).rejects.toThrow("fetch failed");
  expect(failed).toHaveBeenCalledTimes(2);
});
