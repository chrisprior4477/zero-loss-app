export type RewardEmailInput = {
  title: string;
  retailer: string;
  giftCardValueCents: number;
  rewardHref: string;
  preview?: boolean;
};
export type RewardDeadlineEmailInput = RewardEmailInput & { deadline: string; reminderKey: "7d" | "1d" };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
function money(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("Invalid reward value");
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(cents / 100);
}
function httpsUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Reward link must use HTTPS");
  return url;
}
function document(subject: string, body: string, button: string, rewardUrl: URL, preview: boolean) {
  const footer = "Zero Loss is an experimental MVP. Entries, payments, and rewards in this preview are simulated.";
  const previewNote = preview ? "This is a sample email. No reward was created or changed." : "";
  return {
    subject,
    text: ["ZERO LOSS", "REWARD UPDATE", body, `${button}: ${rewardUrl}`, footer, previewNote].filter(Boolean).join("\n\n"),
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#061b36;font-family:Arial,Helvetica,sans-serif;color:#081d3f"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#061b36"><tr><td align="center" style="padding:28px 12px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="background:#082751;padding:24px 28px;border-bottom:4px solid #12b9ef;color:#fff"><span style="font-size:26px;font-weight:900;letter-spacing:.05em">ZERØ <span style="color:#56f21e">LØSS</span></span></td></tr><tr><td style="padding:30px 28px"><p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.12em;color:#067e57">REWARD UPDATE</p><h1 style="font-size:25px;line-height:1.22;margin:0 0 20px;color:#081d3f">${escapeHtml(subject)}.</h1><p style="font-size:16px;line-height:1.55;color:#355375;margin:0 0 16px">${escapeHtml(body)}</p><a href="${escapeHtml(rewardUrl.toString())}" style="display:inline-block;background:#04b9ee;color:#001a35;text-decoration:none;font-size:16px;font-weight:800;padding:14px 22px;border-radius:9px;margin:10px 0 6px">${escapeHtml(button)}</a></td></tr><tr><td style="background:#eaf5fb;padding:18px 28px;font-size:12px;line-height:1.5;color:#55718c">${escapeHtml(footer)}${previewNote ? `<br>${escapeHtml(previewNote)}` : ""}</td></tr></table></td></tr></table></body></html>`,
  };
}

export function renderRewardReadyEmail(input: RewardEmailInput) {
  const rewardUrl = httpsUrl(input.rewardHref);
  const subject = `Your ${input.retailer} reward is ready`;
  const body = `Your ${money(input.giftCardValueCents)} ${input.retailer} digital gift card for ${input.title} is ready in Gift Cards & Rewards. Sign in to review its status and any claim deadline. For your security, the gift-card number is available only inside your account.`;
  return document(subject, body, "Open my reward", rewardUrl, Boolean(input.preview));
}

export function renderRewardDeadlineEmail(input: RewardDeadlineEmailInput) {
  const rewardUrl = httpsUrl(input.rewardHref);
  if (input.reminderKey !== "7d" && input.reminderKey !== "1d") throw new Error("Invalid reward reminder timing");
  const date = new Date(input.deadline);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid reward deadline");
  const claimDate = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/New_York" }).format(date);
  const subject = `Claim your ${input.retailer} reward by ${claimDate}`;
  const body = `Your ${money(input.giftCardValueCents)} ${input.retailer} reward is waiting in your Zero Loss account. Its claim deadline is ${claimDate} Eastern Time. Please sign in and check the reward details before then. If you already claimed it, no action is needed.`;
  return document(subject, body, "View my reward", rewardUrl, Boolean(input.preview));
}
