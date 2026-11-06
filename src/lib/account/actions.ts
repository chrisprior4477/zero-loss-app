"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAtLeastAge, MIN_ACCOUNT_AGE_YEARS } from "@/lib/auth/validation";
import { addressTimeZone, countryTimeZones } from "./address-timezone";
import { missingAddressFields } from "./address-requirements";
import { DEFAULT_TIME_ZONE, safeTimeZone } from "./timezone";

const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxPhotoBytes = 5 * 1024 * 1024;

export type SaveProfilePhotoResult =
  | { ok: true; publicUrl: string }
  | { ok: false; message: string };

export type PhotoVisibilitySurface = "menu" | "crew";
export type SavePhotoVisibilityResult = { ok: true } | { ok: false; message: string };

export type SaveProfileDetailsResult =
  | { status: "idle" }
  | { status: "succeeded"; message: string }
  | { status: "error"; message: string };

const supportedLocales = new Set(["en-US", "en-GB", "es-US"]);

function textField(formData: FormData, name: string, maxLength: number) {
  const value = formData.get(name);
  if (typeof value !== "string") throw new Error("Profile form is incomplete.");
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error("One or more profile fields are too long.");
  return trimmed;
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export async function saveProfileDetails(
  _previous: SaveProfileDetailsResult,
  formData: FormData,
): Promise<SaveProfileDetailsResult> {
  let updates: Record<string, string | null>;
  try {
    const displayName = textField(formData, "display_name", 100);
    const legalFirstName = textField(formData, "legal_first_name", 100);
    const legalLastName = textField(formData, "legal_last_name", 100);
    const dateOfBirth = textField(formData, "date_of_birth", 10);
    const phoneNumber = textField(formData, "phone_number", 32);
    const addressLine1 = textField(formData, "address_line_1", 200);
    const addressLine2 = textField(formData, "address_line_2", 200);
    const city = textField(formData, "city", 100);
    const region = textField(formData, "region", 100);
    const postalCode = textField(formData, "postal_code", 24);
    const countryInput = textField(formData, "country", 100);
    const preferredLocale = textField(formData, "preferred_locale", 20);
    const timezone = typeof formData.get("timezone") === "string" ? textField(formData, "timezone", 64) : "";
    if (displayName.length < 2) throw new Error("Enter the name you want displayed on your account.");
    if (!legalFirstName || !legalLastName) throw new Error("Enter your legal first and last name.");
    if (!isCalendarDate(dateOfBirth) || !isAtLeastAge(dateOfBirth)) {
      throw new Error(`Enter a valid birth date showing that you are at least ${MIN_ACCOUNT_AGE_YEARS}.`);
    }
    if (phoneNumber && (!/^[0-9+().\-\s]{7,32}$/.test(phoneNumber) || phoneNumber.replace(/\D/g, "").length < 7)) {
      throw new Error("Enter a valid phone number, or leave it blank.");
    }
    const hasAddress = [addressLine1, addressLine2, city, region, postalCode].some(Boolean);
    const missing = missingAddressFields({ street: addressLine1, city, region, postalCode, country: countryInput });
    if (hasAddress && missing.length) {
      throw new Error(`Complete the ${missing.join(", ")} for your mailing address in ${countryInput || "your selected country"}.`);
    }
    if (!supportedLocales.has(preferredLocale)) throw new Error("Choose a supported language.");
    const detectedZone = hasAddress ? addressTimeZone(countryInput, region, postalCode) : DEFAULT_TIME_ZONE;
    const allowedZones = hasAddress ? countryTimeZones(countryInput) : [];
    if (hasAddress && !detectedZone && (!timezone || (allowedZones.length ? !allowedZones.includes(timezone) : safeTimeZone(timezone) !== timezone))) {
      throw new Error("Choose your time zone below your country to finish saving your address.");
    }
    updates = {
      display_name: displayName,
      legal_first_name: legalFirstName,
      legal_last_name: legalLastName,
      date_of_birth: dateOfBirth,
      phone_number: phoneNumber || null,
      address_line_1: hasAddress ? addressLine1 : null,
      address_line_2: hasAddress ? addressLine2 || null : null,
      city: hasAddress ? city || null : null,
      region: hasAddress ? region || null : null,
      postal_code: hasAddress ? postalCode || null : null,
      country: hasAddress ? countryInput : null,
      preferred_locale: preferredLocale,
      timezone: detectedZone ?? timezone,
    };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Check the profile details and try again." };
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { status: "error", message: "Your session expired. Sign in again before saving your profile." };
  const { error } = await supabase.rpc("update_customer_profile_preferences", { p_updates: updates });
  if (error) return { status: "error", message: "Your profile could not be saved. Refresh and try again." };
  revalidatePath("/", "layout");
  revalidatePath("/account/profile");
  revalidatePath("/account/security");
  revalidatePath("/account/entries");
  return { status: "succeeded", message: "Your profile information has been updated." };
}

export async function saveProfilePhoto(formData: FormData): Promise<SaveProfilePhotoResult> {
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return { ok: false, message: "Choose a photo before saving." };
  }
  if (!allowedPhotoTypes.has(photo.type)) {
    return { ok: false, message: "Use a JPG, PNG, or WebP image." };
  }
  if (photo.size > maxPhotoBytes) {
    return { ok: false, message: "Profile photos must be smaller than 5 MB." };
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, message: "Your session expired. Sign in again before saving your photo." };
  }

  // Never overwrite the file currently referenced by the profile.
  const reference = `${user.id}/avatar-${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(reference, photo, { contentType: photo.type, upsert: false });
  if (uploadError) {
    return { ok: false, message: `Photo upload failed: ${uploadError.message}` };
  }

  let profileError;
  try {
    ({ error: profileError } = await supabase.rpc("update_customer_profile_preferences", {
      p_updates: { avatar_reference: reference },
    }));
  } catch {
    // A lost response may follow a successful commit. Retain the new file as well.
    return { ok: false, message: "Couldn’t confirm the photo update. Refresh your profile to check before trying again." };
  }
  if (profileError) {
    if (!/^[0-9A-Z]{5}$/.test(profileError.code ?? "")) {
      return { ok: false, message: "Couldn’t confirm the photo update. Refresh your profile to check before trying again." };
    }
    // Only this attempt's unique upload is disposable; previous photos stay intact.
    await supabase.storage.from("profile-photos").remove([reference]).catch(() => undefined);
    return { ok: false, message: "Your photo could not be updated. Your previous photo is unchanged. Please try again." };
  }

  revalidatePath("/account/entries");
  revalidatePath("/account/profile");
  const publicUrl = supabase.storage.from("profile-photos").getPublicUrl(reference).data.publicUrl;
  return { ok: true, publicUrl };
}

export async function saveProfilePhotoVisibility(surface: PhotoVisibilitySurface, enabled: boolean): Promise<SavePhotoVisibilityResult> {
  if ((surface !== "menu" && surface !== "crew") || typeof enabled !== "boolean") {
    return { ok: false, message: "Choose a valid photo setting." };
  }
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Your session expired. Sign in again before changing your photo settings." };

  const { error } = await supabase.rpc("set_profile_photo_visibility", { p_surface: surface, p_enabled: enabled });
  if (error) return { ok: false, message: "Your photo setting could not be saved. Please try again." };
  revalidatePath("/", "layout");
  revalidatePath("/account/profile");
  revalidatePath("/account/crew");
  return { ok: true };
}
