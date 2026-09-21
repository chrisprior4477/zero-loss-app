// Loopback-only concurrency/long-interruption test. Retain new audit fixtures.
const { Client } = require('../.tmp-wallet-audit-runtime/node_modules/pg');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const connections=[];
async function connect(id) {
 const c=new Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:54322/postgres'});
 await c.connect();connections.push(c);
 if(id){await c.query('set role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id,JSON.stringify({sub:id,iss:'https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1'})]);}
 return c;
}
async function main(){
 const db=await connect(),id=randomUUID(),tag=randomUUID().replaceAll('-',''),slug=`recovery-race-${tag}`;
 const cfg=(await db.query('select enabled,preview_entries_enabled,preview_provisioning_enabled,entry_undo_required,entry_recovery_required,preview_issuer from demo_private.funding_config where singleton')).rows[0];
 try {
  await db.query("update demo_private.funding_config set enabled=true,preview_entries_enabled=true,preview_provisioning_enabled=true,entry_undo_required=true,entry_recovery_required=true,preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' where singleton");
  await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),'{"legal_first_name":"Recovery","legal_last_name":"Local audit","date_of_birth":"1990-01-01"}')`,[id,`${id}@example.test`]);
  await db.query("update public.customers set status='active',verification_status='email_verified' where id=$1",[id]);
  await db.query('select demo_private.ensure_preview_customer_for($1)',[id]);
  await db.query(`insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
   select $2,customer_id,'DEPOSIT','PLAYABLE',1000,'USD',$3,id,'demo' from public.wallet_accounts where customer_id=$1 and scope='demo' and closed_at is null`,[id,`len_${tag}`,`recovery_test_${tag}`]);
  await db.query(`insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,sample_entries) values($1,'Recovery race','Test','Test','/test.png',2500,100,100,0)`,[slug]);
  const a=await connect(id),b=await connect(id);
  const submit=async(c,key,prev=null)=>(await c.query('select public.submit_preview_entries($1,2,$2,false,$3) as r',[slug,key,prev])).rows[0].r;
  const first=await Promise.all([submit(a,`${tag}_first`),submit(b,`${tag}_first`)]);
  assert.equal(first[0].requestId,first[1].requestId);
  console.log('PASS concurrent same-key submission reserves once');
  // Ignore the first response from the UI perspective, as if transport failed.
  // Complete on server, then remain disconnected beyond the old two-minute UI window.
  await new Promise(r=>setTimeout(r,31000));
  await db.query('select demo_private.finalize_due_entry_requests()');
  console.log('Server accepted original request; waiting past former receipt-expiry window.');
  await new Promise(r=>setTimeout(r,122000));
  const recovered=await submit(a,`${tag}_reload`);
  assert.equal(recovered.requestId,first[0].requestId);assert.equal(recovered.status,'accepted');
  assert.equal((await a.query('select public.list_preview_entry_requests() as r')).rows[0].r[0].requestId,recovered.requestId);
  assert.equal(Number((await db.query("select sum(amount) n from public.ledger_entries where customer_id=$1 and balance_type='PLAYABLE'",[id])).rows[0].n),800);
  console.log('PASS long disconnected reload recovers original two tickets with no extra debit');
  const next=await Promise.all([submit(a,`${tag}_next_a`,recovered.requestId),submit(b,`${tag}_next_b`,recovered.requestId)]);
  assert.equal(next[0].requestId,next[1].requestId);
  await a.query('select public.resolve_preview_entry_request($1,true)',[next[0].requestId]);
  const late=await submit(b,`${tag}_late`,recovered.requestId);
  assert.equal(late.requestId,next[0].requestId);assert.equal(late.status,'cancelled');
  assert.equal((await submit(a,`${tag}_reload`)).requestId,recovered.requestId);
  assert.equal(Number((await db.query('select count(*) n from public.customer_entries where customer_id=$1',[id])).rows[0].n),2);
  console.log('PASS two new tabs create one next request; stale retries after Undo do not spend again');
  console.log(JSON.stringify({localOnly:true,passed:3,retainedFixture:slug}));
 } finally {await db.query('update demo_private.funding_config set enabled=$1,preview_entries_enabled=$2,preview_provisioning_enabled=$3,entry_undo_required=$4,entry_recovery_required=$5,preview_issuer=$6 where singleton',[cfg.enabled,cfg.preview_entries_enabled,cfg.preview_provisioning_enabled,cfg.entry_undo_required,cfg.entry_recovery_required,cfg.preview_issuer]);}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>Promise.all(connections.map(c=>c.end())));
