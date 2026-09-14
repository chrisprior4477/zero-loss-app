export function EmailDeliveryHint({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-label="Email delivery tip"
      className={`rounded-xl border border-amber-300/35 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50 ${className}`}
    >
      <strong className="block font-black text-amber-200">
        Don&apos;t see the email?
      </strong>
      Check your spam or junk folder. If it&apos;s there, mark it as “Not spam” so
      future Zero Loss account emails reach your inbox.
    </aside>
  );
}
