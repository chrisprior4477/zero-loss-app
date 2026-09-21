// Loopback database only. Test-owned local audit records are retained.
const { Client } = require('../.tmp-wallet-audit-runtime/node_modules/pg');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const clients = [];
const issuer = 'https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1';
const id = randomUUID(), key = `auth_race_${randomUUID()}`, authSession = randomUUID();
async function connect() {
  const db = new Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:54322/postgres'});
  await db.connect(); clients.push(db); return db;
}
async function actor() {
  const db = await connect();
  await db.query('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
    [id, JSON.stringify({sub:id,iss:issuer,session_id:authSession,amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}]})]);
  return db;
}
async function main() {
  const db=await connect();
  const cfg=(await db.query('select * from demo_private.funding_config where singleton')).rows[0];
  assert.equal(cfg.environment,'development-test');
  await db.query('update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true,funding_reauth_required=true,preview_issuer=$1 where singleton',[issuer]);
  try {
    await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),
      '{"legal_first_name":"Funding audit","legal_last_name":"Local only","date_of_birth":"1990-01-01"}')`,[id,`${id}@example.test`]);
    await db.query("update public.customers set status='active',verification_status='email_verified' where id=$1",[id]);
    await db.query('select demo_private.ensure_preview_customer_for($1)',[id]);
    const a=await actor(),b=await actor();
    const approvals=await Promise.all([a,b].map(c=>c.query("select public.authorize_demo_funding(100,$1,false,'funding-confirmation-v1') as id",[key])));
    assert.equal(approvals[0].rows[0].id,approvals[1].rows[0].id);
    console.log('PASS concurrent authorization retries reuse one approval');
    const sessions=await Promise.all([a,b].map(c=>c.query("select * from public.create_demo_card_funding_session(100,$1,'demo_card_4242',false)",[key])));
    assert.equal(sessions[0].rows[0].id,sessions[1].rows[0].id);
    const sid=sessions[0].rows[0].id;
    console.log('PASS concurrent payment creation consumes approval once');
    const receipt=(await a.query('select public.simulate_demo_payment($1) as r',[sid])).rows[0].r;
    await Promise.all([a,b].map(c=>c.query('select public.accept_demo_payment_event($1,$2)',[receipt.body,receipt.signature])));
    assert.equal((await db.query('select count(*)::int as n from public.ledger_entries where demo_funding_session_id=$1',[sid])).rows[0].n,1);
    assert.equal((await a.query('select public.get_wallet_snapshot() as r')).rows[0].r.balanceCents,'100');
    console.log('PASS concurrent provider delivery credits exactly $1 once');
    const attempts=await Promise.all(Array.from({length:6},async()=>{
      const c=await actor();
      try { await c.query('select public.begin_demo_funding_authentication(100,$1)',[key]); return 'ok'; }
      catch(e) { return e.code; }
    }));
    assert.equal(attempts.filter(r=>r==='ok').length,5);
    assert.equal(attempts.filter(r=>r==='P0001').length,1);
    console.log('PASS concurrent password attempts cannot exceed the account limit');
    console.log(JSON.stringify({localOnly:true,passed:4,testCustomer:id}));
  } finally {
    await db.query('update demo_private.funding_config set enabled=$1,preview_provisioning_enabled=$2,funding_reauth_required=$3,preview_issuer=$4 where singleton',
      [cfg.enabled,cfg.preview_provisioning_enabled,cfg.funding_reauth_required,cfg.preview_issuer]);
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>Promise.all(clients.map(c=>c.end())));
