export type CrewWinShareEmailInput = { senderName: string; title: string; updateHref: string; preferencesHref: string; preview?: boolean };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
function httpsUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Crew link must use HTTPS");
  return url;
}
export function renderCrewWinShareEmail(input: CrewWinShareEmailInput) {
  const senderName = input.senderName.trim();
  const title = input.title.trim();
  if (!senderName || senderName.length > 160 || !title || title.length > 300) throw new Error("Invalid Crew win details");
  const updateUrl = httpsUrl(input.updateHref);
  const preferencesUrl = httpsUrl(input.preferencesHref);
  const subject = `${senderName} shared an update with their Crew`;
  const body = `${senderName} chose to share a win for ${title} with you. You can view the shared activity in Zero Loss. We do not include gift-card numbers, account balances, or private entry details in this email.`;
  const preview = input.preview ? "This is a Zero Loss MVP sample. No win was shared with your account." : "";
  return {
    subject,
    text: ["ZERO LOSS", "SHARED WIN UPDATE", body, `View shared update: ${updateUrl}`, `Manage Crew win emails: ${preferencesUrl}`, preview].filter(Boolean).join("\n\n"),
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#061b36;font-family:Arial,Helvetica,sans-serif;color:#081d3f"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#061b36"><tr><td align="center" style="padding:28px 12px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="background:#082751;padding:24px 28px;border-bottom:4px solid #12b9ef;color:#fff"><span style="font-size:26px;font-weight:900;letter-spacing:.05em">ZERØ <span style="color:#56f21e">LØSS</span></span></td></tr><tr><td style="padding:30px 28px"><p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.12em;color:#067e57">SHARED WIN UPDATE</p><h1 style="font-size:25px;line-height:1.22;margin:0 0 20px;color:#081d3f">${escapeHtml(subject)}.</h1><p style="font-size:16px;line-height:1.55;color:#355375;margin:0 0 16px">${escapeHtml(body)}</p><a href="${escapeHtml(updateUrl.toString())}" style="display:inline-block;background:#04b9ee;color:#001a35;text-decoration:none;font-size:16px;font-weight:800;padding:14px 22px;border-radius:9px;margin:10px 0 6px">View shared update</a></td></tr><tr><td style="background:#eaf5fb;padding:18px 28px;font-size:12px;line-height:1.5;color:#55718c">${preview ? escapeHtml(preview) : "Shared only because the winner selected you and your Crew win emails are on."}<br><a href="${escapeHtml(preferencesUrl.toString())}">Manage Crew win emails</a></td></tr></table></td></tr></table></body></html>`,
  };
}
