import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
vi.mock("@/lib/account/actions", () => ({ saveProfileDetails: vi.fn() }));
import { ProfileDetailsForm, type ProfileDetails } from "./ProfileDetailsForm";

const details: ProfileDetails = {
  displayName: "Chris Prior", legalFirstName: "Chris", legalLastName: "Prior", dateOfBirth: "1990-01-01",
  email: "chris@example.test", emailConfirmed: true, phone: "(910) 555-0147", addressLine1: "125 Market Street",
  addressLine2: "Unit 4", city: "Wilmington", region: "NC", postalCode: "28401", country: "United States",
  preferredLocale: "en-US", timezone: "America/New_York",
};

afterEach(cleanup);

test("profile editor includes traditional account, contact, address and preference fields", () => {
  render(<ProfileDetailsForm details={details} />);
  for (const heading of ["Personal information", "Contact details", "Mailing address", "Regional preferences"]) {
    expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
  }
  expect((screen.getByLabelText("Display name") as HTMLInputElement).value).toBe("Chris Prior");
  expect((screen.getByLabelText("Phone number") as HTMLInputElement).value).toBe("(910) 555-0147");
  expect((screen.getByLabelText("Street address") as HTMLInputElement).value).toBe("125 Market Street");
  expect((screen.getByLabelText("Legal name") as HTMLInputElement).readOnly).toBe(true);
  expect((screen.getByLabelText("Date of birth") as HTMLInputElement).readOnly).toBe(true);
  expect((screen.getByLabelText("Email address") as HTMLInputElement).readOnly).toBe(true);
  expect(screen.getByRole("button", { name: /Save profile/ })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Back to Account & Security" }).getAttribute("href")).toBe("/account/security");
});
