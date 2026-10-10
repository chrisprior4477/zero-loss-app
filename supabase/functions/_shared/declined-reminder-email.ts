export type DeclinedReminderEmailInput = {
  title: string;
  retailer: string;
  deadline: string;
  reviewHref: string;
  preview?: boolean;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export function renderDeclinedReminderEmail(input: DeclinedReminderEmailInput) {
  const reviewUrl = new URL(input.reviewHref);
  if (reviewUrl.protocol !== "https:" || reviewUrl.username || reviewUrl.password) throw new Error("Email link must use HTTPS");
  const deadline = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long", timeStyle: "short", timeZone: "America/New_York",
  }).format(new Date(input.deadline));
  if (deadline === "Invalid Date") throw new Error("Invalid reminder deadline");
  const subject = "The offer you declined expires in two days";
  const body = `You asked us to remind you about your declined ${input.retailer} purchase option for ${input.title}. You can still revive it until ${deadline} Eastern Time. Revival is optional; if you are not interested, you can ignore this email.`;
  const footer = "Zero Loss is an experimental MVP. Entries, payments, and rewards in this preview are simulated.";
  return {
    subject,
    text: ["ZERO LOSS", "YOUR REQUESTED REMINDER", body, `Review declined offers: ${reviewUrl.toString()}`, footer].join("\n\n"),
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#061b36;font-family:Arial,Helvetica,sans-serif;color:#081d3f"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#061b36"><tr><td align="center" style="padding:28px 12px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="background:#082751;padding:24px 28px;border-bottom:4px solid #12b9ef;color:#fff"><span style="font-size:26px;font-weight:900;letter-spacing:.05em">ZERØ <span style="color:#56f21e">LØSS</span></span></td></tr><tr><td style="padding:30px 28px"><p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.12em;color:#067e57">YOUR REQUESTED REMINDER</p><h1 style="font-size:25px;line-height:1.22;margin:0 0 20px;color:#081d3f">${escapeHtml(subject)}.</h1><p style="font-size:16px;line-height:1.55;color:#355375;margin:0 0 16px">${escapeHtml(body)}</p><a href="${escapeHtml(reviewUrl.toString())}" style="display:inline-block;background:#04b9ee;color:#001a35;text-decoration:none;font-size:16px;font-weight:800;padding:14px 22px;border-radius:9px;margin:10px 0 6px">Review declined offers</a></td></tr><tr><td style="background:#eaf5fb;padding:18px 28px;font-size:12px;line-height:1.5;color:#55718c">${escapeHtml(footer)}</td></tr></table></td></tr></table></body></html>`,
  };
}
