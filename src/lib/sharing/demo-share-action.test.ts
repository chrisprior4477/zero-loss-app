import { beforeEach, expect, test, vi } from 'vitest';
const mock=vi.hoisted(()=>({preview:true,user:{id:'owner'} as {id:string}|null,rpc:vi.fn(),from:vi.fn(),eq:vi.fn(),read:false,readError:false}));
vi.mock('@/lib/preview/environment',()=>({isPreviewDataEnvironment:()=>mock.preview}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:mock.user}})},rpc:mock.rpc,from:mock.from})}));
import { sendDemoShare } from './demo-share-action';
const request='11111111-1111-4111-8111-111111111111';
beforeEach(()=>{vi.clearAllMocks();mock.preview=true;mock.user={id:'owner'};mock.read=false;mock.readError=false;mock.rpc.mockResolvedValue({data:'share',error:null});mock.from.mockImplementation(table=>{const query={select:()=>query,eq:(...args:unknown[])=>{mock.eq(...args);return query;},maybeSingle:async()=>({data:table==='received_product_shares'?{token:request}:mock.read?{notification_id:'shared-share'}:null,error:mock.readError?{code:'offline'}:null})};return query;});});
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

test('returns a verified alert with account-scoped receipt and read status',async()=>{
 const result=await sendDemoShare(request);
 expect(result.notification).toMatchObject({id:'shared-share',href:`/items/walmart-100-gift-card?share=${request}`,tone:'crew'});
 expect(result.isRead).toBe(false);
 expect(mock.eq).toHaveBeenCalledWith('recipient_id','owner');
 expect(mock.eq).toHaveBeenCalledWith('customer_id','owner');
 mock.read=true;expect((await sendDemoShare(request)).isRead).toBe(true);
});

test('receipt lookup failure falls back to refresh without fabricating an alert',async()=>{
 mock.readError=true;const result=await sendDemoShare(request);
 expect(result.ok).toBe(true);expect(result.notification).toBeUndefined();
});
