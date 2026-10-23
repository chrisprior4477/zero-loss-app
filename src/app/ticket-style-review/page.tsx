import activityStyles from "@/components/account/my-activity.module.css";
import walletStyles from "@/components/wallet/wallet-overview.module.css";

export default function TicketStyleReviewPage() {
  return <main className="min-h-screen bg-[#061b38] px-4 py-10 text-white sm:px-8">
    <div className="mx-auto max-w-5xl space-y-9">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">Visual review · no account action</p>
        <h1 className="mt-2 text-3xl font-black sm:text-5xl">Ticket updates</h1>
        <p className="mt-3 text-[#c7dcf7]">These samples use the same styles as the account screens. The controls here are display-only.</p>
      </header>

      <section aria-labelledby="purchase-option-heading">
        <h2 id="purchase-option-heading" className="text-xl font-bold">Purchase Options empty state</h2>
        <div className={activityStyles.empty}>
          <h2 className="text-xl font-bold">Nothing in this category yet</h2>
          <p className="mt-2 max-w-xl text-sm leading-6">Choose another filter to see the rest of your activity.</p>
          <span className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#31e800] px-5 text-sm font-black text-[#002719]">View all activity <span aria-hidden="true" className="ml-3">›</span></span>
        </div>
      </section>

      <section aria-labelledby="see-all-heading" className="space-y-3">
        <h2 id="see-all-heading" className="text-xl font-bold">Transaction and deposit buttons</h2>
        <div className={walletStyles.showAllTicket} style={{ cursor: "default" }}>See all 37 transactions in your history <span aria-hidden="true">→</span></div>
        <div className={walletStyles.showAllTicket} style={{ cursor: "default" }}>See all 6 payment deposits <span aria-hidden="true">→</span></div>
      </section>

      <section aria-labelledby="confirmation-heading">
        <h2 id="confirmation-heading" className="text-xl font-bold">Add Funds confirmation</h2>
        <div className={walletStyles.fundingForm}>
          <dialog open aria-labelledby="review-deposit-title" className={`${walletStyles.confirmationTicket} relative mx-auto w-full max-w-lg overflow-visible p-6 shadow-2xl`}>
            <p className="text-xs font-black uppercase tracking-widest">Secure deposit confirmation</p>
            <h3 id="review-deposit-title" className="mt-3 text-2xl font-extrabold">Add $100 to your balance?</h3>
            <p className="mt-2 text-sm">Test card •••• 4242 · USD · Simulation only</p>
            <p className="mt-4 text-sm leading-6">Deposits stay in your Zero Loss balance and cannot normally be withdrawn. Exceptional refund requests are reviewed separately. This does not limit your rights for unauthorized charges or payment errors.</p>
            <label className="mt-4 block text-sm font-bold">Account password<input type="password" disabled aria-label="Account password preview" className="mt-2 min-h-12 w-full rounded-xl border px-3" /></label>
            <label className="mt-4 flex items-start gap-3 text-sm leading-6"><input type="checkbox" disabled className="mt-1 h-5 w-5 shrink-0" />I confirm this amount and understand how deposited funds can be used.</label>
            <div className="mt-5 flex flex-wrap gap-3"><span className="flex min-h-12 flex-1 items-center justify-center rounded-xl border px-4 font-bold">Cancel</span><span className="flex min-h-12 flex-[2] items-center justify-center rounded-xl bg-[#31e800] px-4 font-extrabold text-[#002719]">Confirm $100 deposit</span></div>
            <p className="mt-5 text-xs leading-5">No real money is charged. Your password is checked securely and is not saved with this deposit.</p>
          </dialog>
        </div>
      </section>
    </div>
  </main>;
}
