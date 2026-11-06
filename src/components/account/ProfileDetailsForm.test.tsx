import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("@/lib/account/actions", () => ({ saveProfileDetails: vi.fn() }));
vi.mock("@/lib/account/timezone-lookup-action", () => ({ lookupAddressTimeZone: vi.fn().mockResolvedValue({ zone: "America/New_York", options: ["America/New_York"] }) }));
import { ProfileDetailsForm, type ProfileDetails } from "./ProfileDetailsForm";
import { lookupAddressTimeZone } from "@/lib/account/timezone-lookup-action";
import { saveProfileDetails } from "@/lib/account/actions";

const details: ProfileDetails = {
  displayName: "Chris Prior", legalFirstName: "Chris", legalLastName: "Prior", dateOfBirth: "1990-01-01",
  email: "chris@example.test", emailConfirmed: true, phone: "(910) 555-0147", addressLine1: "125 Market Street",
  addressLine2: "Unit 4", city: "Wilmington", region: "NC", postalCode: "28401", country: "United States",
  preferredLocale: "en-US", timezone: "America/New_York",
};

afterEach(() => { cleanup(); vi.mocked(saveProfileDetails).mockReset(); });

test("a rejected save preserves the full draft and resubmits corrected values", async () => {
  vi.mocked(lookupAddressTimeZone).mockResolvedValue({ zone: "Europe/London", options: ["Europe/London"] });
  vi.mocked(saveProfileDetails).mockResolvedValueOnce({ status: "error", message: "Enter a valid phone number, or leave it blank." });
  vi.mocked(saveProfileDetails).mockResolvedValueOnce({ status: "succeeded", message: "Your profile information has been updated." });
  render(<ProfileDetailsForm details={details} />);
  const changes = { "Display name": "New display", "Legal first name": "New first", "Legal last name": "New last", "Phone number": "123", "Street address": "1 Example Street", "Apartment, suite, or unit (optional)": "", "City": "London", "State or region": "England", "ZIP or postal code": "SW1A 1AA", "Country": "United Kingdom", "Language": "en-GB" };
  for (const [label, value] of Object.entries(changes)) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.change(screen.getByLabelText("Birth month"), { target: { value: "9" } });
  await waitFor(() => expect((screen.getByRole("button", { name: /Save profile/ }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.submit(screen.getByRole("form", { name: "Edit profile" }));
  await screen.findByText("Enter a valid phone number, or leave it blank.");
  for (const [label, value] of Object.entries(changes)) expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe(value);
  expect((screen.getByLabelText("Birth month") as HTMLSelectElement).value).toBe("9");
  expect(new FormData(screen.getByRole("form") as HTMLFormElement).get("date_of_birth")).toBe("1990-09-01");
  fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "+44 20 7946 0958" } });
  fireEvent.submit(screen.getByRole("form", { name: "Edit profile" }));
  await screen.findByText("Your profile information has been updated.");
  const submitted = vi.mocked(saveProfileDetails).mock.calls.at(-1)![1];
  expect(submitted.get("phone_number")).toBe("+44 20 7946 0958");
  expect(submitted.get("address_line_1")).toBe("1 Example Street");
  expect(submitted.get("country")).toBe("United Kingdom");
  expect(submitted.get("preferred_locale")).toBe("en-GB");
});

test("cleared fields remain blank after rejection and keep keyboard focus", async () => {
  vi.mocked(lookupAddressTimeZone).mockResolvedValue({ zone: "America/New_York", options: ["America/New_York"] });
  vi.mocked(saveProfileDetails).mockResolvedValueOnce({ status: "error", message: "Check the profile details." });
  render(<ProfileDetailsForm details={details} />);
  fireEvent.click(screen.getByRole("button", { name: "Clear phone number" }));
  expect(document.activeElement).toBe(screen.getByLabelText("Phone number"));
  fireEvent.submit(screen.getByRole("form", { name: "Edit profile" }));
  await screen.findByText("Check the profile details.");
  expect((screen.getByLabelText("Phone number") as HTMLInputElement).value).toBe("");
});

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

test("restores the saved in-country zone and keeps it while editing an unrelated field", async () => {
  vi.mocked(lookupAddressTimeZone).mockResolvedValue({ zone: null, options: ["America/Toronto", "America/Vancouver"] });
  render(<ProfileDetailsForm details={{ ...details, country: "Canada", region: "Ontario", postalCode: "M5V 1A1", timezone: "America/Toronto" }} />);
  const picker = await screen.findByLabelText("Time zone for your address", {}, { timeout: 3000 }) as HTMLSelectElement;
  expect(picker.value).toBe("America/Toronto");
  expect(picker.checkValidity()).toBe(true);
  fireEvent.input(screen.getByLabelText("Phone number"), { target: { value: "+1 416 555 0123" } });
  expect(picker.value).toBe("America/Toronto");
  expect(new FormData(screen.getByRole("form") as HTMLFormElement).get("timezone")).toBe("America/Toronto");
  fireEvent.input(screen.getByLabelText("Country"), { target: { value: "Australia" } });
  await waitFor(() => expect((screen.getByLabelText("Time zone for your address") as HTMLSelectElement).value).toBe(""));
});

test("does not restore a saved zone outside the current country's choices", async () => {
  vi.mocked(lookupAddressTimeZone).mockResolvedValue({ zone: null, options: ["America/Toronto", "America/Vancouver"] });
  render(<ProfileDetailsForm details={{ ...details, country: "Canada", timezone: "Europe/London" }} />);
  const picker = await screen.findByLabelText("Time zone for your address", {}, { timeout: 3000 }) as HTMLSelectElement;
  expect(picker.value).toBe("");
  expect(picker.checkValidity()).toBe(false);
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

test("an address without a postal code can resolve its country time zone", async () => {
  vi.mocked(lookupAddressTimeZone).mockResolvedValue({zone:"Asia/Dubai",options:["Asia/Dubai"]});
  render(<ProfileDetailsForm details={{...details,country:"United Arab Emirates",region:"Dubai",city:null,postalCode:null,timezone:"Asia/Dubai"}} />);
  await waitFor(() => expect(lookupAddressTimeZone).toHaveBeenCalledWith("United Arab Emirates","Dubai",""));
  await waitFor(() => expect(screen.queryByText("Checking your address time zone…")).toBeNull());
  expect(screen.getByText("Optional for United Arab Emirates. Leave blank if your address has no postal code.")).toBeTruthy();
  expect((screen.getByRole("button",{name:"Save profile"}) as HTMLButtonElement).disabled).toBe(false);
});
