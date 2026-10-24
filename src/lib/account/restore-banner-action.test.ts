import { beforeEach, expect, test, vi } from "vitest";
import type { AccountNotification } from "./notifications";
const mock=vi.hoisted(()=>({getUser:vi.fn(),rpc:vi.fn(),snapshot:vi.fn(),revalidate:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:mock.getUser},rpc:mock.rpc})}));
vi.mock("./notification-snapshot",()=>({getNotificationSnapshot:mock.snapshot}));
vi.mock("next/cache",()=>({revalidatePath:mock.revalidate}));
import { restoreNotificationBanner } from "./restore-banner-action";
const make=(id:string,tone:AccountNotification["tone"],extra:Partial<AccountNotification>={}):AccountNotification=>({id,tone,category:"activity",title:id,body:"",meta:"",href:`/${id}`,action:"View",...extra});
beforeEach(()=>{
 vi.clearAllMocks();mock.getUser.mockResolvedValue({data:{user:{id:"owner"}}});mock.rpc.mockResolvedValue({error:null});
 mock.snapshot.mockResolvedValue({notifications:[make("win","reward"),make("option","completion"),make("wallet","wallet"),make("paid","reward",{rewardSource:"purchase"}),make("shared-disabled","crew",{preferenceKey:"crew_updates"})],readIds:["win","option","wallet","paid"],readAvailable:true,preferences:{crew_updates:false}});
});
test("restores only current enabled header alerts and preserves unrelated read receipts",async()=>{
 const result=await restoreNotificationBanner();
 expect(mock.rpc).toHaveBeenCalledWith("restore_notification_banner",{p_ids:["win","option"]});
 expect(result).toMatchObject({ok:true,ids:["win","option"],snapshot:{readIds:["wallet","paid"]}});
});
test("requires a signed-in account",async()=>{
 mock.getUser.mockResolvedValue({data:{user:null}});expect((await restoreNotificationBanner()).ok).toBe(false);expect(mock.rpc).not.toHaveBeenCalled();
});
test("failed restoration does not claim success or refresh the page",async()=>{
 mock.rpc.mockResolvedValue({error:{message:"offline"}});expect((await restoreNotificationBanner()).ok).toBe(false);expect(mock.revalidate).not.toHaveBeenCalled();
});
