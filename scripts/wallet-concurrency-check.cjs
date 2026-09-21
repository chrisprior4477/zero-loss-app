/* Local-only adversarial tests. Install the isolated test client with:
 * npm install --prefix .tmp-wallet-audit-runtime --no-save --package-lock=false --ignore-scripts pg@8.16.3
 * Test-owned records are retained in the LOCAL database as audit evidence; no
 * existing customers, balances, entries, or sample content are reset or deleted.
 */
const { Client } = require('../.tmp-wallet-audit-runtime/node_modules/pg');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const issuer = 'https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1';
const tag = randomUUID().replaceAll('-', '');
const slug = `wallet-audit-${tag}`;
const triggerName = `wallet_audit_delay_${tag}`;
const clients = [];
async function connect() { const c = new Client({ connectionString }); await c.connect(); clients.push(c); return c; }
async function auth(c, id) {
  await c.query('set role authenticated');
  await c.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
    [id, JSON.stringify({sub:id,iss:issuer})]);
}
async function account(db, amount = 1000) {
  const id=randomUUID();
  await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
    values($1,$2,now(),' {"legal_first_name":"Wallet audit","legal_last_name":"Local only","date_of_birth":"1990-01-01"}')`,[id,`${id}@example.test`]);
  await db.query("update public.customers set status='active',verification_status='email_verified' where id=$1",[id]);
  await db.query('select demo_private.ensure_preview_customer_for($1)',[id]);
  await db.query(`insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
    select $2,customer_id,'DEPOSIT','PLAYABLE',$3,'USD',$4,id,'demo' from public.wallet_accounts where customer_id=$1 and closed_at is null`,
    [id,`len_${randomUUID().replaceAll('-','')}`,amount,`local_wallet_audit_${tag}_${id}`]);
  return id;
}
async function attempt(c, offering, key, quantity=1) {
  try { return {ok:true,data:(await c.query('select public.create_preview_entries($1,$2,$3) as result',[offering,quantity,key])).rows[0].result}; }
  catch(e) { return {ok:false,code:e.code,message:e.message}; }
}
async function pair(a,b,operation) {
  const c1=await connect(), c2=await connect(); await auth(c1,a); await auth(c2,b);
  return Promise.all([operation(c1,0),operation(c2,1)]);
}
async function main() {
  const db=await connect();
  const cfg=(await db.query('select environment,enabled,preview_provisioning_enabled,preview_entries_enabled,preview_issuer from demo_private.funding_config where singleton')).rows[0];
  assert.equal(cfg.environment,'development-test');
  // Changes only this loopback database; never run against a hosted URL.
  await db.query('update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true,preview_entries_enabled=true,preview_issuer=$1 where singleton',[issuer]);
  let failures=0;
  async function check(name,run) { try { await run(); console.log(`PASS ${name}`); } catch(e) { failures++; console.log(`FAIL ${name}: ${e.message}`); } }
  try {
    await db.query(`insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,sample_entries,forced_outcome)
      values($1,'Isolated wallet audit','Test only','Test','/test.png',2500,100,10,9,'active'),
      ($2,'Isolated wallet audit unlimited','Test only','Test','/test.png',2500,100,100,0,'active')`,[slug,`${slug}-open`]);
    // Widen the vulnerable interval after capacity validation but before commit.
    // An exclusive offering lock must still make the second buyer wait.
    await db.query(`create function public.${triggerName}() returns trigger language plpgsql set search_path='' as $$
      begin perform pg_catalog.pg_sleep(2); return new; end $$;
      create trigger ${triggerName} before insert on public.customer_entries
      for each row when (new.offering_slug='${slug}') execute function public.${triggerName}();`);
    await check('two customers cannot both buy the last ticket',async()=>{
      const a=await account(db), b=await account(db);
      const result=await pair(a,b,(c,i)=>attempt(c,slug,`${tag}_capacity_${i}`));
      const rows=await db.query('select count(*)::int as entries from public.customer_entries where offering_slug=$1',[slug]);
      console.log(JSON.stringify({test:'last-ticket',results:result.map(r=>({ok:r.ok,code:r.code})),entries:rows.rows[0].entries,sampleEntries:9,capacity:10}));
      assert.equal(result.filter(r=>r.ok).length,1,'exactly one buyer must succeed');
      assert.equal(rows.rows[0].entries,1,'capacity cannot be exceeded');
    });
    await check('simultaneous requests cannot spend the same dollar twice',async()=>{
      const a=await account(db,100);
      const r=await pair(a,a,(c,i)=>attempt(c,`${slug}-open`,`${tag}_spend_${i}`));
      assert.equal(r.filter(x=>x.ok).length,1);
      assert.equal(r.filter(x=>!x.ok&&x.code==='P0001').length,1);
      assert.equal(Number((await db.query("select sum(amount) as cents from public.ledger_entries where customer_id=$1 and balance_type='PLAYABLE'",[a])).rows[0].cents),0);
    });
    await check('concurrent same-key retries create one batch and one debit',async()=>{
      const a=await account(db);
      const r=await pair(a,a,c=>attempt(c,`${slug}-open`,`${tag}_duplicate`));
      assert.equal(r.filter(x=>x.ok).length,2);
      assert.equal(r.filter(x=>x.data.duplicate).length,1);
      assert.equal(r[0].data.batchId,r[1].data.batchId);
      assert.equal(Number((await db.query('select count(*) as n from public.customer_entries where customer_id=$1',[a])).rows[0].n),1);
    });
    await check('same key with changed quantity is rejected',async()=>{
      const a=await account(db);
      const r=await pair(a,a,(c,i)=>attempt(c,`${slug}-open`,`${tag}_changed`,i+1));
      assert.equal(r.filter(x=>x.ok).length,1);
      assert.equal(r.filter(x=>!x.ok&&x.code==='22023').length,1);
    });
    await check('duplicate provider delivery credits the wallet exactly once',async()=>{
      const a=await account(db);
      const c=await connect(); await auth(c,a);
      const session=(await c.query('select * from public.create_demo_funding_session(100,$1)',[`${tag}_funding`])).rows[0];
      const receipt=(await c.query('select public.simulate_demo_payment($1) as r',[session.id])).rows[0].r;
      const results=await pair(a,a,async client=>(await client.query('select public.accept_demo_payment_event($1,$2) as r',[receipt.body,receipt.signature])).rows[0].r);
      assert.ok(results.every(r=>r.status==='succeeded'));
      assert.equal(Number((await db.query('select count(*) as n from public.ledger_entries where demo_funding_session_id=$1',[session.id])).rows[0].n),1);
    });
  } finally {
    await db.query(`drop trigger if exists ${triggerName} on public.customer_entries; drop function if exists public.${triggerName}();`);
    await db.query('update demo_private.funding_config set enabled=$1,preview_entries_enabled=$2,preview_issuer=$3,preview_provisioning_enabled=$4 where singleton',
      [cfg.enabled,cfg.preview_entries_enabled,cfg.preview_issuer,cfg.preview_provisioning_enabled]);
  }
  console.log(JSON.stringify({localOnly:true,fixturePrefix:slug,failures}));
  if(failures) process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>Promise.all(clients.map(c=>c.end())));
