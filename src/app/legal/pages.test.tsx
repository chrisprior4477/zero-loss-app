import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import LegalPageOverview from "./page";
import TermsPage from "../terms/page";
import PrivacyPage from "../privacy/page";
import ResponsibleParticipationPage from "../responsible-participation/page";

afterEach(cleanup);

describe("legal and safety pages", () => {
  test("overview links to each policy and distinguishes the draft rules", () => {
    render(<LegalPageOverview />);
    expect(screen.getByRole("heading", { name: "Legal and safety" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Read Terms of Service/ }).getAttribute("href")).toBe("/terms");
    expect(screen.getByRole("link", { name: /Read Privacy Policy/ }).getAttribute("href")).toBe("/privacy");
    expect(screen.getByRole("link", { name: /Read Responsible Play/ }).getAttribute("href")).toBe("/responsible-participation");
    expect(screen.getByText(/not approved for publication or a live promotion/)).toBeTruthy();
  });

  test("terms match demo behavior without presenting free entry as operational", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", { name: "Terms of Service" })).toBeTruthy();
    expect(screen.getByText(/30-second pending window/)).toBeTruthy();
    expect(screen.getByText(/does not currently submit, reserve, or create an entry/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "free-entry page" }).getAttribute("href")).toBe("/free-entry");
  });

  test("privacy provides real account controls and a request route", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe("/account/profile");
    expect(screen.getByRole("link", { name: "send a private support message" }).getAttribute("href")).toBe("/contact#message");
  });

  test("responsible play gives independent help and does not invent self-exclusion", () => {
    render(<ResponsibleParticipationPage />);
    expect(screen.getByRole("heading", { name: "Responsible Play" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "1-800-MY-RESET" }).getAttribute("href")).toBe("tel:18006973738");
    expect(screen.getByRole("link", { name: "Call 988" }).getAttribute("href")).toBe("tel:988");
    expect(screen.getByRole("link", { name: "Text 988" }).getAttribute("href")).toBe("sms:988");
    expect(screen.getByText(/does not have a self-service spending limit, time-out, or self-exclusion switch/)).toBeTruthy();
  });
});
