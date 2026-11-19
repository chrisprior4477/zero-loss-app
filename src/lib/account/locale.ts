export function accountLocale(value?: string | null) {
  return value === "es-US" || value === "en-GB" ? value : "en-US";
}

export function accountLanguage(locale?: string | null) {
  return (english: string, spanish: string) => accountLocale(locale) === "es-US" ? spanish : english;
}
