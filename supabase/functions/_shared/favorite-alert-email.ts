export type FavoriteAlertEmailInput = {
  title: string;
  sold: number;
  capacity: number;
  offerHref: string;
  preferencesHref: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function httpsLink(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Email links must use HTTPS");
  return url.toString();
}

export function renderFavoriteAlertEmail(input: FavoriteAlertEmailInput) {
  if (!input.title.trim() || !Number.isSafeInteger(input.sold) || !Number.isSafeInteger(input.capacity)
    || input.capacity < 1 || input.sold < 0 || input.sold >= input.capacity
    || input.sold * 10 < input.capacity * 9) throw new Error("Invalid almost-full offer");
  const percent = Math.floor(input.sold / input.capacity * 100);
  const remaining = input.capacity - input.sold;
  const title = input.title.trim();
  const offerHref = httpsLink(input.offerHref);
  const preferencesHref = httpsLink(input.preferencesHref);
  const subject = `${title} is almost full`;
  const headline = `${title} is ${percent}% full`;
  const details = `A prize you asked us to watch has reached ${percent}% full. ${remaining.toLocaleString("en-US")} of ${input.capacity.toLocaleString("en-US")} entries remained when we checked. Availability may change before you open the page, and this alert does not reserve an entry.`;
  const footer = "You asked to watch this saved item. To pause these emails, visit Notifications. You can change this choice any time in your account.";
  const preview = "This is the Zero Loss experimental MVP. Demo entries and funding are simulated.";
  return {
    subject,
    text: ["ZERO LOSS", "FAVORITES WATCHLIST", headline, details, `View saved prize: ${offerHref}`, footer, `Email preferences: ${preferencesHref}`, preview].join("\n\n"),
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#061b36;font-family:Arial,Helvetica,sans-serif;color:#081d3f"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#061b36"><tr><td align="center" style="padding:28px 12px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="background:#082751;padding:24px 28px;border-bottom:4px solid #12b9ef;color:#fff"><span style="font-size:26px;font-weight:900;letter-spacing:.05em">ZERØ <span style="color:#56f21e">LØSS</span></span><br><span style="font-size:12px;letter-spacing:.12em;color:#b8d3eb">REAL SHOTS. REAL WINS. ZERO LOSS.</span></td></tr><tr><td style="padding:30px 28px"><p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.12em;color:#df4254">FAVORITES WATCHLIST</p><h1 style="font-size:25px;line-height:1.22;margin:0 0 20px;color:#081d3f">${escapeHtml(headline)}</h1><p style="font-size:16px;line-height:1.55;color:#355375">${escapeHtml(details)}</p><a href="${escapeHtml(offerHref)}" style="display:inline-block;background:#04b9ee;color:#001a35;text-decoration:none;font-size:16px;font-weight:800;padding:14px 22px;border-radius:9px;margin:10px 0 6px">View saved prize</a></td></tr><tr><td style="background:#eaf5fb;padding:18px 28px;font-size:12px;line-height:1.5;color:#55718c">${escapeHtml(footer)} <a href="${escapeHtml(preferencesHref)}" style="color:#0069a8;font-weight:700">Manage email preferences</a><br>${escapeHtml(preview)}</td></tr></table></td></tr></table></body></html>`,
  };
}
