const STAGGER_MS = 220;

type Differentiator = {
  label: string;
  header: string;
  body: string;
  icon: "ticket" | "gift" | "receipt";
};

const differentiators: Differentiator[] = [
  {
    label: "Try",
    header: "For a buck?",
    body: "Yep. One dollar gets you a real shot at the full prize.",
    icon: "ticket",
  },
  {
    label: "Win",
    header: "Well, look at that. You won.",
    body: "The prize ships or lands in your wallet, ready to use.",
    icon: "gift",
  },
  {
    label: "Plot twist",
    header: "No luck? Here's the part nobody expects.",
    body: "Use what you spent toward buying it instead.",
    icon: "receipt",
  },
];

function CardIcon({ name }: { name: Differentiator["icon"] }) {
  const common = {
    className: "h-4 w-4 text-[var(--accent)] sm:h-5 sm:w-5",
    fill: "none" as const,
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 1.75,
    "aria-hidden": true as const,
  };

  if (name === "ticket") {
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 9V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 1 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 1 0 0-6Z"
        />
        <path strokeLinecap="round" d="M9 8v8" />
      </svg>
    );
  }

  if (name === "gift") {
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v13m0-13H7.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8Zm0 0h4.5a2.5 2.5 0 1 0 0-5C13 3 12 8 12 8ZM5 8h14v3H5V8Zm1 3v10h12V11"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 6h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9.5 13 1.5 1.5 3.5-3.5"
      />
      <path strokeLinecap="round" d="M9 9h6" />
    </svg>
  );
}

function cardSurfaceClass(index: number) {
  if (index === 0) {
    return "border-[var(--border)] bg-[var(--surface-elevated)] shadow-[0_1px_0_rgba(255,255,255,0.04)] sm:-translate-y-1";
  }
  if (index === 1) {
    return "border-[var(--border)] bg-[var(--surface)] sm:translate-y-3";
  }
  return "border-[color-mix(in_srgb,var(--accent)_72%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-elevated))] shadow-[0_16px_40px_-14px_color-mix(in_srgb,var(--accent)_70%,transparent),0_0_0_1px_color-mix(in_srgb,var(--accent)_28%,transparent)] sm:-translate-y-2";
}

/** Try → Win → Plot twist sequence. CSS stagger via `.stagger-enter`. */
export function MechanismStory() {
  return (
    <ul className="grid gap-3 sm:grid-cols-3 sm:items-start sm:gap-4">
      {differentiators.map((item, index) => (
        <li
          key={item.label}
          className={`stagger-enter rounded-xl border p-4 sm:p-5 ${cardSurfaceClass(index)}`}
          style={{ animationDelay: `${index * STAGGER_MS}ms` }}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg border sm:h-9 sm:w-9 ${
              index === 2
                ? "border-[color-mix(in_srgb,var(--accent)_55%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface))]"
                : "border-[var(--border)] bg-[var(--background)]/40"
            }`}
          >
            <CardIcon name={item.icon} />
          </div>
          <p className="mt-3 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[var(--accent)] sm:mt-3.5">
            {item.label}
          </p>
          <h2
            className={`mt-1.5 leading-snug text-[var(--foreground)] ${
              index === 2
                ? "text-[0.95rem] font-semibold sm:text-base"
                : "text-sm font-semibold sm:text-[0.95rem]"
            }`}
          >
            {item.header}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
            {item.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
