import { expect, test } from "vitest";
import { bannerTiming, bannerSpeedOrDefault } from "./banner-style";
test("speed 1 unfolds slowly and speed 10 quickly, while every speed holds for six seconds", () => {
  const timings=Array.from({length:10},(_,i)=>bannerTiming(i+1));
  expect(timings[0].revealMs).toBe(1800); expect(timings[9].revealMs).toBe(200);
  for(let i=0;i<10;i++) { expect(timings[i].holdMs).toBe(6000); expect(timings[i].cycleMs).toBe(timings[i].revealMs*2+6200); if(i)expect(timings[i].revealMs).toBeLessThan(timings[i-1].revealMs); }
});
test("missing or invalid saved speeds fall back to five", () => { for(const v of [null,undefined,0,11,2.5,'7',NaN])expect(bannerSpeedOrDefault(v)).toBe(5); expect(bannerSpeedOrDefault(7)).toBe(7); });
