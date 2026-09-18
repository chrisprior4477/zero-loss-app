"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxPhotoBytes = 5 * 1024 * 1024;

export type SaveProfilePhotoResult =
  | { ok: true; publicUrl: string }
  | { ok: false; message: string };

export type SaveProfileDetailsResult =
  | { status: "idle" }
  | { status: "succeeded"; message: string }
  | { status: "error"; message: string };

const supportedLocales = new Set(["en-US", "en-GB", "es-US"]);
const supportedTimezones = new Set(["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix", "Pacific/Honolulu"]);

function textField(formData: FormData, name: string, maxLength: number) {
  const value = formData.get(name);
  if (typeof value !== "string") throw new Error("Profile form is incomplete.");
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error("One or more profile fields are too long.");
  return trimmed;
}

export async function saveProfileDetails(
  _previous: SaveProfileDetailsResult,
  formData: FormData,
): Promise<SaveProfileDetailsResult> {
  let updates: Record<string, string | null>;
  try {
    const displayName = textField(formData, "display_name", 100);
    const phoneNumber = textField(formData, "phone_number", 32);
    const addressLine1 = textField(formData, "address_line_1", 200);
    const addressLine2 = textField(formData, "address_line_2", 200);
    const city = textField(formData, "city", 100);
    const region = textField(formData, "region", 100);
    const postalCode = textField(formData, "postal_code", 24);
    const countryInput = textField(formData, "country", 100);
    const preferredLocale = textField(formData, "preferred_locale", 20);
    const timezone = textField(formData, "timezone", 64);
    if (displayName.length < 2) throw new Error("Enter the name you want displayed on your account.");
    if (phoneNumber && (!/^[0-9+().\-\s]{7,32}$/.test(phoneNumber) || phoneNumber.replace(/\D/g, "").length < 7)) {
      throw new Error("Enter a valid phone number, or leave it blank.");
    }
    const hasAddress = [addressLine1, addressLine2, city, region, postalCode].some(Boolean);
    if (hasAddress && (!addressLine1 || !city || !region || !postalCode || !countryInput)) {
      throw new Error("Complete the street, city, state or region, postal code, and country for your mailing address.");
    }
    if (!supportedLocales.has(preferredLocale) || !supportedTimezones.has(timezone)) {
      throw new Error("Choose a supported language and time zone.");
    }
    updates = {
      display_name: displayName,
      phone_number: phoneNumber || null,
      address_line_1: hasAddress ? addressLine1 : null,
      address_line_2: hasAddress ? addressLine2 || null : null,
      city: hasAddress ? city : null,
      region: hasAddress ? region : null,
      postal_code: hasAddress ? postalCode : null,
      country: hasAddress ? countryInput : null,
      preferred_locale: preferredLocale,
      timezone,
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

  const reference = `${user.id}/avatar.webp`;
  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(reference, photo, { contentType: "image/webp", upsert: true });
  if (uploadError) {
    return { ok: false, message: `Photo upload failed: ${uploadError.message}` };
  }

  const { error: profileError } = await supabase.rpc("update_customer_profile_preferences", {
    p_updates: { avatar_reference: reference },
  });
  if (profileError) {
    await supabase.storage.from("profile-photos").remove([reference]);
    return { ok: false, message: `Photo saved, but the profile could not be updated: ${profileError.message}` };
  }

  revalidatePath("/account");
  revalidatePath("/account/profile");
  const publicUrl = supabase.storage.from("profile-photos").getPublicUrl(reference).data.publicUrl;
  return { ok: true, publicUrl };
}
