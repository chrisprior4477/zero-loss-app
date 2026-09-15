import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProfilePhotoCard } from "./ProfilePhotoCard";

const { savePhoto } = vi.hoisted(() => ({ savePhoto: vi.fn() }));
vi.mock("@/lib/account/actions", () => ({ saveProfilePhoto: savePhoto }));
vi.mock("next/image", () => ({ default: ({ src }: { src: string }) => <span data-photo-source={src} /> }));
afterEach(() => { cleanup(); savePhoto.mockClear(); });

test("compact profile preserves stored name casing and the saved photo without writing", () => {
  render(<ProfilePhotoCard compact initials="CP" fullName="Chris de la Cruz" email="Test.Email@example.com" initialAvatarUrl="https://example.com/saved-avatar.webp" />);
  expect(screen.getByRole("heading", { name: "Chris de la Cruz" })).toBeTruthy();
  expect(screen.getByText("Test.Email@example.com")).toBeTruthy();
  expect(document.querySelector('[data-photo-source="https://example.com/saved-avatar.webp"]')).toBeTruthy();
  fireEvent.click(screen.getAllByRole("button", { name: "Adjust profile photo" })[0]);
  expect(screen.getByRole("dialog", { name: "Adjust your photo" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(savePhoto).not.toHaveBeenCalled();
});
