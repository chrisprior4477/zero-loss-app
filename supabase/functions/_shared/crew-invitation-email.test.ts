import { describe, expect, it } from "vitest";
import { crewInvitationReviewHref, renderCrewInvitationEmail } from "./crew-invitation-email";

describe("Crew invitation email", () => {
  const input = { senderName: "Alex", reviewHref: "https://mvp.getzeroloss.com/account/crew" };

  it("uses approved consent-first copy and a private account link", () => {
    const message = renderCrewInvitationEmail(input);
    expect(message.subject).toBe("Alex invited you to their Zero Loss Crew");
    expect(message.text).toContain("Nothing from your activity is shared");
    expect(message.text).toContain("approve or decline");
    expect(message.html).toContain(input.reviewHref);
  });

  it("escapes profile names and rejects insecure links", () => {
    expect(renderCrewInvitationEmail({ ...input, senderName: "<script>" }).html).toContain("&lt;script&gt;");
    expect(() => renderCrewInvitationEmail({ ...input, reviewHref: "http://example.com" })).toThrow();
  });

  it("targets the exact request without auto-accepting or including private account data", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const href = crewInvitationReviewHref("https://mvp.getzeroloss.com", id);
    expect(href).toBe(`https://mvp.getzeroloss.com/account/crew?tab=requests&request=${id}#crew-request-${id}`);
    expect(renderCrewInvitationEmail({ ...input, reviewHref: href }).text).toContain(href);
    expect(() => crewInvitationReviewHref("https://mvp.getzeroloss.com", "not-an-id")).toThrow();
  });
});
