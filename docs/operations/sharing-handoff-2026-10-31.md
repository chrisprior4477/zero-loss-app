# Zero Loss sharing handoff

Updated October 31, 2026. This is the working context for another chat, not a request to redesign or publish anything without the owner's direction.

## Goal and working style

Make sharing fast and understandable on a real phone: find or add people, edit their contact details, choose Crew/groups, share, and return to the same product or entry details. The owner reviews small changes on the deployed regular site. Preserve the existing wallet, purchase options, products, sample data, and How It Works experiences.

Use compact, readable buttons and ticket popups with a circle close button. Tickets have inward circular cutouts at all four corners and both side centers. Keep short screens centered in the visible viewport; long screens may use the viewport with bounded scrolling. The owner has confirmed the current positioning works on the actual phone. Do not start another positioning redesign.

The local phone preview experiment was abandoned because connections and interactions were unreliable. Do not restart it unless asked. Continue using the regular Vercel deployment.

## Repository, release, and checkpoint

- Repository: https://github.com/chrisprior4477/zero-loss-app
- Workspace: `C:/Users/Win11Blue/.codex/worktrees/wallet-approved-journeys/zero-loss-app`
- Working branch: `codex/crew-sharing-live`
- Owner's regular deployment branch: `openai-homepage-experiment` (this is not named `main`). Publish authorized changes here, not only to an experimental branch.
- Regular site: https://zero-loss-app-git-openai-homepage-experiment-zero-loss.vercel.app
- Example product: https://zero-loss-app-git-openai-homepage-experiment-zero-loss.vercel.app/items/playstation-5-slim
- Vercel team/project: `zero-loss` / `zero-loss-app`. The regular branch uses a preview deployment alias. Do not use `--prod` merely because the owner calls this the regular site.
- Baseline before this handoff's finder refinements: `53eae5cacefeadbab59cb905028f8b4411ee7d4d`.
- Hard checkpoint already saved and pushed: `checkpoint/before-we-changed-sharing-2026-10-30`, at `f5ceb9d3b0e36530fca669d3f12fb20e07e5f0ca`.
- The checkpoint restores code. Subsequent database changes are additive and require separate review if a rollback is requested. Never reset customer/demo activity as cleanup.

Read `AGENTS.md` and the standing `.cursor/rules/mvp-demo-testing.mdc`, `demo-purchase-policy.mdc`, and `ticket-geometry.mdc` before editing. Read the installed Next.js guides before code changes; this app uses newer Next.js conventions.

## Four connected journeys currently implemented

1. **Share externally:** Share this find → native Share, Copy link, Text, or Email. Native sharing opens the phone's own share sheet. Text opens a prepared message in the user's texting app. The user reviews and sends there. Gmail and Outlook buttons open email drafts; they are not contact import connections. Receiving apps control link-preview presentation, so pasted links and native-share messages can look different.
2. **Share with Crew:** Share with Crew → product summary, Crew count, sample portraits, Add People to your crew, orange Send to my Crew, See & Edit your Crew, and Choose a group. Success displays that the share is saved, then returns to the original product/entry screen.
3. **Share with groups:** Share with group(s) → choose one or several groups → Send to the named group or selected group count. Round controls support multiple selection. Clicking the group name selects it; separate Add and Edit buttons open management. Empty groups cannot send alone. People present in multiple selected groups are deduplicated.
4. **Find/add/manage people:** Name suggestions appear after three characters. Complete phone/email lookups stay private. Adding a newly connected person opens a contact editor for an owner-specific name, phone, and email. Save/Cancel returns to the finder. Existing people can be edited from the roster, group editor, and now the finder. Done returns to the sharing step, preserving the current group context.

The Crew roster has a direct send action, per-person Edit/Delete, Add people, and Back to sharing. Deleting a contact requires explicit confirmation and removes the Crew relationship. Group deletion requires confirmation and leaves Crew people intact. The group editor preserves existing saved contacts while changing connected membership.

The phone Contact Picker already exists where supported. The user chooses a contact, then explicitly adds it to Crew, saves it to a group, or sends in their own app. Choosing a contact alone does not create a connection or send a message.

## Latest requested refinements

- Crew overview button now reads **Add People to your crew**, with a thinner height.
- Group finder lists connected people outside the target group first, including people in other groups; people already in the target group follow.
- Name search results also put unadded people first while keeping stable order within each section.
- Connected people have **Edit** at the end of their finder row, alongside Add/Added. Unconnected public search results must be added before private contact editing is available.
- Rows distinguish **In your Crew**, **In this group**, and discoverable members. Owner-specific saved names take precedence over public profile names.
- Editing and saving returns to the same finder/group. It does not silently add to a group or send anything.
- The list starts at the top when entering the finder or changing the query, avoiding a previous scroll position hiding available people.
- Opening a fresh finder starts with your saved Crew rather than stale results from a previous search. Results still remain available when returning from an add/edit action.

## Contact ownership and persistence

Durable Crew, groups, contacts, entry audiences, and delivery state use the existing Supabase architecture, not browser-only storage. The Supabase project is `ocgdfnvvjvutevgqzzgj` (`development-test`). No new database migration is needed for the latest finder refinements.

- Canonical relationships: `crew_invitations`.
- Owner's groups and private contact labels: `crew_visibility_settings`; `member_contacts` is keyed by connected member ID.
- Entry share records: `crew_entry_shares`, with canonical `entry_requests` and `customer_entries` relationships.
- Editing a contact changes the owner's saved details, not that person's account profile, verified email, or login identity.
- External contacts saved in a group are not automatically connected accounts and do not gain private entry access. Keep this distinction when adding import features.
- Saved/queued share feedback is not proof an email was delivered. Do not claim delivery without delivery evidence.
- Confirmed-entry sharing applies all selected group IDs atomically. Product/win recipients are deduplicated and use existing canonical server actions in batches.
- Preserve authentication, ownership checks, opt-outs, consent, idempotency, and retry safety. No financial writers are changed by these sharing refinements.

Applied migrations:

- `supabase/migrations/20261031135618_crew_member_contact_details.sql`
- `supabase/migrations/20261031144345_crew_multi_group_sharing.sql`

Their SQL regression tests are `supabase/tests/crew_member_contact_details_test.sql` and `supabase/tests/crew_multi_group_sharing_test.sql`. They use rollback-only fixtures.

## Safe test customers

Existing fixtures can be found by name, exact phone, or exact email. These are demo accounts, not real Gmail mailboxes:

- Test Customer 1: `1111111111`, `testcustomer1@example.test`
- Test Customer 2: `2222222222`, `testcustomer2@example.test`
- Test Customer 3: `3333333333`, `testcustomer3@example.test`
- Test Customer 4: `4444444444`, `testcustomer4@example.test`
- Test Customer 5: `5555555555`, `testcustomer5@example.test`

Seed implementation: `scripts/seed-crew-test-customers.mjs`. Existing account metadata marks these fixtures. Preserve them and existing user groups; do not reseed/reset casually. Portraits are illustrative sample photos, not actual profile images.

## Google/Outlook contact import proposal — assessed, not implemented

The owner pasted another assistant's contact-import proposal. It is reference material, not authorization to connect accounts, request permissions, import address books, or send invitations now. The site supports both public content sharing and private Crew/group activity; those need different access rules.

Google Contacts can supply names and email addresses through the [People API](https://developers.google.com/people/v1/contacts). This requires provider setup and user authorization; it does not require the user's Gmail password. Use the narrow read-only contact scope for a future selection screen. Contacts and arbitrary correspondents in the inbox are different sources.

Microsoft supports a signed-in user's contacts through [Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/user-list-contacts?view=graph-rest-1.0). Its least-privileged delegated permission for this operation is `Contacts.Read`, for personal Microsoft and work/school accounts. No contact-write or mail-send permission is needed to choose imported contacts.

A future flow could be: Add people → Google Contacts / Outlook Contacts / phone contacts → provider permission → searchable contact list with checkboxes → review selected people → add selected contacts to a specified group. Fetching an address book for selection and permanently storing it are different actions; save only the people explicitly chosen. Keep manual entry and Copy link available. Do not automatically message imported contacts or grant them private account access.

Google public-launch requirements depend on the actual OAuth scopes and app configuration; check [sensitive-scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification) before promising an immediate launch. Provider app registration, callback URLs, consent wording, token handling, disconnect behavior, and selected-contact persistence still need implementation decisions.

The [native web Contact Picker](https://developer.chrome.com/docs/capabilities/web-apis/contact-picker) is a lighter option where available, with an explicit user-selected subset. Browser support varies; do not promise the same picker on every Apple/Android browser. The current code requests one contact per picker interaction. Multiple selection would be a separate approved refinement.

## Important files

- `src/components/product/PostEntryCrewToast.tsx`: real popup flows, autocomplete, group selection, add/edit contact, native handoffs.
- `src/components/product/post-entry-crew-toast.module.css`: compact controls, ticket geometry, viewport sizing, bounded lists.
- `src/components/product/PostEntryCrewToast.test.tsx`: interaction and regression coverage.
- `src/lib/crew/actions.ts`: authenticated server actions and canonical persistence calls.
- `src/lib/crew/member-contact.ts`: saved contact validation/types.
- `src/lib/crew/visibility.ts`: group/contact shape and visibility logic.
- `src/lib/crew/share-options.test.ts`: share-options contact merging coverage.
- `src/lib/sharing/product-share.ts`: encoded native, SMS, email, and public product URLs.

## Checks and review recipe

Latest local sharing suite: **50 tests passed** across the popup and share-options files; targeted ESLint, whitespace checks, and `npm run build` passed. Verify the exact released commit before reporting publication. Live phone-layout checks supplement tests; browser resizing is not a substitute for actual device contact permissions or the phone's messaging app.

The finder changes were checked on the regular live site at 375×667, 320×667, and 1280×900. Available-first ordering, autocomplete, per-person editing, and return to the selected Football group worked. Test Customer 1's fixture phone/email were saved through the editor and remained present after a fresh page load. No shares, new connections, group membership changes, deposits, ticket purchases, deletions, or resets were performed for those checks.

1. On the regular PlayStation product, open Share → Share with Crew. Check the thinner Add People to your crew button and existing actions.
2. Choose a group → Add. People outside that group should be at the top; already-added people remain below. The name search should retain results and use the same ordering.
3. Edit a connected person's details. Save or cancel should return to this finder, with the same group context. Save persists owner-specific details; no invitation or share should occur merely from editing.
4. Done returns to sharing. Selected groups remain selected and the send button reflects valid connected recipients. Check multi-group selection without sending to real contacts just for testing.
5. Review at 375×667 and a normal desktop width: no horizontal clipping, usable Edit/Add buttons, all ticket edges intact, lower actions reachable. The list itself can scroll.
6. Only perform actual test shares to known safe fixtures when authorized. Confirm queued records and retry behavior separately from message delivery. Do not send real messages simply to verify layout.

Release small batches, stage explicit files, preserve unrelated working files, push both the working branch and authorized regular branch without force, wait for Vercel Ready, and visually inspect the regular alias.
