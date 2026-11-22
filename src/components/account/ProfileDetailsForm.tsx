"use client";

import { accountLanguage, accountLocale } from "@/lib/account/locale";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useLayoutEffect, useId, useMemo, useRef, useState } from "react";
import { AccountIcon } from "./AccountIcon";
import { saveProfileDetails, type SaveProfileDetailsResult } from "@/lib/account/actions";
import { isAtLeastAge, MIN_ACCOUNT_AGE_YEARS } from "@/lib/auth/validation";
import { PROFILE_COUNTRIES } from "@/lib/account/countries";
import { lookupAddressTimeZone } from "@/lib/account/timezone-lookup-action";
import { addressRequirements, completeMailingAddress } from "@/lib/account/address-requirements";
import { profileAddressFields, profileEditBaseline, profileFields, profileFieldLimits, type ProfileField, type ProfileSavedFields } from "@/lib/account/profile-edit";
import styles from "./profile-editor.module.css";

export type ProfileDetails = {
  displayName: string;
  legalFirstName: string | null;
  legalLastName: string | null;
  dateOfBirth: string | null;
  email: string | null;
  emailConfirmed: boolean;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  preferredLocale: string | null;
  timezone: string | null;
  savedFields?: ProfileSavedFields;
};

function timeZoneLocation(zone: string) {
  return (zone.split("/").at(-1) ?? zone).replaceAll("_", " ");
}

function timeZoneLabel(zone: string) {
  const location = timeZoneLocation(zone);
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longGeneric" }).formatToParts(new Date()).find(part => part.type === "timeZoneName")?.value;
    return name && name !== location ? `${name} · ${location}` : location;
  } catch { return location; }
}

function Field({ label, name, defaultValue, autoComplete, type = "text", placeholder, className, required = false, hint }: {
  label: string; name: ProfileField; defaultValue?: string | null; autoComplete?: string; type?: string; placeholder?: string; className?: string; required?: boolean; hint?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return <div className={`${styles.field} ${className ?? ""}`}>
    <label htmlFor={id}>{label}</label>
    <div className={styles.inputWrap}>
      <input ref={input} id={id} type={type} name={name} maxLength={profileFieldLimits[name]} defaultValue={defaultValue ?? ""} autoComplete={autoComplete} placeholder={placeholder} required={required} />
      <button type="button" className={styles.clearButton} aria-label={`Clear ${label.toLowerCase()}`} onClick={() => { if (input.current) { input.current.value = ""; input.current.dispatchEvent(new Event("input", { bubbles: true })); input.current.focus(); } }}>×</button>
    </div>
    {hint ? <small>{hint}</small> : null}
  </div>;
}

function addressFromForm(data: FormData) {
  return { country: String(data.get("country") ?? ""), region: String(data.get("region") ?? ""), postalCode: String(data.get("postal_code") ?? ""), street: String(data.get("address_line_1") ?? ""), city: String(data.get("city") ?? "") };
}

function splitDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { year: "", month: "", day: "" };
  const [year, month, day] = value.split("-");
  return { year, month: String(Number(month)), day: String(Number(day)) };
}

function daysInMonth(year: string, month: string) {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
}

type BirthParts = ReturnType<typeof splitDate>;

function readBirthParts(data: FormData): BirthParts {
  return { year: String(data.get("birth_year") ?? ""), month: String(data.get("birth_month") ?? ""), day: String(data.get("birth_day") ?? "") };
}

function ProfileDateOfBirth({ defaultValue, defaultParts, onClear, locale }: { defaultValue: string | null; defaultParts?: BirthParts; onClear: () => void; locale: string }) {
  const t = accountLanguage(locale);
  const monthFormat = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  const initial = useMemo(() => defaultParts ?? splitDate(defaultValue), [defaultParts, defaultValue]);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const today = new Date();
  const maximumYear = today.getUTCFullYear() - MIN_ACCOUNT_AGE_YEARS;
  const years = Array.from({ length: 103 }, (_, index) => String(maximumYear - index));
  if (initial.year && !years.includes(initial.year)) years.push(initial.year);
  const maximumDay = daysInMonth(year, month);
  const validDay = Number(day) <= maximumDay ? day : "";
  const dayAllowed = (value: number) => !year || !month || isAtLeastAge(`${year}-${month.padStart(2, "0")}-${String(value).padStart(2, "0")}`);
  const dateValue = year && month && validDay && dayAllowed(Number(validDay)) ? `${year}-${month.padStart(2, "0")}-${validDay.padStart(2, "0")}` : "";
  const clear = () => { setYear(""); setMonth(""); setDay(""); onClear(); };

  return <fieldset className={styles.dateField}>
    <legend>{t("Date of birth", "Fecha de nacimiento")}</legend>
    <div className={styles.dateSelects}>
      <label><span className="sr-only">{t("Birth month", "Mes de nacimiento")}</span><select name="birth_month" aria-label={t("Birth month", "Mes de nacimiento")} value={month} required onChange={event => {
        const next = event.target.value;
        setMonth(next);
        if (Number(day) > daysInMonth(year, next) || (year && next && day && !isAtLeastAge(`${year}-${next.padStart(2, "0")}-${day.padStart(2, "0")}`))) setDay("");
      }}><option value="">{t("Month", "Mes")}</option>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index + 1} disabled={Number(year) === maximumYear && index > today.getUTCMonth()}>{monthFormat.format(new Date(Date.UTC(2000, index, 1)))}</option>)}</select></label>
      <label><span className="sr-only">{t("Birth day", "Día de nacimiento")}</span><select name="birth_day" aria-label={t("Birth day", "Día de nacimiento")} value={validDay} required onChange={event => setDay(event.target.value)}><option value="">{t("Day", "Día")}</option>{Array.from({ length: maximumDay }, (_, index) => index + 1).map(value => <option key={value} value={value} disabled={!dayAllowed(value)}>{value}</option>)}</select></label>
      <label><span className="sr-only">{t("Birth year", "Año de nacimiento")}</span><select name="birth_year" aria-label={t("Birth year", "Año de nacimiento")} value={year} required onChange={event => {
        const next = event.target.value;
        setYear(next);
        if (Number(day) > daysInMonth(next, month) || (next && month && day && !isAtLeastAge(`${next}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`))) setDay("");
      }}><option value="">{t("Year", "Año")}</option>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <button type="button" className={styles.clearButton} aria-label={t("Clear date of birth", "Borrar fecha de nacimiento")} onClick={clear}>×</button>
    </div>
    {year && month && validDay && !dateValue ? <small role="alert">{t("Choose a date of birth that meets the age requirement.", "Elige una fecha de nacimiento que cumpla el requisito de edad.")}</small> : null}
    <input type="hidden" name="date_of_birth" value={dateValue} />
    <small>{t("On a phone, these open your device’s native scrolling selectors.", "En un teléfono, estos campos abren los selectores del dispositivo.")}</small>
  </fieldset>;
}

async function saveProfile(previous: SaveProfileDetailsResult, formData: FormData): Promise<SaveProfileDetailsResult> {
  try {
    return await saveProfileDetails(previous, formData);
  } catch {
    return { status: "error", message: "We couldn’t confirm your profile changes. Your details are still here. Please try saving again." };
  }
}

export function ProfileDetailsForm({ details, ticket = false, ownerId }: { details: ProfileDetails; ticket?: boolean; ownerId?: string }) {
  const draftKey = ownerId ? `zero-loss:profile-draft:${ownerId}` : null;
  const [recoveredDate, setRecoveredDate] = useState<string | null>();
  const [recoveredBirthParts, setRecoveredBirthParts] = useState<BirthParts>();
  const [hasRecovered, setHasRecovered] = useState(false);
  const didRestore = useRef(false);
  const [locale, setLocale] = useState(() => accountLocale(details.preferredLocale));
  const t = accountLanguage(locale);
  const [showFeedback, setShowFeedback] = useState(false);
  const [baseline, setBaseline] = useState(() => profileEditBaseline({
    display_name: details.displayName, legal_first_name: details.legalFirstName, legal_last_name: details.legalLastName,
    date_of_birth: details.dateOfBirth, phone_number: details.phone, address_line_1: details.addressLine1,
    address_line_2: details.addressLine2, city: details.city, region: details.region, postal_code: details.postalCode,
    country: details.country ?? "United States", preferred_locale: details.preferredLocale ?? "en-US", timezone: details.timezone,
  }, details.savedFields));
  const [state, action, pending] = useActionState(async (previous: SaveProfileDetailsResult, data: FormData) => {
    const result = await saveProfile(previous, data);
    if (result.status === "succeeded" && result.appliedFields) {
      setHasRecovered(false);
      if (draftKey && !addressLookupFailed) {
        try { sessionStorage.removeItem(draftKey); } catch { /* Tab storage is optional. */ }
      }
      if (result.appliedFields.preferred_locale) setLocale(accountLocale(result.appliedFields.preferred_locale));
      setBaseline(previous => ({
        fields: Object.fromEntries(profileFields.map(key => [key, data.has(key) ? String(data.get(key) ?? "") : previous.fields[key]])) as typeof previous.fields,
        saved: { ...previous.saved, ...result.appliedFields },
      }));
    }
    return result;
  }, { status: "idle" });
  const saveFeedback = useRef<HTMLParagraphElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    function isDirty() {
      if (!form.current) return false;
      const data = new FormData(form.current);
      return profileFields.some(key => data.has(key) && String(data.get(key) ?? "").trim() !== baseline.fields[key].trim())
        || JSON.stringify(readBirthParts(data)) !== JSON.stringify(splitDate(baseline.fields.date_of_birth));
    }
    function confirmUnload(event: BeforeUnloadEvent) {
      if (!isDirty()) return;
      event.preventDefault();
      event.returnValue = true;
    }
    function confirmSectionChange(event: MouseEvent) {
      if (!form.current || event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || (link.target && link.target !== "_self") || link.origin !== window.location.origin || link.pathname === window.location.pathname) return;
      if (!isDirty()) return;
      if (!window.confirm("You have unsaved profile changes. Leave this section and discard them?")) event.preventDefault();
      else if (draftKey) {
        try { sessionStorage.removeItem(draftKey); } catch { /* Tab storage is optional. */ }
      }
    }
    document.addEventListener("click", confirmSectionChange, true);
    function confirmTraversal(event: Event) {
      if ((event as Event & { navigationType?: string }).navigationType !== "traverse" || !event.cancelable || !isDirty()) return;
      if (!window.confirm("Leave Profile? Your unsaved edits will be kept for a short time in this tab.")) event.preventDefault();
    }
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    navigation?.addEventListener("navigate", confirmTraversal);
    window.addEventListener("beforeunload", confirmUnload);
    return () => {
      document.removeEventListener("click", confirmSectionChange, true);
      window.removeEventListener("beforeunload", confirmUnload);
      navigation?.removeEventListener("navigate", confirmTraversal);
    };
  }, [baseline, draftKey]);
  useEffect(() => {
    if (showFeedback && !pending && state.status === "error" && document.activeElement === document.body) {
      saveFeedback.current?.focus();
    }
  }, [showFeedback, pending, state]);
  const selectedCountry = details.country ?? "United States";
  const hasNonStandardCountry = !PROFILE_COUNTRIES.some(country => country === selectedCountry);
  const [address, setAddress] = useState({ country: selectedCountry, region: details.region ?? "", postalCode: details.postalCode ?? "", street: details.addressLine1 ?? "", city: details.city ?? "" });
  const [addressLine2, setAddressLine2] = useState(details.addressLine2 ?? "");
  const [selectedZone, setSelectedZone] = useState(details.timezone ?? "");
  const [lookup, setLookup] = useState<{ key: string; zone: string | null; options: string[]; failed?: boolean } | null>(null);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  function rememberDraft(element: HTMLFormElement) {
    if (!draftKey || !element.isConnected) return;
    const data = new FormData(element);
    const addressExpected = profileAddressFields.some(key => data.has(key) && String(data.get(key) ?? "").trim() !== baseline.fields[key].trim())
      ? Object.fromEntries(profileAddressFields.map(key => [key, baseline.saved[key]])) : undefined;
    const changes = profileFields.flatMap(key => {
      const value = data.get(key);
      return typeof value === "string" && value.trim() !== baseline.fields[key].trim()
        ? [{ key, value, saved: baseline.saved[key] }] : [];
    });
    try {
      const parts = readBirthParts(data);
      const birth = JSON.stringify(parts) !== JSON.stringify(splitDate(baseline.fields.date_of_birth))
        ? { ...parts, saved: baseline.saved.date_of_birth } : undefined;
      if (changes.length || birth) sessionStorage.setItem(draftKey, JSON.stringify({ until: Date.now() + 900_000, changes, addressExpected, birth }));
      else sessionStorage.removeItem(draftKey);
    } catch { /* Tab storage is optional. */ }
  }
  useLayoutEffect(() => {
    const element = form.current;
    if (!draftKey || !element || didRestore.current) return;
    didRestore.current = true;
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) ?? "null");
      if (!draft || !Number.isFinite(draft.until) || draft.until <= Date.now() || !Array.isArray(draft.changes)) {
        sessionStorage.removeItem(draftKey);
        return;
      }
      const saved: Partial<ProfileSavedFields> = {};
      const birth = draft.birth;
      if (birth && (birth.saved === null || typeof birth.saved === "string")
        && [birth.month, birth.day, birth.year].every(part => typeof part === "string" && /^[0-9]{0,4}$/.test(part))) {
        // Restore the partial date from this browser tab after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecoveredBirthParts({ month: birth.month, day: birth.day, year: birth.year });
        saved.date_of_birth = birth.saved;
      }
      for (const key of profileAddressFields) {
        const expected = draft.addressExpected?.[key];
        if (expected === null || typeof expected === "string") saved[key] = expected;
      }
      for (const { key, value, saved: expected } of draft.changes) {
        if (!profileFields.includes(key) || typeof value !== "string" || !(expected === null || typeof expected === "string")) continue;
        saved[key as ProfileField] = expected;
        if (key === "date_of_birth") { setRecoveredDate(value); continue; }
        if (key === "timezone") { setSelectedZone(value); continue; }
        const field = element.elements.namedItem(key);
        if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) field.value = value;
      }
      const data = new FormData(element);
      setAddress(addressFromForm(data));
      setAddressLine2(String(data.get("address_line_2") ?? ""));
      setBaseline(current => ({ ...current, saved: { ...current.saved, ...saved } }));
      setHasRecovered(true);
    } catch { /* An unreadable draft never blocks Profile. */ }
  }, [draftKey]);
  const completeAddress = completeMailingAddress(address);
  const addressChanged = [
    [address.country, baseline.fields.country], [address.region, baseline.fields.region],
    [address.postalCode, baseline.fields.postal_code], [address.street, baseline.fields.address_line_1],
    [address.city, baseline.fields.city], [addressLine2, baseline.fields.address_line_2],
  ].some(([value, original]) => value.trim() !== original.trim());
  const requiredFields = addressRequirements(address.country)?.required ?? "AC";
  const lookupKey = JSON.stringify([address.country, address.region, address.postalCode]);
  useEffect(() => {
    if (!completeAddress) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void lookupAddressTimeZone(address.country, address.region, address.postalCode).then(result => {
        if (!cancelled) setLookup({ key: lookupKey, ...result });
      }).catch(() => { if (!cancelled) setLookup({ key: lookupKey, zone: null, options: [], failed: true }); });
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [address.country, address.region, address.postalCode, completeAddress, lookupKey, lookupAttempt]);
  const currentLookup = completeAddress && lookup?.key === lookupKey ? lookup : null;
  const retryLookup = useRef(false);
  const lookupFeedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!retryLookup.current || !currentLookup) return;
    retryLookup.current = false;
    if (document.activeElement === document.body) lookupFeedback.current?.focus();
  }, [currentLookup]);
  const addressLookupFailed = addressChanged && completeAddress && currentLookup?.failed === true;
  const fallbackZones = currentLookup && !currentLookup.zone ? currentLookup.options : [];
  // Dispatch the action ourselves so React's automatic form reset cannot discard
  // the draft when the server returns a validation error. Native validation stays.
  return <form ref={form} action={action} onSubmit={event => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    if (addressLookupFailed) {
      for (const field of profileAddressFields) data.set(field, baseline.fields[field]);
    }
    if (!data.get("date_of_birth")) {
      event.currentTarget.querySelector<HTMLSelectElement>('[name="birth_day"]')?.focus();
      return;
    }
    if (data.get("timezone") === "") data.delete("timezone");
    setShowFeedback(true);
    startTransition(() => action(data));
  }} className={`${styles.form} ${ticket ? styles.ticketForm : ""}`} aria-label={t("Edit profile", "Editar perfil")} onChange={() => setShowFeedback(false)} onInput={event => {
    setShowFeedback(false);
    const data = new FormData(event.currentTarget);
    const element = event.currentTarget;
    queueMicrotask(() => rememberDraft(element));
    const next = addressFromForm(data);
    if (next.country !== address.country || next.region !== address.region || next.postalCode !== address.postalCode) setSelectedZone("");
    setAddressLine2(String(data.get("address_line_2") ?? ""));
    setAddress(next);
  }}>
    {ownerId ? <input type="hidden" name="profile_owner" value={ownerId} /> : null}
    <input type="hidden" name="profile_baseline" value={JSON.stringify(baseline)} />
    <fieldset className={styles.editableFields} disabled={pending} aria-label={t("Profile details", "Datos del perfil")} aria-busy={pending}>
    <section className={styles.formSection} aria-labelledby="personal-details-heading">
      <header><span>01</span><div><h2 id="personal-details-heading">{t("Personal information", "Información personal")}</h2><p>{t("Use a display name or alias, and keep your legal identity details accurate.", "Usa un nombre visible o un alias y mantén tus datos legales actualizados.")}</p></div></header>
      <div className={styles.fieldGrid}>
        <Field label={t("Display name", "Nombre visible")} name="display_name" defaultValue={details.displayName} autoComplete="nickname" className={styles.fullField} required />
        <Field label={t("Legal first name", "Nombre legal")} name="legal_first_name" defaultValue={details.legalFirstName} autoComplete="given-name" required />
        <Field label={t("Legal last name", "Apellido legal")} name="legal_last_name" defaultValue={details.legalLastName} autoComplete="family-name" required />
        <div className={styles.fullField}><ProfileDateOfBirth key={recoveredDate !== undefined || recoveredBirthParts ? "recovered" : "initial"} locale={locale} defaultValue={recoveredDate ?? details.dateOfBirth} defaultParts={recoveredBirthParts} onClear={() => { setShowFeedback(false); const element = form.current; if (element) queueMicrotask(() => rememberDraft(element)); }} /></div>
      </div>
      <p className={styles.identityNote}><AccountIcon name="security" /> {t("Legal identity changes are saved only to your signed-in profile and are never exposed through direct database writes.", "Los cambios de identidad legal se guardan solo en tu perfil.")}</p>
    </section>

    <section className={styles.formSection} aria-labelledby="contact-details-heading">
      <header><span>02</span><div><h2 id="contact-details-heading">{t("Contact details", "Datos de contacto")}</h2><p>{t("Keep your email and phone information current.", "Mantén actualizados tu correo electrónico y tu teléfono.")}</p></div></header>
      <div className={styles.fieldGrid}>
        <div className={styles.field}><label htmlFor="profile-email">{t("Email address", "Correo electrónico")}</label><div className={styles.inputWrap}><input id="profile-email" readOnly value={details.email ?? t("Not available", "No disponible")} aria-label={t("Email address", "Correo electrónico")} /><small className={details.emailConfirmed ? styles.verified : styles.pending}>{details.emailConfirmed ? t("✓ Verified", "✓ Verificado") : t("Confirmation pending", "Confirmación pendiente")}</small></div><Link href="/support?topic=email#report-problem">{t("Ask Support about my email", "Preguntar a soporte sobre mi correo")}</Link></div>
        <Field label={t("Phone number", "Número de teléfono")} name="phone_number" defaultValue={details.phone} type="tel" autoComplete="tel" placeholder="(555) 555-0123" />
      </div>
    </section>

    <section className={styles.formSection} aria-labelledby="mailing-address-heading">
      <header><span>03</span><div><h2 id="mailing-address-heading">{t("Mailing address", "Dirección postal")}</h2><p>{t("Add the address you use for account correspondence and eligible fulfillment.", "Agrega la dirección para la correspondencia de tu cuenta y las entregas que correspondan.")}</p></div></header>
      <div className={styles.fieldGrid}>
        <Field label={t("Street address", "Dirección")} name="address_line_1" defaultValue={details.addressLine1} autoComplete="address-line1" placeholder="125 Market Street" className={styles.fullField} hint={requiredFields.includes("D") ? "Include your suburb or district in your street address." : undefined} />
        <Field label={t("Apartment, suite, or unit (optional)", "Apartamento, oficina o unidad (opcional)")} name="address_line_2" defaultValue={details.addressLine2} autoComplete="address-line2" className={styles.fullField} />
        <Field label={t("City", "Ciudad")} name="city" defaultValue={details.city} autoComplete="address-level2" hint={!requiredFields.includes("C") ? `Optional for ${address.country}.` : undefined} />
        <Field label={t("State or region", "Estado o región")} name="region" defaultValue={details.region} autoComplete="address-level1" hint={!requiredFields.includes("S") ? `Optional for ${address.country}.` : undefined} />
        <Field label={t("ZIP or postal code", "Código postal")} name="postal_code" defaultValue={details.postalCode} autoComplete="postal-code" hint={!requiredFields.includes("Z") ? `Optional for ${address.country}. Leave blank if your address has no postal code.` : undefined} />
        <div className={styles.field}>
          <label htmlFor="profile-country">{t("Country", "País")}</label>
          <div className={styles.inputWrap}><select id="profile-country" name="country" defaultValue={selectedCountry} autoComplete="country-name"><option value="United States">United States</option>{hasNonStandardCountry ? <option value={selectedCountry}>{selectedCountry}</option> : null}{PROFILE_COUNTRIES.slice(1).map(country => <option key={country} value={country}>{country}</option>)}</select></div>
          {completeAddress ? (
            <div ref={lookupFeedback} tabIndex={-1} className={styles.addressZone}>
              <p role="status" className={styles.addressZoneStatus}>
                {!currentLookup ? "Checking your address time zone…" : currentLookup.zone ? (
                  <>Time zone for this address · <strong>{timeZoneLocation(currentLookup.zone)}, {address.country}</strong></>
                ) : null}
              </p>
              {currentLookup?.failed ? <div role="alert">We couldn’t check the time zones. <button type="button" onClick={() => { retryLookup.current = true; setLookup(null); setLookupAttempt(attempt => attempt + 1); }}>Try again</button></div> : null}
              {currentLookup && !currentLookup.failed && !currentLookup.zone ? (
                <div className={styles.field}>
                  <label htmlFor="address-timezone">Time zone for your address</label>
                  <div className={styles.inputWrap}>
                    <select id="address-timezone" name="timezone" required={addressChanged} value={fallbackZones.includes(selectedZone) ? selectedZone : ""} onChange={event => setSelectedZone(event.target.value)}>
                      <option value="">Choose your time zone</option>
                      {fallbackZones.map(zone => <option key={zone} value={zone}>{timeZoneLabel(zone)}</option>)}
                    </select>
                  </div>
                  <small>We couldn’t determine the time zone from this address. Choose the time zone used where you live.</small>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>

    <section className={styles.formSection} aria-labelledby="profile-preferences-heading">
      <header><span>04</span><div><h2 id="profile-preferences-heading">{t("Language preferences", "Preferencias de idioma")}</h2><p>{t("Choose the language used for account information.", "Elige el idioma para la información de tu cuenta.")}</p></div></header>
      <div className={styles.fieldGrid}>
        <div className={styles.field}><label htmlFor="profile-language">{t("Language", "Idioma")}</label><div className={styles.inputWrap}><select id="profile-language" name="preferred_locale" defaultValue={details.preferredLocale ?? "en-US"}><option value="en-US">English (United States)</option><option value="en-GB">English (United Kingdom)</option><option value="es-US">Español (Estados Unidos)</option></select></div></div>
      </div>
    </section>

    </fieldset>
    {showFeedback && !pending && state.status !== "idle" ? <p ref={saveFeedback} tabIndex={state.status === "error" ? -1 : undefined} role="status" className={state.status === "succeeded" ? styles.success : styles.error}>{state.message}</p> : null}
    {hasRecovered && !showFeedback ? <p role="status">Your unsaved profile edits were restored.</p> : null}
    {showFeedback && state.status === "error" && state.sessionExpired ? <Link href="/login?next=%2Faccount%2Fprofile%23personal-details-heading" target="_blank" rel="noopener">Sign in again in a new tab, then return here to save</Link> : null}
    {showFeedback && state.status === "error" && state.conflict ? <Link href="/account/profile#personal-details-heading" target="_blank" rel="noopener">Open latest Profile</Link> : null}
    <div className={styles.actions}>
      {addressLookupFailed ? <p role="status">{t("You can save your other changes now. Your address edits stay here until the lookup succeeds.", "Puedes guardar los demás cambios ahora. Los cambios de dirección quedan pendientes hasta que se verifiquen.")}</p> : null}
      <button type="submit" disabled={pending || (addressChanged && completeAddress && !currentLookup)}>{pending ? t("Saving profile…", "Guardando perfil…") : addressLookupFailed ? t("Save other changes", "Guardar otros cambios") : t("Save profile", "Guardar perfil")}<AccountIcon name="arrow" /></button>
      <Link href="/account/security">{t("Back to Account & Security", "Volver a Cuenta y seguridad")}</Link>
    </div>
  </form>;
}
