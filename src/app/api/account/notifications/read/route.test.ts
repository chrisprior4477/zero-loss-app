import { beforeEach, expect, test, vi } from "vitest";
const mock=vi.hoisted(()=>({store:vi.fn()}));
vi.mock("@/lib/account/notification-read-store",()=>({storeNotificationReads:mock.store}));
import { POST } from "./route";
const url="https://example.com/api/account/notifications/read";
beforeEach(()=>{vi.clearAllMocks();mock.store.mockResolvedValue({ok:true,message:"Saved",status:200});});
test("same-origin reads persist without a page refresh and are never cached",async()=>{
 const response=await POST(new Request(url,{method:"POST",headers:{origin:"https://example.com","content-type":"application/json"},body:JSON.stringify({ids:["win-1"]})}));
 expect(response.status).toBe(200);expect(response.headers.get("Cache-Control")).toBe("private, no-store");expect(mock.store).toHaveBeenCalledWith(["win-1"]);
});
test.each([undefined,"https://foreign.example"])("rejects cross-site or missing origin %s",async origin=>{
 const response=await POST(new Request(url,{method:"POST",headers:{...(origin?{origin}:{}),"content-type":"application/json"},body:'{"ids":["win-1"]}'}));
 expect(response.status).toBe(403);expect(mock.store).not.toHaveBeenCalled();
});
test("invalid input and storage failures are visible to the caller",async()=>{
 const headers={origin:"https://example.com","content-type":"application/json"};
 expect((await POST(new Request(url,{method:"POST",headers,body:"invalid"}))).status).toBe(400);
 mock.store.mockResolvedValue({ok:false,message:"Sign in required",status:401});
 expect((await POST(new Request(url,{method:"POST",headers,body:'{"ids":["win-1"]}'}))).status).toBe(401);
});
