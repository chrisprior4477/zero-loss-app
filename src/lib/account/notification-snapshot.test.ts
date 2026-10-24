import { beforeEach, expect, test, vi } from "vitest";
const mock = vi.hoisted(() => ({ preview: true, resetAt: null as string | null, getAccount: vi.fn(), from: vi.fn(), shares: [] as {id:string;createdAt:string}[], crew: [] as {id:string;created_at:string;requester_name:string}[] }));
vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("./context", () => ({ getAccountContext: mock.getAccount }));
vi.mock("@/lib/preview/environment", () => ({ isPreviewDataEnvironment: () => mock.preview }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mock.from, rpc: async (name: string) => ({error:null,data: name === "get_demo_wallet_history_visibility" ? {ledgerEntryIds:[],fundingSessionIds:[],fullReset:!!mock.resetAt,notificationResetAt:mock.resetAt} : name === "get_received_product_shares" ? mock.shares : {}}) }) }));
import { getNotificationSnapshot } from "./notification-snapshot";
beforeEach(() => {
 vi.clearAllMocks(); mock.preview=true; mock.resetAt=null;mock.shares=[];mock.crew=[];
 mock.getAccount.mockResolvedValue({userId:"owner",emailConfirmed:true,wallet:{scope:"demo",entries:[],balanceCents:0},activity:{source:"customer-empty",activity:[]},orders:{source:"customer-empty",orders:[]}});
 mock.from.mockImplementation((table: string) => {
   const result={error:null,data:table === "crew_invitations" ? mock.crew : table === "support_cases" ? [{id:"11111111-1111-4111-8111-111111111111",subject:"Old support case",status:"open",updated_at:"2026-01-01"}] : []};
   const chain={select:()=>chain,eq:vi.fn(()=>chain),order:()=>chain,limit:()=>Promise.resolve(result),in:()=>Promise.resolve(result),then:(resolve:(value:unknown)=>unknown)=>Promise.resolve(result).then(resolve)};
   return chain;
 });
});
test("MVP omits support notices and skips querying cases entirely", async () => {
 const snapshot=await getNotificationSnapshot();
 expect(snapshot?.supportEnabled).toBe(false);
 expect(snapshot?.notifications.some(n=>n.id.startsWith("support-"))).toBe(false);
 expect(mock.from).not.toHaveBeenCalledWith("support_cases");
});
test("full reset leaves zero notifications including old account, shared and Crew notices", async () => {
 mock.resetAt="2026-10-24T20:00:00Z";
 mock.shares=[{id:"old-pick",createdAt:"2026-10-23T20:00:00Z"}];
 mock.crew=[{id:"old-request",requester_name:"Member",created_at:"2026-10-24T20:00:00Z"}];
 expect((await getNotificationSnapshot())?.notifications).toEqual([]);
 // Refresh and Restore banner both use the same durable snapshot.
 expect((await getNotificationSnapshot())?.notifications).toEqual([]);
});
test("new shares and Crew requests still notify after reset", async () => {
 mock.resetAt="2026-10-24T20:00:00Z";
 mock.shares=[{id:"old-pick",createdAt:"2026-10-23T20:00:00Z"},{id:"new-pick",createdAt:"2026-10-24T20:01:00Z"}];
 mock.crew=[{id:"new-request",requester_name:"Member",created_at:"2026-10-24T20:02:00Z"}];
 expect((await getNotificationSnapshot())?.notifications.map(n=>n.id)).toEqual(["shared-new-pick","crew-new-request"]);
});
test("support and existing account notices stay available outside the MVP", async () => {
 mock.preview=false;
 const snapshot=await getNotificationSnapshot();
 expect(snapshot?.supportEnabled).toBe(true);
 expect(snapshot?.notifications.map(n=>n.id)).toContain("account-email-confirmed");
 expect(snapshot?.notifications.some(n=>n.id.startsWith("support-"))).toBe(true);
});
