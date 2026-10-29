import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
const navigation = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/lib/payments/actions", () => ({ saveDemoPaymentMethod: vi.fn(), completeDemoFunding: vi.fn(), reconcileDemoFunding: vi.fn(), deleteDemoPaymentMethod: vi.fn() }));
import { saveDemoPaymentMethod, completeDemoFunding } from "@/lib/payments/actions";
import { MobileCardCamera } from "./MobileCardCamera";
import { DemoFundingForm } from "./DemoFundingForm";
import { WalletPaymentMethods } from "./WalletPaymentMethods";
import { WalletCardEditor } from "./WalletCardEditor";

const stop = vi.fn();
const mediaStream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
const getUserMedia = vi.fn();
const drawImage = vi.fn();
beforeEach(() => {
  window.history.replaceState(null, "", "/account/wallet?view=history#balance");
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLVideoElement.prototype, "videoWidth", "get").mockReturnValue(1280);
  vi.spyOn(HTMLVideoElement.prototype, "videoHeight", "get").mockReturnValue(960);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    return this.tagName === "VIDEO" ? new DOMRect(0, 0, 400, 300) : new DOMRect(32, 44, 336, 212);
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage, getImageData: () => ({ data: new Uint8ClampedArray(16).fill(120) }) } as unknown as CanvasRenderingContext2D);
  vi.stubGlobal("navigator", Object.create(navigator, { mediaDevices: { value: { getUserMedia } } }));
  getUserMedia.mockResolvedValue(mediaStream);
  vi.mocked(saveDemoPaymentMethod).mockResolvedValue({ status: "succeeded", message: "Saved" });
});
afterEach(() => { cleanup(); sessionStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.resetAllMocks(); });

async function captureBoth(index = 0) {
  fireEvent.click(screen.getAllByRole("button", { name: "Use camera" })[index]);
  const dialog = screen.getByRole("dialog", { name: "Sample card camera" });
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "Take front photo" })).toBeTruthy());
  expect(within(dialog).getByText(/even one drawn on paper/)).toBeTruthy();
  fireEvent.click(within(dialog).getByRole("button", { name: "Take front photo" }));
  expect(within(dialog).getByText(/Front captured. Flip/)).toBeTruthy();
  fireEvent.click(within(dialog).getByRole("button", { name: "Take back photo" }));
  return dialog;
}

test("front and back use the rear camera, release it, and save only the sample reference and colors", async () => {
  const saved = vi.fn();
  render(<MobileCardCamera token="demo_card_5556" onSaved={saved} />);
  const dialog = await captureBoth();
  expect(getUserMedia).toHaveBeenCalledExactlyOnceWith({ audio: false, video: { facingMode: { ideal: "environment" } } });
  expect(drawImage).toHaveBeenCalledTimes(2);
  expect(stop).toHaveBeenCalled();
  expect(within(dialog).getByText("Discover •••• 5556")).toBeTruthy();
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "Use this card for future transactions" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Save this card" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  const data = vi.mocked(saveDemoPaymentMethod).mock.calls[0][1];
  expect([...data.keys()].sort()).toEqual(["artwork", "makeDefault", "makeDepositDefault", "paymentMethod"]);
  expect(data.get("paymentMethod")).toBe("demo_card_5556");
  expect(data.get("makeDefault")).toBe("false");
  expect(data.get("makeDepositDefault")).toBe("true");
  expect(JSON.parse(String(data.get("artwork")))).toHaveLength(8);
  expect(screen.queryByRole("dialog", { name: "Sample card camera" })).toBeNull();
  expect(completeDemoFunding).not.toHaveBeenCalled();
});

test.each([0, 1])("funding camera entry %i saves into the card list without changing the waiting deposit", async index => {
  const { container } = render(<DemoFundingForm requestKey="camera_deposit_request_01" savedCards={[{ token: "demo_card_4242", lastFour: "4242", isDefault: true }]} />);
  fireEvent.change(screen.getByLabelText("Add specific amount (USD)"), { target: { value: "75" } });
  const dialog = await captureBoth(index);
  fireEvent.click(within(dialog).getByRole("button", { name: "Save this card" }));
  await waitFor(() => expect(container.querySelector('#sample-payment-demo_card_5556')).toBeTruthy());
  expect(screen.queryByRole("form", { name: "Save payment method" })).toBeNull();
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe("7500");
  expect(container.querySelector<HTMLInputElement>('[name="paymentMethod"]')?.value).toBe("demo_card_5556");
  expect(screen.getByText(/Discover •••• 5556 saved and selected/)).toBeTruthy();
  expect(completeDemoFunding).not.toHaveBeenCalled();
});

test("payment methods camera saves directly into the saved-card list", async () => {
  window.history.replaceState(null, "", "#payment-methods");
  render(<WalletPaymentMethods enabled savedCards={[{ token: "demo_card_4242", lastFour: "4242", isDefault: true }]} />);
  const dialog = await captureBoth();
  fireEvent.click(within(dialog).getByRole("button", { name: "Save this card" }));
  await waitFor(() => expect(screen.getByRole("article", { name: "Saved card 5556" })).toBeTruthy());
  expect(window.location.hash).toBe("#payment-methods");
  expect(completeDemoFunding).not.toHaveBeenCalled();
});

test("editor camera saves the card using the selected preferences", async () => {
  const saved = vi.fn();
  render(<WalletCardEditor token="demo_card_1881" displayName="QA Customer" onSaved={saved} onCancel={vi.fn()} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Use this card for deposits" }));
  const dialog = await captureBoth();
  expect((within(dialog).getByRole("checkbox", { name: "Use this card for deposits" }) as HTMLInputElement).checked).toBe(false);
  fireEvent.click(within(dialog).getByRole("button", { name: "Save this card" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(saved.mock.calls[0][0]).toMatchObject({ token: "demo_card_1881", isDepositDefault: false });
});

test("failed save keeps the preview and supports retry without claiming success", async () => {
  const saved = vi.fn();
  vi.mocked(saveDemoPaymentMethod).mockResolvedValueOnce({ status: "error", message: "Please try again." });
  render(<MobileCardCamera token="demo_card_5556" onSaved={saved} />);
  const dialog = await captureBoth();
  fireEvent.click(within(dialog).getByRole("button", { name: "Save this card" }));
  await waitFor(() => expect(within(dialog).getByRole("alert").textContent).toBe("Please try again."));
  expect(saved).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Save this card" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
});

test("a late permission grant after closing releases the camera without capturing or saving", async () => {
  let grant!: (stream: MediaStream) => void;
  getUserMedia.mockReturnValue(new Promise<MediaStream>(resolve => { grant = resolve; }));
  render(<MobileCardCamera token="demo_card_5556" onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Use camera" }));
  fireEvent.click(screen.getByRole("button", { name: "Close camera" }));
  await act(async () => grant(mediaStream));
  expect(stop).toHaveBeenCalled();
  expect(drawImage).not.toHaveBeenCalled();
  expect(saveDemoPaymentMethod).not.toHaveBeenCalled();
});

test("denied camera permission offers the native photo fallback", async () => {
  getUserMedia.mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
  render(<MobileCardCamera token="demo_card_5556" onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Use camera" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Camera access wasn’t allowed"));
  expect(screen.getByRole("button", { name: "Use phone camera / choose photo" })).toBeTruthy();
  expect(saveDemoPaymentMethod).not.toHaveBeenCalled();
});
