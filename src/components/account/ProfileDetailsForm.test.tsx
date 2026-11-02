import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("@/lib/account/actions", () => ({ saveProfileDetails: vi.fn() }));
vi.mock("@/lib/account/timezone-lookup-action", () => ({ lookupAddressTimeZone: vi.fn().mockResolvedValue({ zone: "America/New_York", options: ["America/New_York"] }) }));
import { ProfileDetailsForm, type ProfileDetails } from "./ProfileDetailsForm";
import { lookupAddressTimeZone } from "@/lib/account/timezone-lookup-action";

const details: ProfileDetails = {
  displayName: "Chris Prior", legalFirstName: "Chris", legalLastName: "Prior", dateOfBirth: "1990-01-01",
  email: "chris@example.test", emailConfirmed: true, phone: "(910) 555-0147", addressLine1: "125 Market Street",
  addressLine2: "Unit 4", city: "Wilmington", region: "NC", postalCode: "28401", country: "United States",
  preferredLocale: "en-US", timezone: "America/New_York",
};

afterEach(cleanup);

test("profile editor includes traditional account, contact, address and preference fields", () => {
  render(<ProfileDetailsForm details={details} />);
  for (const heading of ["Personal information", "Contact details", "Mailing address", "Language preferences"]) {
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

test("asks for an in-country time zone under Country only when lookup is ambiguous", async () => {
  vi.mocked(lookupAddressTimeZone).mockResolvedValue({ zone: null, options: ["Australia/Brisbane", "Australia/Sydney"] });
  render(<ProfileDetailsForm details={{ ...details, country: "Australia", region: "Queensland", postalCode: "4000" }} />);
  const picker = await screen.findByLabelText("Time zone for your address", {}, { timeout: 3000 }) as HTMLSelectElement;
  expect(picker.value).toBe("");
  expect([...picker.options].map(option => option.value)).toEqual(["", "Australia/Brisbane", "Australia/Sydney"]);
  fireEvent.change(picker, { target: { value: "Australia/Brisbane" } });
  expect(picker.value).toBe("Australia/Brisbane");
});

test("hides the time-zone choice for a resolved address", async () => {
  vi.mocked(lookupAddressTimeZone).mockResolvedValue({ zone: "Europe/London", options: ["Europe/London"] });
  render(<ProfileDetailsForm details={{ ...details, country: "United Kingdom", region: "England", postalCode: "SW1A 1AA" }} />);
  await waitFor(() => expect(lookupAddressTimeZone).toHaveBeenCalledWith("United Kingdom", "England", "SW1A 1AA"));
  await waitFor(() => expect(screen.queryByText("Checking your address time zone…")).toBeNull());
  expect(screen.queryByLabelText("Time zone for your address")).toBeNull();
});

test("keeps Save disabled and offers a retry if the lookup fails", async () => {
  vi.mocked(lookupAddressTimeZone).mockRejectedValueOnce(new Error("offline"));
  vi.mocked(lookupAddressTimeZone).mockResolvedValueOnce({ zone: "Europe/London", options: ["Europe/London"] });
  render(<ProfileDetailsForm details={{ ...details, country: "United Kingdom", region: "England", postalCode: "SW1A 1AA" }} />);
  const retry = await screen.findByRole("button", { name: "Try again" }, { timeout: 3000 });
  expect((screen.getByRole("button", { name: /Save profile/ }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(retry);
  await waitFor(() => expect((screen.getByRole("button", { name: /Save profile/ }) as HTMLButtonElement).disabled).toBe(false));
});
