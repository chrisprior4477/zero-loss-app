// Local-only SQL regression runner. Uses the temporary pg test client described
// in wallet-concurrency-check.cjs. Every pgTAP test rolls its fixtures back.
const { Client } = require('../.tmp-wallet-audit-runtime/node_modules/pg');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const tests = ['wallet_account_isolation_test.sql','verified_demo_funding_test.sql',
  'save_demo_payment_method_test.sql','preview_entry_lifecycle_test.sql','extra_entry_explainer_preference_test.sql',
  'preview_availability_test.sql','account_lifecycle_test.sql','demo_credit_card_test.sql','funding_authorization_test.sql','entry_request_undo_test.sql','entry_recovery_test.sql','support_cases_test.sql','reward_access_test.sql'];
const migration='20260921160000_serialize_preview_entry_capacity.sql';
const db=new Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:54322/postgres'});
(async()=>{
  await db.connect();
  if(process.argv.includes('--apply-reward-access')) {
    await db.query(readFileSync(resolve(__dirname,'../supabase/migrations/20260921233000_reward_access_and_order_links.sql'),'utf8'));
    console.log('Applied reward access and exact order links to localhost only.');
  }
  if(process.argv.includes('--apply-support')) {
    await db.query(readFileSync(resolve(__dirname,'../supabase/migrations/20260921230000_support_cases.sql'),'utf8'));
    console.log('Applied support cases to localhost only; no staff access granted.');
  }
  if(process.argv.includes('--apply-entry-recovery')) {
    await db.query(readFileSync(resolve(__dirname,'../supabase/migrations/20260921220000_entry_recovery.sql'),'utf8'));
    console.log('Applied entry recovery schema to localhost only (legacy switch remains off).');
  }
  if(process.argv.includes('--apply-entry-undo')) {
    const crew = await db.query("select to_regclass('public.crew_entry_shares') as shares");
    if(!crew.rows[0].shares) {
      for(const name of ['20260919170000_crew_connections_and_shared_picks.sql','20260919173000_crew_entry_retry_privacy.sql']) {
        await db.query(readFileSync(resolve(__dirname,'../supabase/migrations',name),'utf8'));
      }
    }
    await db.query(readFileSync(resolve(__dirname,'../supabase/migrations/20260921210000_entry_request_undo.sql'),'utf8'));
    console.log('Applied entry Undo checkpoint to localhost only (switch remains off).');
  }
  if(process.argv.includes('--apply-funding-hardening')) {
    for(const name of ['20260921181000_funding_authorization_history.sql','20260921200000_funding_authentication_attempts.sql']) {
      await db.query(readFileSync(resolve(__dirname,'../supabase/migrations',name),'utf8'));
    }
    console.log('Applied funding hardening to localhost only.');
  }
  if(process.argv.includes('--apply-funding-authorization')) {
    await db.query(readFileSync(resolve(__dirname,'../supabase/migrations/20260921180000_funding_authorization.sql'),'utf8'));
    console.log('Applied funding authorization to localhost only.');
  }
  if(process.argv.includes('--apply-capacity-fix')) {
    await db.query(readFileSync(resolve(__dirname,'../supabase/migrations',migration),'utf8'));
    console.log('Applied capacity repair to localhost only.');
  }
  if(process.argv.includes('--apply-receipt-fix')) {
    await db.query(readFileSync(resolve(__dirname,'../supabase/migrations/20260921161500_preview_entry_receipt_destinations.sql'),'utf8'));
    console.log('Applied receipt link repair to localhost only.');
  }
  if(process.argv.includes('--apply-availability')) {
    await db.query(readFileSync(resolve(__dirname,'../supabase/migrations/20260921163000_preview_offering_availability.sql'),'utf8'));
    console.log('Applied availability migration to localhost only.');
  }
  let assertions=0,failures=0;
  for(const name of tests) {
    try {
      const result=await db.query(readFileSync(resolve(__dirname,'../supabase/tests',name),'utf8'));
      const text=(Array.isArray(result)?result:[result]).flatMap(r=>r.rows).flatMap(r=>Object.values(r)).filter(v=>typeof v==='string');
      const passed=text.filter(v=>/^ok \d+/.test(v)).length;
      const failed=text.filter(v=>/^not ok \d+/.test(v));
      if(!passed) throw new Error('No pgTAP assertions returned');
      assertions+=passed; failures+=failed.length;
      console.log(JSON.stringify({test:name,passed,failures:failed}));
    } catch(e) { failures++; await db.query('rollback'); console.log(JSON.stringify({test:name,error:e.message,context:e.where})); }
  }
  console.log(JSON.stringify({localOnly:true,passedAssertions:assertions,failures}));
  if(failures)process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.end());
