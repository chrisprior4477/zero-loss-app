// Local-only, independent-session purchase tests. New test records are retained;
// no existing sample scenarios, customers or financial history are reset.
const { Client } = require('../.tmp-wallet-audit-runtime/node_modules/pg');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const issuer = 'https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1';
const tag = randomUUID().replaceAll('-', '');
const clients = [];
async function connect() { const client = new Client({ connectionString }); await client.connect(); clients.push(client); return client; }
async function auth(client, id) {
  await client.query('set role authenticated');
  await client.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)", [id, JSON.stringify({ sub: id, iss: issuer })]);
}
async function fixture(db, suffix, amount = 20000, count = 1) {
  const id = randomUUID(), slug = `purchase-audit-${tag}-${suffix}`;
  await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
    values($1,$2,now(),' {"legal_first_name":"Purchase audit","legal_last_name":"Local only","date_of_birth":"1990-01-01"}')`, [id, `${id}@example.test`]);
  await db.query("update public.customers set status='active',verification_status='email_verified' where id=$1", [id]);
  await db.query('select demo_private.ensure_preview_customer_for($1)', [id]);
  await db.query(`insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
    select $2,customer_id,'DEPOSIT','PLAYABLE',$3,'USD',$4,id,'demo' from public.wallet_accounts where customer_id=$1 and closed_at is null`,
  [id, `len_${randomUUID().replaceAll('-', '')}`, amount, `purchase_audit_${tag}_${suffix}`]);
  await db.query(`insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,sample_entries,forced_outcome)
    values($1,'Local purchase test','Test retailer','Test','/test.png',10000,100,100,0,'not_selected')`, [slug]);
  const client = await connect(); await auth(client, id);
  for (let i = 0; i < count; i++) await client.query('select public.create_preview_entry($1,$2)', [slug, `${tag}_${suffix}_${i}`]);
  const options = (await db.query('select id from public.completion_options where customer_id=$1 order by id', [id])).rows.map(row => row.id);
  return { id, client, options };
}
async function attempt(client, option, key, decline = false) {
  try { return { ok: true, data: (await client.query(`select public.${decline ? 'decline_purchase_option' : 'purchase_preview_gift_card'}($1,$2) as result`, [option, key])).rows[0].result }; }
  catch (error) { return { ok: false, code: error.code }; }
}
async function pair(user, op) { const a = await connect(), b = await connect(); await auth(a, user); await auth(b, user); return Promise.all([op(a, 0), op(b, 1)]); }
async function financials(db, user) {
  return (await db.query(`select
    (select count(*)::int from public.customer_orders where customer_id=$1) as orders,
    (select count(*)::int from public.customer_rewards where customer_id=$1 and source='purchase') as rewards,
    count(*) filter(where entry_type='PURCHASE_DEBIT')::int as debits,
    sum(amount) filter(where balance_type='PLAYABLE')::int as balance
    from public.ledger_entries where customer_id=$1`, [user])).rows[0];
}
async function main() {
  const db = await connect();
  const config = (await db.query('select environment,enabled,preview_entries_enabled,preview_provisioning_enabled,preview_issuer from demo_private.funding_config where singleton')).rows[0];
  assert.equal(config.environment, 'development-test');
  await db.query('update demo_private.funding_config set enabled=true,preview_entries_enabled=true,preview_provisioning_enabled=true,preview_issuer=$1 where singleton', [issuer]);
  try {
    const same = await fixture(db, 'same');
    const result = await pair(same.id, client => attempt(client, same.options[0], `checkout_${same.options[0].replaceAll('-', '')}`));
    assert.ok(result.every(row => row.ok));
    assert.equal(result.filter(row => row.data.duplicate).length, 1);
    assert.equal(result[0].data.orderNumber, result[1].data.orderNumber);
    assert.deepEqual(await financials(db, same.id), { orders: 1, rewards: 1, debits: 1, balance: 10000 });
    console.log('PASS concurrent same-option retries: one debit, order and gift card');

    const changed = await fixture(db, 'changed');
    const changedResult = await pair(changed.id, (client, i) => attempt(client, changed.options[0], `${tag}_changed_key_${i}`));
    assert.equal(changedResult.filter(row => row.ok).length, 1);
    assert.deepEqual(await financials(db, changed.id), { orders: 1, rewards: 1, debits: 1, balance: 10000 });
    console.log('PASS different keys cannot buy the same option twice');

    const balance = await fixture(db, 'balance', 10100, 2);
    const balanceResult = await pair(balance.id, (client, i) => attempt(client, balance.options[i], `${tag}_balance_${i}`));
    assert.equal(balanceResult.filter(row => row.ok).length, 1);
    assert.deepEqual(await financials(db, balance.id), { orders: 1, rewards: 1, debits: 1, balance: 0 });
    console.log('PASS simultaneous options cannot spend the same balance twice');

    const racing = await fixture(db, 'decline');
    const race = await pair(racing.id, (client, i) => attempt(client, racing.options[0], `${tag}_race_${i}`, i === 1));
    assert.equal(race.filter(row => row.ok).length, 1);
    const value = await financials(db, racing.id);
    assert.equal(value.debits, race[0].ok ? 1 : 0);
    console.log('PASS purchase versus decline has exactly one terminal result');

    const foreign = await attempt(balance.client, same.options[0], `${tag}_foreign`);
    assert.equal(foreign.ok, false);
    const beforeReplay = await financials(db, same.id);
    await attempt(same.client, same.options[0], `checkout_${same.options[0].replaceAll('-', '')}`);
    assert.deepEqual(await financials(db, same.id), beforeReplay);
    console.log('PASS owner isolation and lost-response replay preserve the receipt and balance');
    console.log(JSON.stringify({ localOnly: true, retainedFixturePrefix: `purchase-audit-${tag}`, checks: 5 }));
  } finally {
    await db.query('update demo_private.funding_config set enabled=$1,preview_entries_enabled=$2,preview_provisioning_enabled=$3,preview_issuer=$4 where singleton', [config.enabled, config.preview_entries_enabled, config.preview_provisioning_enabled, config.preview_issuer]);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => Promise.all(clients.map(client => client.end())));
