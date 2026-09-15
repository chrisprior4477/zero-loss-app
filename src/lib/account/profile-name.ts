type StoredProfileName = {
  display_name?: string | null;
  legal_first_name?: string | null;
  legal_last_name?: string | null;
};

/** Display saved casing exactly. Never infer a name from an email or recase it. */
export function customerDisplayName(profile: StoredProfileName | null): string {
  if (profile?.display_name?.trim()) return profile.display_name;
  return [profile?.legal_first_name, profile?.legal_last_name].filter(Boolean).join(" ") || "Zero Loss member";
}

export function customerInitials(displayName: string): string {
  return displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "ZL";
}
