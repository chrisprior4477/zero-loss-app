import { beforeEach, expect, test, vi } from 'vitest';
const mock=vi.hoisted(()=>({preview:true,user:{id:'owner'} as {id:string}|null,rpc:vi.fn()}));
vi.mock('@/lib/preview/environment',()=>({isPreviewDataEnvironment:()=>mock.preview}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:mock.user}})},rpc:mock.rpc})}));
import { sendDemoShare } from './demo-share-action';
const request='11111111-1111-4111-8111-111111111111';
beforeEach(()=>{vi.clearAllMocks();mock.preview=true;mock.user={id:'owner'};mock.rpc.mockResolvedValue({data:'share',error:null});});
test('sends only to the authenticated account through the self-demo RPC',async()=>{
 expect((await sendDemoShare(request)).ok).toBe(true);
 expect(mock.rpc).toHaveBeenCalledWith('send_demo_product_share',{p_request_id:request});
 expect(mock.rpc).toHaveBeenCalledTimes(1);
});
test('production, guests, and malformed requests cannot send a demo',async()=>{
 mock.preview=false;expect((await sendDemoShare(request)).ok).toBe(false);
 mock.preview=true;mock.user=null;expect((await sendDemoShare(request)).ok).toBe(false);
 mock.user={id:'owner'};expect((await sendDemoShare('bad')).ok).toBe(false);
 expect(mock.rpc).not.toHaveBeenCalled();
});
test('a database failure is never reported as a delivered share',async()=>{
 mock.rpc.mockResolvedValue({error:{code:'42501'}});expect((await sendDemoShare(request)).ok).toBe(false);
});
