// Loopback-only adversarial tests. New test-owned records remain as evidence;
// no existing accounts, balances or demo fixtures are reset/deleted.
const { Client } = require('../.tmp-wallet-audit-runtime/node_modules/pg');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const clients=[];
const issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1';
const tag=randomUUID().replaceAll('-','');
const base=`undo-race-${tag}`;
async function connect(id) {
  const c=new Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:54322/postgres'});
  await c.connect(); clients.push(c);
  if(id) {await c.query('set role authenticated'); await c.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id,JSON.stringify({sub:id,iss:issuer})]);}
  return c;
}
async function main(){
 const db=await connect();
 const cfg=(await db.query('select enabled,preview_provisioning_enabled,preview_entries_enabled,preview_issuer,entry_undo_required from demo_private.funding_config where singleton')).rows[0];
 await db.query('update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true,preview_entries_enabled=true,entry_undo_required=true,preview_issuer=$1 where singleton',[issuer]);
 let passed=0;
 async function account(amount=1000){
  const id=randomUUID();
  await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),'{"legal_first_name":"Undo audit","legal_last_name":"Local only","date_of_birth":"1990-01-01"}')`,[id,`${id}@example.test`]);
  await db.query("update public.customers set status='active',verification_status='email_verified' where id=$1",[id]);
  await db.query('select demo_private.ensure_preview_customer_for($1)',[id]);
  await db.query(`insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
    select $2,customer_id,'DEPOSIT','PLAYABLE',$3,'USD',$4,id,'demo' from public.wallet_accounts where customer_id=$1 and scope='demo' and closed_at is null`,[id,`len_${randomUUID().replaceAll('-','')}`,amount,`undo_race_${tag}`]);
  return id;
 }
 async function submit(c,slug,key,qty=1){return (await c.query('select public.create_preview_entries($1,$2,$3) as r',[slug,qty,key])).rows[0].r;}
 async function resolve(c,id,undo){return (await c.query('select public.resolve_preview_entry_request($1,$2) as r',[id,undo])).rows[0].r;}
 async function balance(id){return Number((await db.query("select sum(amount) as n from public.ledger_entries where customer_id=$1 and balance_type='PLAYABLE'",[id])).rows[0].n);}
 function pass(label){passed++;console.log(`PASS ${label}`);}
 try {
  await db.query(`insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,sample_entries)
    select x,'Undo race','Test','Test','/test.png',2500,100,100,case when x=$2 then 99 else 0 end from unnest($1::text[]) x`,[[base,`${base}-last`,`${base}-other`],`${base}-last`]);
  const a=await account(),b=await account(),ca=await connect(a),cb=await connect(b),ca2=await connect(a);
  const same=await Promise.all([submit(ca,base,`${tag}_same`,2),submit(ca2,base,`${tag}_same`,2)]);
  assert.equal(same[0].requestId,same[1].requestId);assert.equal(await balance(a),800);pass('simultaneous retry reserves once');
  const undone=await Promise.all([resolve(ca,same[0].requestId,true),resolve(ca2,same[0].requestId,true)]);
  assert.ok(undone.every(r=>r.status==='cancelled'));assert.equal(await balance(a),1000);pass('simultaneous Undo releases once');
  const last=await Promise.allSettled([submit(ca,`${base}-last`,`${tag}_last_a`),submit(cb,`${base}-last`,`${tag}_last_b`)]);
  assert.equal(last.filter(r=>r.status==='fulfilled').length,1);pass('different customers cannot reserve the same last slot');
  const poor=await account(100),p1=await connect(poor),p2=await connect(poor);
  const spend=await Promise.allSettled([submit(p1,base,`${tag}_poor_a`),submit(p2,`${base}-other`,`${tag}_poor_b`)]);
  assert.equal(spend.filter(r=>r.status==='fulfilled').length,1);assert.equal(await balance(poor),0);pass('different prizes cannot reserve the same dollar');
  const fresh=await account(),f1=await connect(fresh),f2=await connect(fresh);
  const pending=await submit(f1,base,`${tag}_expire`,3);
  // A real deadline, not a shortened production timeout or edited fixture.
  console.log('Waiting for the actual 30-second server window; testing browser-independent completion next.');
  await new Promise(r=>setTimeout(r,31000));
  const finals=await Promise.all([resolve(f1,pending.requestId,true),resolve(f2,pending.requestId,false)]);
  assert.ok(finals.every(r=>r.status==='accepted'));assert.equal(finals[0].receipt.batchId,finals[1].receipt.batchId);
  assert.equal(await balance(fresh),700);
  assert.equal(Number((await db.query('select count(*) as n from public.customer_entries where entry_request_id=$1',[pending.requestId])).rows[0].n),3);
  pass('late Undo racing confirmation creates exactly three entries and one net charge');
  await db.query('select demo_private.finalize_due_entry_requests()');
  const after=(await db.query('select count(*)::int as n from public.entry_requests where offering_slug=any($1::text[]) and status=$2',[[base,`${base}-last`,`${base}-other`],'validating'])).rows[0].n;
  assert.equal(after,0);pass('server worker finishes abandoned requests without browser authentication');
 } finally {
  await db.query('update demo_private.funding_config set enabled=$1,preview_provisioning_enabled=$2,preview_entries_enabled=$3,preview_issuer=$4,entry_undo_required=$5 where singleton',[cfg.enabled,cfg.preview_provisioning_enabled,cfg.preview_entries_enabled,cfg.preview_issuer,cfg.entry_undo_required]);
 }
 console.log(JSON.stringify({localOnly:true,passed,retainedFixturePrefix:base}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>Promise.all(clients.map(c=>c.end())));
