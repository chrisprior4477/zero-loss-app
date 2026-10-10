export type OutcomeEmailKind = "winner" | "paid_not_selected" | "amoe_not_selected";

export type OutcomeEmailInput = {
  kind: OutcomeEmailKind;
  title: string;
  retailer: string;
  giftCardValueCents: number;
  paidCents: number;
  completionCents: number | null;
  completionDeadline: string | null;
  entryHref: string;
  rewardHref: string | null;
  preferencesHref: string;
  preview: boolean;
};

function money(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("Invalid money amount");
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function validHttpsHref(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Email links must use HTTPS");
  return escapeHtml(url.toString());
}

/** All three outcomes use the same Zero Loss transactional email shell. */
export function renderOutcomeEmail(input: OutcomeEmailInput): { subject: string; html: string; text: string } {
  if (!input.title.trim() || !input.retailer.trim()) throw new Error("Missing offer details");
  const value = money(input.giftCardValueCents);
  const retailer = input.retailer.trim();
  const title = input.title.trim();
  const win = input.kind === "winner";
  const amoe = input.kind === "amoe_not_selected";
  if (amoe && (input.paidCents !== 0 || input.completionCents !== input.giftCardValueCents)) {
    throw new Error("Free entries must have no paid credit and the full completion price");
  }
  if (!win && (input.completionCents === null || input.completionCents !== input.giftCardValueCents - input.paidCents || !input.completionDeadline)) {
    throw new Error("Completion amount or deadline does not match the entry");
  }
  if (win && !input.rewardHref) throw new Error("Winner reward link is required");
  const subject = win ? `You won: ${title}` : `Your result is ready: ${title}`;
  const eyebrow = win ? "YOU WON" : "YOUR ENTRY RESULT";
  const headline = win ? `You won ${title}.` : "This entry wasn't selected.";
  const paragraphs = win
    ? [`Congratulations—your entry for ${title} was selected. Your prize is a ${value} ${retailer} digital gift card.`, "Sign in to view your reward. If it is still being prepared, we’ll let you know when it is ready. You never need to pay to receive a prize you won."]
    : [
        `${amoe ? "Your free entry" : `Your ${money(input.paidCents)} paid entry`} for ${title} was not selected.`,
        amoe
          ? `You may choose to purchase a ${value} ${retailer} digital gift card for ${money(input.completionCents!)}. Because this entry was free, no entry payment is applied to that price.`
          : `You have an optional purchase option: pay the remaining ${money(input.completionCents!)} to receive a ${value} ${retailer} digital gift card. Your ${money(input.paidCents)} entry amount is already reflected in that price.`,
        `The option ends ${new Date(input.completionDeadline!).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" })} Eastern Time. ${amoe ? "Your free entry is complete whether or not you buy." : "Separate entries do not combine, and you do not have to buy anything else."}`,
      ];
  const href = validHttpsHref(win ? input.rewardHref! : input.entryHref);
  const preferencesHref = validHttpsHref(input.preferencesHref);
  const button = win ? "View my reward" : amoe ? "Review my option" : "Review my purchase option";
  const previewNote = input.preview ? "This is a Zero Loss experimental MVP email. Demo entries, payments, and rewards are simulated." : "";
  const preferenceCopy = "Want to stop outcome emails? Turn them off in Email preferences. You can change this choice any time in your account.";
  const text = [`ZERO LOSS`, eyebrow, headline, ...paragraphs, `${button}: ${win ? input.rewardHref : input.entryHref}`, preferenceCopy, `Email preferences: ${input.preferencesHref}`, previewNote].filter(Boolean).join("\n\n");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#061b36;font-family:Arial,Helvetica,sans-serif;color:#081d3f"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#061b36"><tr><td align="center" style="padding:28px 12px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="background:#082751;padding:24px 28px;border-bottom:4px solid #12b9ef;color:#fff"><span style="font-size:26px;font-weight:900;letter-spacing:.05em">ZERØ <span style="color:#56f21e">LØSS</span></span><br><span style="font-size:12px;letter-spacing:.12em;color:#b8d3eb">REAL SHOTS. REAL WINS. ZERO LOSS.</span></td></tr><tr><td style="padding:30px 28px"><p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.12em;color:#067e57">${escapeHtml(eyebrow)}</p><h1 style="font-size:25px;line-height:1.22;margin:0 0 20px;color:#081d3f">${escapeHtml(headline)}</h1>${paragraphs.map(paragraph => `<p style="font-size:16px;line-height:1.55;color:#355375;margin:0 0 16px">${escapeHtml(paragraph)}</p>`).join("")}<a href="${href}" style="display:inline-block;background:#04b9ee;color:#001a35;text-decoration:none;font-size:16px;font-weight:800;padding:14px 22px;border-radius:9px;margin:10px 0 6px">${escapeHtml(button)}</a></td></tr><tr><td style="background:#eaf5fb;padding:18px 28px;font-size:12px;line-height:1.5;color:#55718c">${previewNote ? escapeHtml(previewNote) + "<br>" : ""}${escapeHtml(preferenceCopy)} <a href="${preferencesHref}" style="color:#0069a8;font-weight:700">Turn off outcome emails</a><br>Zero Loss · View the offer and official rules on the website.</td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text };
}
