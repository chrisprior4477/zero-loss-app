import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ProfilePhotoCard } from "./ProfilePhotoCard";
import type { CSSProperties } from "react";

const { savePhoto, saveVisibility } = vi.hoisted(() => ({ savePhoto: vi.fn(), saveVisibility: vi.fn() }));
vi.mock("@/lib/account/actions", () => ({ saveProfilePhoto: savePhoto, saveProfilePhotoVisibility: saveVisibility }));
vi.mock("next/image", () => ({ default: ({ src, style }: { src: string; style?: CSSProperties }) => <span data-photo-source={src} style={style} /> }));
afterEach(() => {
  cleanup();
  savePhoto.mockClear();
  saveVisibility.mockClear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
});

function dragPhoto(preview: HTMLElement, dx: number, dy: number) {
  Object.defineProperty(preview, "setPointerCapture", { configurable: true, value: vi.fn() });
  fireEvent(preview, new MouseEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }));
  fireEvent(preview, new MouseEvent("pointermove", { bubbles: true, clientX: 10 + dx, clientY: 10 + dy }));
  fireEvent.pointerUp(preview);
}

test.each([128, 224, 256])("dragging scales correctly in a %ipx crop preview", (width) => {
  render(<ProfilePhotoCard accountId="photo-owner" initials="CP" fullName="Chris Prior" email="owner@example.test" initialAvatarUrl="/photo.webp" />);
  fireEvent.click(screen.getAllByRole("button", { name: "Adjust profile photo" })[1]);
  const preview = screen.getByLabelText("Photo crop preview");
  Object.defineProperty(preview, "clientWidth", { configurable: true, value: width });
  dragPhoto(preview, width / 4, width / 8);
  const image = preview.querySelector<HTMLElement>("[data-photo-source]")!;
  expect(image.style.transform).toBe("translate(25%, 12.5%) scale(1)");
  // Rotation changes only the rendered size, never the selected crop or zoom.
  fireEvent.change(screen.getByRole("slider"), { target: { value: "1.5" } });
  Object.defineProperty(preview, "clientWidth", { configurable: true, value: 256 });
  fireEvent.resize(window);
  expect(image.style.transform).toBe("translate(25%, 12.5%) scale(1.5)");
  dragPhoto(preview, 16, 0);
  expect(image.style.transform).toBe("translate(31.25%, 12.5%) scale(1.5)");
  expect(savePhoto).not.toHaveBeenCalled();
});

function mockPhotoExport() {
  vi.stubGlobal("Image", class {
    src = "";
    naturalWidth = 1000;
    naturalHeight = 500;
    decode = () => Promise.resolve();
  });
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(callback => callback(new Blob(["cropped"], { type: "image/webp" })));
  return drawImage;
}

test("saving after a small-screen drag exports the crop shown in the preview", async () => {
  const drawImage = mockPhotoExport();
  savePhoto.mockResolvedValue({ ok: true, publicUrl: "/cropped.webp" });
  render(<ProfilePhotoCard accountId="photo-owner" initials="CP" fullName="Chris Prior" email="owner@example.test" initialAvatarUrl="/photo.webp" />);
  const trigger = screen.getAllByRole("button", { name: "Adjust profile photo" })[1];
  fireEvent.click(trigger);
  const preview = screen.getByLabelText("Photo crop preview");
  Object.defineProperty(preview, "clientWidth", { value: 128 });
  dragPhoto(preview, 32, 16);
  fireEvent.change(screen.getByRole("slider"), { target: { value: "1.5" } });
  fireEvent.click(screen.getByRole("button", { name: "Save photo" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(drawImage.mock.calls[0].slice(1)).toEqual([-384, -64, 1536, 768]);
  expect(savePhoto).toHaveBeenCalledTimes(1);
  expect(document.activeElement).toBe(trigger);
});

test("blocked legacy storage cannot turn a confirmed photo save into a failure", async () => {
  localStorage.setItem("zero-loss-profile-photo", "data:image/png;base64,cGhvdG8=");
  mockPhotoExport();
  savePhoto.mockResolvedValueOnce({ ok: true, publicUrl: "/saved.webp" });
  const remove = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Storage blocked"); });
  const updated = vi.fn();
  window.addEventListener("zero-loss-avatar-updated", updated);
  try {
    render(<ProfilePhotoCard accountId="photo-owner" initials="CP" fullName="Chris" email="" initialAvatarUrl={null} />);
    fireEvent.click(await screen.findByRole("button", { name: "Review photo saved on this device" }));
    fireEvent.click(screen.getByRole("button", { name: "Save photo" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(remove).toHaveBeenCalled();
    expect(savePhoto).toHaveBeenCalledOnce();
    expect(updated).toHaveBeenCalledOnce();
    const avatar = (updated.mock.calls[0][0] as CustomEvent).detail.photo;
    expect(avatar).toMatch(/^\/saved\.webp\?v=/);
    expect(screen.getByRole("article").querySelector("[data-photo-source]")?.getAttribute("data-photo-source")).toBe(avatar);
    expect(screen.queryByRole("alert")).toBeNull();
  } finally {
    window.removeEventListener("zero-loss-avatar-updated", updated);
  }
});

test("an unowned device photo stays local until explicitly reviewed and saved", async () => {
  const stored = "data:image/png;base64,cGhvdG8=";
  localStorage.setItem("zero-loss-profile-photo", stored);
  localStorage.setItem("zero-loss-profile-photo-crop", '{"x":12,"y":0,"zoom":1.5}');
  mockPhotoExport();
  savePhoto.mockResolvedValueOnce({ ok: true, publicUrl: "/saved.webp" });
  render(<ProfilePhotoCard accountId="other-account" initials="OA" fullName="Other account" email="" initialAvatarUrl={null} />);
  const review = await screen.findByRole("button", { name: "Review photo saved on this device" });
  expect(document.querySelector("[data-photo-source]")).toBeNull();
  expect(savePhoto).not.toHaveBeenCalled();
  fireEvent.click(review);
  expect(screen.getByRole("slider")).toHaveProperty("value", "1.5");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(localStorage.getItem("zero-loss-profile-photo")).toBe(stored);
  expect(savePhoto).not.toHaveBeenCalled();
  fireEvent.click(review);
  fireEvent.click(screen.getByRole("button", { name: "Save photo" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(savePhoto).toHaveBeenCalledOnce();
  expect(savePhoto.mock.calls[0][0].get("profile_owner")).toBe("other-account");
});

test.each(["success", "failure"])("a late %s from a previous edit leaves the reopened crop intact", async outcome => {
  mockPhotoExport();
  let finish!: (result: { ok: true; publicUrl: string } | { ok: false; message: string }) => void;
  savePhoto.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  render(<ProfilePhotoCard accountId="photo-owner" initials="CP" fullName="Chris" email="" initialAvatarUrl="/original.webp" />);
  const trigger = screen.getAllByRole("button", { name: "Adjust profile photo" })[0];
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("button", { name: "Save photo" }));
  await waitFor(() => expect(savePhoto).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(trigger);
  fireEvent.change(screen.getByRole("slider"), { target: { value: "2" } });
  await act(async () => finish(outcome === "success" ? { ok: true, publicUrl: "/first-save.webp" } : { ok: false, message: "Previous save failed" }));
  expect(screen.getByRole("slider")).toHaveProperty("value", "2");
  expect(screen.getByRole("button", { name: "Save photo" })).toHaveProperty("disabled", false);
  expect(screen.getByLabelText("Photo crop preview").querySelector("[data-photo-source]")?.getAttribute("data-photo-source")).toBe("/original.webp");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(savePhoto).toHaveBeenCalledOnce();
});

test.each([0, 1])("Escape closes the editor without saving and restores photo button %i", (index) => {
  document.body.style.overflow = "clip";
  document.documentElement.style.overflow = "auto";
  render(<ProfilePhotoCard accountId="photo-owner" initials="CP" fullName="Chris Prior" email="owner@example.test" initialAvatarUrl="/photo.webp" />);
  const trigger = screen.getAllByRole("button", { name: "Adjust profile photo" })[index];
  fireEvent.click(trigger);
  const slider = screen.getByRole("slider", { name: "Photo size" });
  expect(document.activeElement).toBe(slider);
  expect(document.body.style.overflow).toBe("hidden");
  expect(document.documentElement.style.overflow).toBe("hidden");
  fireEvent.change(slider, { target: { value: "2.5" } });
  fireEvent.keyDown(slider, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(document.body.style.overflow).toBe("clip");
  expect(document.documentElement.style.overflow).toBe("auto");
  expect(savePhoto).not.toHaveBeenCalled();
  fireEvent.click(trigger);
  expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("1");
});

test("Tab wraps both directions and focus cannot move into the page behind the editor", () => {
  render(<ProfilePhotoCard accountId="photo-owner" initials="CP" fullName="Chris Prior" email="owner@example.test" initialAvatarUrl="/photo.webp" initialVisibility={{ menu: true, crew: true }} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Adjust profile photo" })[1]);
  const slider = screen.getByRole("slider");
  const last = screen.getByRole("button", { name: "Choose a different photo" });
  fireEvent.keyDown(slider, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(last);
  fireEvent.keyDown(last, { key: "Tab" });
  expect(document.activeElement).toBe(slider);
  screen.getByRole("checkbox", { name: /Show my photo in the account menu/ }).focus();
  expect(document.activeElement).toBe(slider);
  expect(savePhoto).not.toHaveBeenCalled();
});

test("Cancel discards a zoom change, restores focus, and releases the background", () => {
  render(<ProfilePhotoCard accountId="photo-owner" initials="CP" fullName="Chris Prior" email="owner@example.test" initialAvatarUrl="/photo.webp" initialVisibility={{ menu: true, crew: true }} />);
  const trigger = screen.getAllByRole("button", { name: "Adjust profile photo" })[1];
  fireEvent.click(trigger);
  fireEvent.change(screen.getByRole("slider"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(document.activeElement).toBe(trigger);
  const checkbox = screen.getByRole("checkbox", { name: /Show my photo in the account menu/ });
  checkbox.focus();
  expect(document.activeElement).toBe(checkbox);
  fireEvent.click(trigger);
  expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("1");
  expect(savePhoto).not.toHaveBeenCalled();
});

test("a new photo chosen asynchronously returns to the Add photo button on Escape", async () => {
  render(<ProfilePhotoCard accountId="photo-owner" initials="CP" fullName="Chris Prior" email="owner@example.test" initialAvatarUrl={null} />);
  const trigger = screen.getAllByRole("button", { name: "Add profile photo" })[1];
  fireEvent.click(trigger);
  const fileInput = screen.getByLabelText("Choose a profile photo");
  fileInput.focus();
  fireEvent.change(fileInput, { target: { files: [new File(["image"], "avatar.png", { type: "image/png" })] } });
  const dialog = await screen.findByRole("dialog");
  expect(document.activeElement).toBe(within(dialog).getByRole("slider"));
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(document.activeElement).toBe(trigger);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(savePhoto).not.toHaveBeenCalled();
});

test("a refreshed account updates the saved photo and both settings while leaving an open crop alone", () => {
  const card = (url: string | null, visible: boolean) => (
    <ProfilePhotoCard accountId="photo-owner" initials="CP" fullName="Chris Prior" email="owner@example.test"
      initialAvatarUrl={url} initialVisibility={{ menu: visible, crew: visible }} />
  );
  const { rerender } = render(card("/original.webp", true));
  const trigger = screen.getAllByRole("button", { name: "Adjust profile photo" })[0];
  fireEvent.click(trigger);
  const preview = screen.getByLabelText("Photo crop preview");
  Object.defineProperty(preview, "clientWidth", { value: 256 });
  dragPhoto(preview, 64, 32);
  fireEvent.change(screen.getByRole("slider"), { target: { value: "2" } });

  rerender(card("/updated.webp", false));
  expect(trigger.querySelector("[data-photo-source]")?.getAttribute("data-photo-source")).toBe("/updated.webp");
  for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).toHaveProperty("checked", false);
  const draft = preview.querySelector<HTMLElement>("[data-photo-source]")!;
  expect(draft.dataset.photoSource).toBe("/original.webp");
  expect(draft.style.transform).toBe("translate(25%, 12.5%) scale(2)");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(trigger);
  expect(screen.getByLabelText("Photo crop preview").querySelector("[data-photo-source]")?.getAttribute("data-photo-source")).toBe("/updated.webp");
  expect(screen.getByRole("slider")).toHaveProperty("value", "1");
  expect(savePhoto).not.toHaveBeenCalled();
  expect(saveVisibility).not.toHaveBeenCalled();
});

test("a failed visibility save uses the newest account settings after a refresh during the request", async () => {
  let reply!: (value: { ok: false; message: string }) => void;
  saveVisibility.mockReturnValueOnce(new Promise(resolve => { reply = resolve; }));
  const card = (visible: boolean) => <ProfilePhotoCard accountId="photo-owner" initials="CP" fullName="Chris Prior" email="owner@example.test"
    initialAvatarUrl="/photo.webp" initialVisibility={{ menu: visible, crew: visible }} />;
  const { rerender } = render(card(true));
  const menu = screen.getByRole("checkbox", { name: /account menu/ });
  fireEvent.click(menu);
  rerender(card(false));
  expect(screen.getByRole("checkbox", { name: /My Crew/ })).toHaveProperty("checked", false);
  reply({ ok: false, message: "Could not save." });
  await screen.findByRole("alert");
  expect(menu).toHaveProperty("checked", false);
  expect(menu).toHaveProperty("disabled", false);
  expect(saveVisibility).toHaveBeenCalledOnce();
});

test("replacing the draft keeps the editor active and unmounting releases its keyboard and scroll locks", async () => {
  const { unmount } = render(<ProfilePhotoCard accountId="photo-owner" initials="CP" fullName="Chris Prior" email="owner@example.test" initialAvatarUrl="/photo.webp" />);
  fireEvent.click(screen.getAllByRole("button", { name: "Adjust profile photo" })[1]);
  const replace = screen.getByRole("button", { name: "Choose a different photo" });
  replace.focus();
  fireEvent.click(replace);
  fireEvent.change(screen.getByLabelText("Choose a profile photo"), { target: { files: [new File(["new image"], "replacement.png", { type: "image/png" })] } });
  await waitFor(() => expect(screen.getByRole("dialog").querySelector('[data-photo-source^="data:"]')).toBeTruthy());
  expect(document.activeElement).toBe(replace);
  fireEvent.keyDown(replace, { key: "Tab" });
  expect(document.activeElement).toBe(screen.getByRole("slider"));
  unmount();
  expect(document.body.style.overflow).toBe("");
  expect(document.documentElement.style.overflow).toBe("");
  expect(fireEvent.keyDown(document, { key: "Escape" })).toBe(true);
  expect(savePhoto).not.toHaveBeenCalled();
});

test("compact profile preserves stored name casing and the saved photo without writing", () => {
  render(<ProfilePhotoCard accountId="photo-owner" compact initials="CP" fullName="Chris de la Cruz" email="Test.Email@example.com" initialAvatarUrl="https://example.com/saved-avatar.webp" />);
  expect(screen.getByRole("heading", { name: "Chris de la Cruz" })).toBeTruthy();
  expect(screen.getByText("Test.Email@example.com")).toBeTruthy();
  expect(document.querySelector('[data-photo-source="https://example.com/saved-avatar.webp"]')).toBeTruthy();
  fireEvent.click(screen.getAllByRole("button", { name: "Adjust profile photo" })[0]);
  expect(screen.getByRole("dialog", { name: "Adjust your photo" }).parentElement).toBe(document.body);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(savePhoto).not.toHaveBeenCalled();
});

test("the menu checkbox updates the round header photo immediately and saves independently of Crew", async () => {
  let finishSave: (value: { ok: boolean }) => void = () => {};
  saveVisibility.mockReturnValue(new Promise((resolve) => { finishSave = resolve; }));
  const changed = vi.fn();
  window.addEventListener("zero-loss-photo-menu-visibility", changed);
  try {
    render(<ProfilePhotoCard accountId="photo-owner" compact initials="CP" fullName="Chris Prior" email="owner@example.test" initialAvatarUrl="/photo.webp" initialVisibility={{ menu: true, crew: true }} />);
    const menu = screen.getByRole("checkbox", { name: /Show my photo in the account menu/ }) as HTMLInputElement;
    const crew = screen.getByRole("checkbox", { name: /Show my photo to My Crew/ }) as HTMLInputElement;
    fireEvent.click(menu);
    expect(menu.checked).toBe(false);
    expect(crew.checked).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
    expect((changed.mock.calls[0][0] as CustomEvent).detail).toEqual({ enabled: false });
    expect(saveVisibility).toHaveBeenCalledWith("menu", false);
    finishSave({ ok: true });
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Photo choice saved."));
  } finally {
    window.removeEventListener("zero-loss-photo-menu-visibility", changed);
  }
});

test("a failed menu setting restores the previous visible photo", async () => {
  saveVisibility.mockResolvedValue({ ok: false, message: "Could not save." });
  const changed = vi.fn();
  window.addEventListener("zero-loss-photo-menu-visibility", changed);
  try {
    render(<ProfilePhotoCard accountId="photo-owner" compact initials="CP" fullName="Chris Prior" email="owner@example.test" initialAvatarUrl="/photo.webp" initialVisibility={{ menu: true, crew: false }} />);
    const menu = screen.getByRole("checkbox", { name: /Show my photo in the account menu/ }) as HTMLInputElement;
    fireEvent.click(menu);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Could not save."));
    expect(menu.checked).toBe(true);
    expect(changed.mock.calls.map(([event]) => (event as CustomEvent).detail.enabled)).toEqual([false, true]);
  } finally {
    window.removeEventListener("zero-loss-photo-menu-visibility", changed);
  }
});
