export type CrewInvitationEmailInput = {
  senderName: string;
  reviewHref: string;
  preview?: boolean;
  automatic?: boolean;
};

export function crewInvitationReviewHref(origin: string, invitationId: string): string {
  const site = new URL(origin);
  if (site.protocol !== "https:" || site.username || site.password || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(invitationId)) throw new Error("Invalid Crew request link");
  return `${site.origin}/account/crew?tab=requests&request=${invitationId}#crew-request-${invitationId}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export function renderCrewInvitationEmail(input: CrewInvitationEmailInput) {
  const senderName = input.senderName.trim();
  if (!senderName || senderName.length > 160) throw new Error("Invalid Crew sender name");
  const reviewUrl = new URL(input.reviewHref);
  if (reviewUrl.protocol !== "https:" || reviewUrl.username || reviewUrl.password) throw new Error("Crew link must use HTTPS");
  const subject = input.automatic ? `${senderName} is now in your Zero Loss Crew` : `${senderName} invited you to their Zero Loss Crew`;
  const body = input.automatic ? `${senderName} is now connected with you on Zero Loss. You can receive shared finds, choose whether to share your own picks back, or leave the connection at any time. Your wallet and payment details stay private.` : `${senderName} sent you a private Crew request. You can approve or decline it in Zero Loss. Nothing from your activity is shared with them until you approve the connection and choose your sharing settings. If you do not recognize this request, you can ignore it.`;
  const heading = input.automatic ? "YOUR CREW" : "PRIVATE CREW REQUEST";
  const action = input.automatic ? "Manage Crew connection" : "Review Crew request";
  const footer = input.automatic ? "You can leave this connection in Zero Loss at any time." : "Zero Loss Crew requests are private until you approve them.";
  const preview = input.preview ? "This is a Zero Loss MVP preview email. No real Crew request was created." : "";
  return {
    subject,
    text: ["ZERO LOSS", heading, body, `${action}: ${reviewUrl.toString()}`, preview].filter(Boolean).join("\n\n"),
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#061b36;font-family:Arial,Helvetica,sans-serif;color:#081d3f"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#061b36"><tr><td align="center" style="padding:28px 12px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="background:#082751;padding:24px 28px;border-bottom:4px solid #12b9ef;color:#fff"><span style="font-size:26px;font-weight:900;letter-spacing:.05em">ZERØ <span style="color:#56f21e">LØSS</span></span></td></tr><tr><td style="padding:30px 28px"><p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.12em;color:#067e57">${heading}</p><h1 style="font-size:25px;line-height:1.22;margin:0 0 20px;color:#081d3f">${escapeHtml(subject)}.</h1><p style="font-size:16px;line-height:1.55;color:#355375;margin:0 0 16px">${escapeHtml(body)}</p><a href="${escapeHtml(reviewUrl.toString())}" style="display:inline-block;background:#04b9ee;color:#001a35;text-decoration:none;font-size:16px;font-weight:800;padding:14px 22px;border-radius:9px;margin:10px 0 6px">${action}</a></td></tr><tr><td style="background:#eaf5fb;padding:18px 28px;font-size:12px;line-height:1.5;color:#55718c">${preview ? escapeHtml(preview) : footer}</td></tr></table></td></tr></table></body></html>`,
  };
}
