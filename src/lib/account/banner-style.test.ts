import { expect, test } from "vitest";
import { bannerTiming, bannerSpeedOrDefault, bannerDisplaySecondsOrDefault } from "./banner-style";
test("speed 1 unfolds slowly and speed 10 quickly, while every speed holds for six seconds", () => {
  const timings=Array.from({length:10},(_,i)=>bannerTiming(i+1));
  expect(timings[0].revealMs).toBe(1800); expect(timings[9].revealMs).toBe(200);
  for(let i=0;i<10;i++) { expect(timings[i].holdMs).toBe(6000); expect(timings[i].cycleMs).toBe(timings[i].revealMs*2+6200); if(i)expect(timings[i].revealMs).toBeLessThan(timings[i-1].revealMs); }
});
test("missing or invalid saved speeds fall back to five", () => { for(const v of [null,undefined,0,11,2.5,'7',NaN])expect(bannerSpeedOrDefault(v)).toBe(5); expect(bannerSpeedOrDefault(7)).toBe(7); });
test("display time independently changes the hold from one to ten seconds",()=>{
 for(let seconds=1;seconds<=10;seconds++){
   const timing=bannerTiming(8,seconds);
   expect(timing.holdMs).toBe(seconds*1000);
   expect(timing.revealMs).toBe(bannerTiming(8,6).revealMs);
   expect(timing.cycleMs).toBe(timing.revealMs*2+timing.holdMs+200);
 }
});
test("display time defaults to six seconds for existing or invalid preferences",()=>{
 for(const value of [undefined,null,0,11,1.5,"4",NaN])expect(bannerDisplaySecondsOrDefault(value)).toBe(6);
 expect(bannerDisplaySecondsOrDefault(10)).toBe(10);
});
