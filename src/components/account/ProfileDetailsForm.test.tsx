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
  expect((screen.getByLabelText("Legal first name") as HTMLInputElement).value).toBe("Chris");
  expect((screen.getByLabelText("Legal last name") as HTMLInputElement).value).toBe("Prior");
  expect((screen.getByLabelText("Birth month") as HTMLSelectElement).value).toBe("1");
  expect((screen.getByLabelText("Birth day") as HTMLSelectElement).value).toBe("1");
  expect((screen.getByLabelText("Birth year") as HTMLSelectElement).value).toBe("1990");
  expect((screen.getByLabelText("Email address") as HTMLInputElement).readOnly).toBe(true);
  expect((screen.getByLabelText("Country") as HTMLSelectElement).options[0].textContent).toBe("United States");
  expect(screen.getByRole("button", { name: "Clear phone number" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Save profile/ })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Back to Account & Security" }).getAttribute("href")).toBe("/account/security");
});
