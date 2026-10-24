import { beforeEach, expect, test, vi } from "vitest";
const mock=vi.hoisted(()=>({getUser:vi.fn(),rpc:vi.fn(),revalidate:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:mock.getUser},rpc:mock.rpc})}));
vi.mock("next/cache",()=>({revalidatePath:mock.revalidate}));
import { saveNotificationBanner } from "./banner-actions";
beforeEach(()=>{vi.clearAllMocks();mock.getUser.mockResolvedValue({data:{user:{id:"owner"}}});mock.rpc.mockResolvedValue({error:null});});
test("saves independent speed and display duration for the authenticated account",async()=>{
 expect((await saveNotificationBanner("capsule",true,10,2)).ok).toBe(true);
 expect(mock.rpc).toHaveBeenCalledWith("save_notification_banner_preferences",{p_style:"capsule",p_enabled:true,p_speed:10,p_display_seconds:2});
});
test.each([0,11,2.5,NaN])("rejects an invalid display time %s before storage",async value=>{
 expect((await saveNotificationBanner("capsule",true,10,value)).ok).toBe(false);expect(mock.rpc).not.toHaveBeenCalled();
});
test("requires sign-in and reports storage failures",async()=>{
 mock.getUser.mockResolvedValue({data:{user:null}});expect((await saveNotificationBanner("capsule",true,5,6)).ok).toBe(false);expect(mock.rpc).not.toHaveBeenCalled();
 mock.getUser.mockResolvedValue({data:{user:{id:"owner"}}});mock.rpc.mockResolvedValue({error:{message:"offline"}});expect((await saveNotificationBanner("capsule",true,5,6)).ok).toBe(false);
});

test("saves popup shape without changing the account ownership contract",async()=>{
 expect((await saveNotificationBanner("ribbon",true,9,2,"ticket")).ok).toBe(true);
 expect(mock.rpc).toHaveBeenCalledWith("save_notification_banner_preferences",{p_style:"ribbon",p_enabled:true,p_speed:9,p_display_seconds:2,p_popup_style:"ticket"});
});
test("invalid popup shape is rejected before any write",async()=>{
 expect((await saveNotificationBanner("ribbon",true,9,2,"other" as never)).ok).toBe(false);
 expect(mock.rpc).not.toHaveBeenCalled();
});
