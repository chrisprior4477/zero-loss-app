export const profileFields = [
  "display_name", "legal_first_name", "legal_last_name", "date_of_birth", "phone_number",
  "address_line_1", "address_line_2", "city", "region", "postal_code", "country", "preferred_locale", "timezone",
] as const;
export type ProfileField = typeof profileFields[number];
export type ProfileSavedFields = Record<ProfileField, string | null>;
export type ProfileEditBaseline = { fields: Record<ProfileField, string>; saved: ProfileSavedFields };
const addressFields: readonly ProfileField[] = ["address_line_1", "address_line_2", "city", "region", "postal_code", "country", "timezone"];

export function profileEditBaseline(fields: ProfileSavedFields, saved = fields): ProfileEditBaseline {
  return { fields: Object.fromEntries(profileFields.map(key => [key, fields[key] ?? ""])) as ProfileEditBaseline["fields"], saved: { ...saved } };
}

export function readProfileBaseline(value: FormDataEntryValue | null): ProfileEditBaseline {
  if (typeof value !== "string" || value.length > 12_000) throw new Error("Refresh Profile before saving this older form. Your saved details have not changed.");
  let baseline: ProfileEditBaseline;
  try { baseline = JSON.parse(value); } catch { throw new Error("Refresh Profile before saving this older form. Your saved details have not changed."); }
  if (!baseline || !baseline.fields || !baseline.saved || !profileFields.every(key => typeof baseline.fields[key] === "string" && (baseline.saved[key] === null || typeof baseline.saved[key] === "string"))) {
    throw new Error("Refresh Profile before saving this older form. Your saved details have not changed.");
  }
  return baseline;
}

export function profilePatch(updates: ProfileSavedFields, form: FormData, baseline: ProfileEditBaseline) {
  const changed = profileFields.filter(key => {
    // A resolved zone has no visible input. Recalculate it only with its address.
    if (key === "timezone" && !form.has(key)) return false;
    return String(form.get(key) ?? "").trim() !== baseline.fields[key].trim();
  });
  // An address and its derived zone are one validated unit, never a mix of two drafts.
  if (changed.some(key => addressFields.includes(key))) {
    for (const key of addressFields) if (!changed.includes(key)) changed.push(key);
  }
  const patch = Object.fromEntries(changed.map(key => [key, updates[key]])) as Partial<ProfileSavedFields>;
  const expected = Object.fromEntries(changed.map(key => [key, baseline.saved[key]]));
  return { patch, expected };
}
