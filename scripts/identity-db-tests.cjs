// Local-only, rollback-scoped identity verification integration tests.
const { Client } = require('../.tmp-wallet-audit-runtime/node_modules/pg');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const db = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
(async () => {
  await db.connect();
  if (process.argv.includes('--apply')) {
    await db.query(readFileSync(resolve(__dirname, '../supabase/migrations/20260921183000_demo_identity_verification.sql'), 'utf8'));
    console.log('Applied demo identity migration to localhost only.');
  }
  const result = await db.query(readFileSync(resolve(__dirname, '../supabase/tests/demo_identity_verification_test.sql'), 'utf8'));
  const lines = result.flatMap(r => r.rows).flatMap(r => Object.values(r)).filter(v => typeof v === 'string');
  const passed = lines.filter(v => /^ok \d+/.test(v)).length;
  const failures = lines.filter(v => /^not ok \d+/.test(v));
  console.log(JSON.stringify({ localOnly: true, passed, failures }));
  if (!passed || failures.length) process.exitCode = 1;
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.end());
