import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProfilePhotoCard } from "./ProfilePhotoCard";

const { savePhoto, saveVisibility } = vi.hoisted(() => ({ savePhoto: vi.fn(), saveVisibility: vi.fn() }));
vi.mock("@/lib/account/actions", () => ({ saveProfilePhoto: savePhoto, saveProfilePhotoVisibility: saveVisibility }));
vi.mock("next/image", () => ({ default: ({ src }: { src: string }) => <span data-photo-source={src} /> }));
afterEach(() => { cleanup(); savePhoto.mockClear(); saveVisibility.mockClear(); });

test("compact profile preserves stored name casing and the saved photo without writing", () => {
  render(<ProfilePhotoCard compact initials="CP" fullName="Chris de la Cruz" email="Test.Email@example.com" initialAvatarUrl="https://example.com/saved-avatar.webp" />);
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
    render(<ProfilePhotoCard compact initials="CP" fullName="Chris Prior" email="owner@example.test" initialAvatarUrl="/photo.webp" initialVisibility={{ menu: true, crew: true }} />);
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
    render(<ProfilePhotoCard compact initials="CP" fullName="Chris Prior" email="owner@example.test" initialAvatarUrl="/photo.webp" initialVisibility={{ menu: true, crew: false }} />);
    const menu = screen.getByRole("checkbox", { name: /Show my photo in the account menu/ }) as HTMLInputElement;
    fireEvent.click(menu);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Could not save."));
    expect(menu.checked).toBe(true);
    expect(changed.mock.calls.map(([event]) => (event as CustomEvent).detail.enabled)).toEqual([false, true]);
  } finally {
    window.removeEventListener("zero-loss-photo-menu-visibility", changed);
  }
});
