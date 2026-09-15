"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxPhotoBytes = 5 * 1024 * 1024;

export type SaveProfilePhotoResult =
  | { ok: true; publicUrl: string }
  | { ok: false; message: string };

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
