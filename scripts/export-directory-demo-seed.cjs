// Mechanical SQL export from the same catalog used by the application.
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};
const { directoryDemoScenarios } = require('../src/lib/catalog/demo-products.ts');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const rows = directoryDemoScenarios.map(({product: p, closingOutcome}) =>
  `  (${[p.slug,p.title,p.retailer,p.category,p.gallery[0].src].map(quote).join(', ')}, ${p.sold}, ${quote(closingOutcome)})`).join(',\n');
const sql = `-- Additive investor-demo catalog. No existing offerings, customer entries,
-- balances, outcomes, or ledger records are changed. Artwork provenance lives
-- in src/lib/catalog/partner-card-art.json. Not a production prize inventory.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $$ begin
  if not coalesce((select preview_entries_enabled and environment = 'development-test'
      from demo_private.funding_config where singleton), false) then
    raise exception 'Directory gift cards are available only in the demo environment' using errcode = '42501';
  end if;
end $$;

-- Reuse the existing close-time scenario resolver: winner is awarded only
-- when the pool fills; otherwise the existing purchase-option flow runs.
with requested(slug,title,retailer,category,image_path,sample_entries,closing_outcome) as (values
${rows}
), inserted as (
  insert into demo_private.preview_entry_offerings
    (slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,
     sample_entries,repeatable_scenario,forced_outcome,active)
  select slug,title,retailer,category,image_path,10000,100,300,sample_entries,false,'active',true
  from requested
  on conflict (slug) do nothing
  returning slug
)
insert into demo_private.preview_popular_reward_scenarios(offering_slug,brand_slug,closing_outcome)
select r.slug, r.slug, r.closing_outcome from requested r join inserted i on i.slug = r.slug
on conflict (offering_slug) do nothing;
commit;
`;
const output = process.argv[2];
if (!output || !/^supabase[\\/]migrations[\\/]\d+_add_directory_demo_gift_cards\.sql$/.test(output)) {
  throw new Error('Pass the path created by supabase migration new');
}
fs.writeFileSync(output, sql);
console.log(JSON.stringify({cards:directoryDemoScenarios.length,
  buckets:Object.fromEntries(['one-left','two-left','eight-left','mid-fill'].map(bucket=>[bucket,
    directoryDemoScenarios.filter(s=>s.bucket===bucket).reduce((r,s)=>(r[s.closingOutcome]++,r),{winner:0,purchase_option:0})]))},null,2));
