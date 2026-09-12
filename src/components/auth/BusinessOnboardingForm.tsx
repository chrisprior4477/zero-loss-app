"use client";

import { type FormEvent, useState } from "react";

const inputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#00132e]/75 px-4 text-base text-white outline-none transition placeholder:text-white/25 hover:border-white/25 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10";

const choiceClassName =
  "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-white/12 bg-white/[.04] px-4 py-3 text-sm font-bold text-white/75 transition hover:border-cyan-300/45 has-[:checked]:border-cyan-300 has-[:checked]:bg-cyan-300/10 has-[:checked]:text-cyan-200";

const platforms = ["Instagram", "TikTok", "Facebook", "YouTube", "X", "Zero Loss"];

function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-300 font-black text-[#00132e]">{number}</span>
      <div>
        <h3 className="text-lg font-black text-white">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-white/50">{description}</p>
      </div>
    </div>
  );
}

export function BusinessOnboardingForm() {
  const [submitted, setSubmitted] = useState(false);
  const [schedule, setSchedule] = useState("one-time");
  const [marketing, setMarketing] = useState("list-only");
  const [assetPlan, setAssetPlan] = useState("provide");

  function submitPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div role="status" className="rounded-2xl border border-[#31e800]/35 bg-[#31e800]/10 p-7 text-center">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#72ff4e]">Setup preview complete</p>
        <h3 className="mt-3 text-2xl font-black">Your campaign is ready for review.</h3>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/65">In production, routine offers can move through automated identity, content, inventory, and policy checks. Only exceptions or enterprise campaigns need a conversation.</p>
        <button type="button" onClick={() => setSubmitted(false)} className="mt-5 rounded-full border border-cyan-300/40 px-5 py-2.5 text-sm font-bold text-cyan-200 hover:bg-cyan-300 hover:text-[#00132e]">Edit campaign setup</button>
        <p className="mt-5 text-xs text-white/40">Interactive preview only — no company information was submitted.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submitPreview} className="space-y-8">
      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
        <SectionHeading number="1" title="Create your business account" description="Tell us who owns the offer and where the business operates." />
        <div>
          <label htmlFor="business_name" className="block text-sm font-bold text-white/85">Business name</label>
          <input id="business_name" name="business_name" required autoComplete="organization" className={inputClassName} />
        </div>
        <fieldset>
          <legend className="text-sm font-bold text-white/85">Business address</legend>
          <p className="mt-1 text-xs leading-5 text-white/40">Your browser can fill a saved address now. Search suggestions can be connected before launch.</p>
          <input aria-label="Street address" name="address_line_1" required autoComplete="address-line1" placeholder="Street address" className={inputClassName} />
          <input aria-label="Suite, unit, or floor" name="address_line_2" autoComplete="address-line2" placeholder="Suite, unit, or floor (optional)" className={inputClassName} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input aria-label="City" name="city" required autoComplete="address-level2" placeholder="City" className={inputClassName} />
            <input aria-label="State or region" name="region" required autoComplete="address-level1" placeholder="State or region" className={inputClassName} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input aria-label="Postal code" name="postal_code" required autoComplete="postal-code" placeholder="Postal code" className={inputClassName} />
            <input aria-label="Country" name="country" required autoComplete="country-name" placeholder="Country" className={inputClassName} />
          </div>
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="business_contact" className="block text-sm font-bold text-white/85">Account owner</label>
            <input id="business_contact" name="business_contact" required autoComplete="name" className={inputClassName} />
          </div>
          <div>
            <label htmlFor="business_email" className="block text-sm font-bold text-white/85">Work email</label>
            <input id="business_email" name="business_email" type="email" required autoComplete="email" className={inputClassName} />
          </div>
        </div>
        <div>
          <label htmlFor="business_website" className="block text-sm font-bold text-white/85">Company website <span className="font-normal text-white/40">(optional)</span></label>
          <input id="business_website" name="business_website" type="url" inputMode="url" placeholder="https://" autoComplete="url" className={inputClassName} />
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
        <SectionHeading number="2" title="Build the offer" description="Define what customers can get, how much is available, and when it runs." />
        <fieldset>
          <legend className="text-sm font-bold text-white/85">What are you offering?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {["Product", "Reward or gift card", "Experience or package"].map((item, index) => (
              <label className={choiceClassName} key={item}><input type="radio" name="offer_type" value={item} defaultChecked={index === 0} className="accent-cyan-300" />{item}</label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="offer_title" className="block text-sm font-bold text-white/85">Offer title</label>
          <input id="offer_title" name="offer_title" required placeholder="Example: Ultimate home office setup" className={inputClassName} />
        </div>
        <div>
          <label htmlFor="offer_description" className="block text-sm font-bold text-white/85">Product or reward description</label>
          <textarea id="offer_description" name="offer_description" required rows={4} placeholder="What is included, why people want it, and any important restrictions" className={`${inputClassName} py-3`} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label htmlFor="retail_value" className="block text-sm font-bold text-white/85">Retail value</label><input id="retail_value" name="retail_value" inputMode="decimal" placeholder="$0.00" className={inputClassName} /></div>
          <div><label htmlFor="quantity" className="block text-sm font-bold text-white/85">Quantity available</label><input id="quantity" name="quantity" type="number" min="1" placeholder="1" className={inputClassName} /></div>
        </div>
        <fieldset>
          <legend className="text-sm font-bold text-white/85">Campaign schedule</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className={choiceClassName}><input type="radio" name="schedule" value="one-time" checked={schedule === "one-time"} onChange={() => setSchedule("one-time")} className="accent-cyan-300" />One-time campaign</label>
            <label className={choiceClassName}><input type="radio" name="schedule" value="recurring" checked={schedule === "recurring"} onChange={() => setSchedule("recurring")} className="accent-cyan-300" />Recurring campaign</label>
          </div>
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label htmlFor="start_date" className="block text-sm font-bold text-white/85">Preferred start</label><input id="start_date" name="start_date" type="date" className={inputClassName} /></div>
          {schedule === "one-time" ? <div><label htmlFor="end_date" className="block text-sm font-bold text-white/85">End date</label><input id="end_date" name="end_date" type="date" className={inputClassName} /></div> : <div><label htmlFor="cadence" className="block text-sm font-bold text-white/85">Repeat</label><select id="cadence" name="cadence" defaultValue="monthly" className={inputClassName}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="seasonal">Seasonally</option><option value="custom">Custom schedule</option></select></div>}
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
        <SectionHeading number="3" title="Add creative assets" description="Bring finished artwork or ask Zero Loss to build campaign-ready creative." />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={choiceClassName}><input type="radio" name="asset_plan" value="provide" checked={assetPlan === "provide"} onChange={() => setAssetPlan("provide")} className="accent-cyan-300" />We’ll provide images and video</label>
          <label className={choiceClassName}><input type="radio" name="asset_plan" value="create" checked={assetPlan === "create"} onChange={() => setAssetPlan("create")} className="accent-cyan-300" />Create the campaign for us</label>
        </div>
        {assetPlan === "provide" ? (
          <label className="block cursor-pointer rounded-2xl border border-dashed border-cyan-300/40 bg-cyan-300/[.06] p-7 text-center transition hover:bg-cyan-300/10">
            <span className="block font-black text-cyan-200">Choose images or videos</span>
            <span className="mt-1 block text-xs text-white/45">Product shots, logos, campaign artwork, and short-form video</span>
            <input type="file" name="creative_assets" multiple accept="image/*,video/*" className="sr-only" />
          </label>
        ) : (
          <div><label htmlFor="creative_direction" className="block text-sm font-bold text-white/85">Creative direction</label><textarea id="creative_direction" name="creative_direction" rows={4} placeholder="Describe the audience, tone, must-say points, and anything we should avoid" className={`${inputClassName} py-3`} /></div>
        )}
      </section>

      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
        <SectionHeading number="4" title="Choose promotion" description="Publish the offer only, or add a managed campaign and budget." />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={choiceClassName}><input type="radio" name="marketing" value="list-only" checked={marketing === "list-only"} onChange={() => setMarketing("list-only")} className="accent-cyan-300" />List on Zero Loss</label>
          <label className={choiceClassName}><input type="radio" name="marketing" value="managed" checked={marketing === "managed"} onChange={() => setMarketing("managed")} className="accent-cyan-300" />Add Zero Loss marketing</label>
        </div>
        {marketing === "managed" && (
          <div className="space-y-5 rounded-xl border border-cyan-300/20 bg-cyan-300/[.05] p-4">
            <fieldset><legend className="text-sm font-bold text-white/85">Promotion channels</legend><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{platforms.map((platform) => <label className={choiceClassName} key={platform}><input type="checkbox" name="platforms" value={platform} className="accent-cyan-300" />{platform}</label>)}</div></fieldset>
            <div><label htmlFor="marketing_budget" className="block text-sm font-bold text-white/85">Marketing budget</label><select id="marketing_budget" name="marketing_budget" defaultValue="" className={inputClassName}><option value="" disabled>Select a working range</option><option value="under-2500">Under $2,500</option><option value="2500-10000">$2,500–$10,000</option><option value="10000-50000">$10,000–$50,000</option><option value="50000-plus">$50,000+</option><option value="planning">Help me plan it</option></select></div>
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-[#31e800]/25 bg-[#31e800]/[.07] p-5">
        <p className="font-black text-[#72ff4e]">Routine campaigns stay self-service.</p>
        <p className="mt-2 text-sm leading-6 text-white/60">Automated review checks business identity, offer details, inventory, assets, dates, and policy readiness. A Zero Loss specialist steps in only when the campaign is unusually large or needs custom terms.</p>
      </div>
      <button type="submit" className="inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-[#00b9ff] px-5 text-base font-black text-[#00132e] transition hover:bg-cyan-200">Continue to automated review</button>
      <p className="text-center text-xs leading-5 text-white/40">Interactive investor preview — this form does not submit or upload information yet.</p>
    </form>
  );
}
