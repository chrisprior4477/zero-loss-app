export type PurchaseOptionReminderEmailInput = {
  title: string;
  retailer: string;
  giftCardValueCents: number;
  remainingCents: number;
  deadline: string;
  reminderKey: "7d" | "24h";
  reviewHref: string;
  preferencesHref: string;
  preview?: boolean;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function money(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("Invalid gift-card amount");
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(cents / 100);
}

function httpsUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Email link must use HTTPS");
  return url;
}

export function renderPurchaseOptionReminderEmail(input: PurchaseOptionReminderEmailInput) {
  const reviewUrl = httpsUrl(input.reviewHref);
  const preferencesUrl = httpsUrl(input.preferencesHref);
  const deadlineDate = new Date(input.deadline);
  if (Number.isNaN(deadlineDate.getTime())) throw new Error("Invalid reminder deadline");
  const deadline = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/New_York" }).format(deadlineDate);
  const relative = input.reminderKey === "7d" ? "in 7 days" : input.reminderKey === "24h" ? "tomorrow" : null;
  if (!relative) throw new Error("Invalid reminder timing");
  const subject = `Your ${input.retailer} purchase option ends ${relative}`;
  const body = `Your optional purchase option for ${input.title} is still available. The remaining price is ${money(input.remainingCents)} for a ${money(input.giftCardValueCents)} ${input.retailer} digital gift card. It ends ${deadline} Eastern Time. If you want it, review the details before the deadline. If not, there is nothing you need to do.`;
  const footer = "Zero Loss is an experimental MVP. Entries, payments, and rewards in this preview are simulated.";
  const preview = input.preview ? "This is a sample email. No purchase option was created." : "";
  return {
    subject,
    text: ["ZERO LOSS", "PURCHASE OPTION REMINDER", body, `Review my option: ${reviewUrl}`, footer, `Manage purchase-option emails: ${preferencesUrl}`, preview].filter(Boolean).join("\n\n"),
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#061b36;font-family:Arial,Helvetica,sans-serif;color:#081d3f"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#061b36"><tr><td align="center" style="padding:28px 12px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="background:#082751;padding:24px 28px;border-bottom:4px solid #12b9ef;color:#fff"><span style="font-size:26px;font-weight:900;letter-spacing:.05em">ZERØ <span style="color:#56f21e">LØSS</span></span></td></tr><tr><td style="padding:30px 28px"><p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.12em;color:#067e57">PURCHASE OPTION REMINDER</p><h1 style="font-size:25px;line-height:1.22;margin:0 0 20px;color:#081d3f">${escapeHtml(subject)}.</h1><p style="font-size:16px;line-height:1.55;color:#355375;margin:0 0 16px">${escapeHtml(body)}</p><a href="${escapeHtml(reviewUrl.toString())}" style="display:inline-block;background:#04b9ee;color:#001a35;text-decoration:none;font-size:16px;font-weight:800;padding:14px 22px;border-radius:9px;margin:10px 0 6px">Review my option</a></td></tr><tr><td style="background:#eaf5fb;padding:18px 28px;font-size:12px;line-height:1.5;color:#55718c">${escapeHtml(footer)}<br><a href="${escapeHtml(preferencesUrl.toString())}">Manage purchase-option emails</a>${preview ? `<br>${escapeHtml(preview)}` : ""}</td></tr></table></td></tr></table></body></html>`,
  };
}
