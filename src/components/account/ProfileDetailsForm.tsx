"use client";

import Link from "next/link";
import { useActionState, useId, useMemo, useRef, useState } from "react";
import { AccountIcon } from "./AccountIcon";
import { saveProfileDetails } from "@/lib/account/actions";
import { PROFILE_COUNTRIES } from "@/lib/account/countries";
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
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

function Field({ label, name, defaultValue, autoComplete, type = "text", placeholder, className, required = false }: {
  label: string; name: string; defaultValue?: string | null; autoComplete?: string; type?: string; placeholder?: string; className?: string; required?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return <div className={`${styles.field} ${className ?? ""}`}>
    <label htmlFor={id}>{label}</label>
    <div className={styles.inputWrap}>
      <input ref={input} id={id} type={type} name={name} defaultValue={defaultValue ?? ""} autoComplete={autoComplete} placeholder={placeholder} required={required} />
      <button type="button" className={styles.clearButton} aria-label={`Clear ${label.toLowerCase()}`} onClick={() => { if (input.current) { input.current.value = ""; input.current.focus(); } }}>×</button>
    </div>
  </div>;
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

function ProfileDateOfBirth({ defaultValue }: { defaultValue: string | null }) {
  const initial = useMemo(() => splitDate(defaultValue), [defaultValue]);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const maximumYear = new Date().getFullYear() - 18;
  const years = useMemo(() => Array.from({ length: 103 }, (_, index) => maximumYear - index), [maximumYear]);
  const maximumDay = daysInMonth(year, month);
  const dateValue = year && month && day ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : "";
  const normalizeDay = (nextYear: string, nextMonth: string) => {
    const limit = daysInMonth(nextYear, nextMonth);
    if (day && Number(day) > limit) setDay(String(limit));
  };
  const clear = () => { setYear(""); setMonth(""); setDay(""); };

  return <fieldset className={styles.dateField}>
    <legend>Date of birth</legend>
    <div className={styles.dateSelects}>
      <label><span className="sr-only">Birth month</span><select aria-label="Birth month" value={month} required onChange={event => { setMonth(event.target.value); normalizeDay(year, event.target.value); }}><option value="">Month</option>{MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</select></label>
      <label><span className="sr-only">Birth day</span><select aria-label="Birth day" value={day} required onChange={event => setDay(event.target.value)}><option value="">Day</option>{Array.from({ length: maximumDay }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label><span className="sr-only">Birth year</span><select aria-label="Birth year" value={year} required onChange={event => { setYear(event.target.value); normalizeDay(event.target.value, month); }}><option value="">Year</option>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <button type="button" className={styles.clearButton} aria-label="Clear date of birth" onClick={clear}>×</button>
    </div>
    <input type="hidden" name="date_of_birth" value={dateValue} />
    <small>On a phone, these open your device’s native scrolling selectors.</small>
  </fieldset>;
}

export function ProfileDetailsForm({ details }: { details: ProfileDetails }) {
  const [state, action, pending] = useActionState(saveProfileDetails, { status: "idle" });
  const selectedCountry = details.country ?? "United States";
  const hasNonStandardCountry = !PROFILE_COUNTRIES.some(country => country === selectedCountry);
  return <form action={action} className={styles.form} aria-label="Edit profile">
    <section className={styles.formSection} aria-labelledby="personal-details-heading">
      <header><span>01</span><div><h2 id="personal-details-heading">Personal information</h2><p>Use a display name or alias, and keep your legal identity details accurate.</p></div></header>
      <div className={styles.fieldGrid}>
        <Field label="Display name" name="display_name" defaultValue={details.displayName} autoComplete="nickname" className={styles.fullField} required />
        <Field label="Legal first name" name="legal_first_name" defaultValue={details.legalFirstName} autoComplete="given-name" required />
        <Field label="Legal last name" name="legal_last_name" defaultValue={details.legalLastName} autoComplete="family-name" required />
        <div className={styles.fullField}><ProfileDateOfBirth defaultValue={details.dateOfBirth} /></div>
      </div>
      <p className={styles.identityNote}><AccountIcon name="security" /> Legal identity changes are saved only to your signed-in profile and are never exposed through direct database writes.</p>
    </section>

    <section className={styles.formSection} aria-labelledby="contact-details-heading">
      <header><span>02</span><div><h2 id="contact-details-heading">Contact details</h2><p>Keep your email and phone information current.</p></div></header>
      <div className={styles.fieldGrid}>
        <div className={styles.field}><label htmlFor="profile-email">Email address</label><div className={styles.inputWrap}><input id="profile-email" readOnly value={details.email ?? "Not available"} aria-label="Email address" /><small className={details.emailConfirmed ? styles.verified : styles.pending}>{details.emailConfirmed ? "✓ Verified" : "Confirmation pending"}</small></div></div>
        <Field label="Phone number" name="phone_number" defaultValue={details.phone} type="tel" autoComplete="tel" placeholder="(555) 555-0123" />
      </div>
    </section>

    <section className={styles.formSection} aria-labelledby="mailing-address-heading">
      <header><span>03</span><div><h2 id="mailing-address-heading">Mailing address</h2><p>Add the address you use for account correspondence and eligible fulfillment.</p></div></header>
      <div className={styles.fieldGrid}>
        <Field label="Street address" name="address_line_1" defaultValue={details.addressLine1} autoComplete="address-line1" placeholder="125 Market Street" className={styles.fullField} />
        <Field label="Apartment, suite, or unit (optional)" name="address_line_2" defaultValue={details.addressLine2} autoComplete="address-line2" className={styles.fullField} />
        <Field label="City" name="city" defaultValue={details.city} autoComplete="address-level2" />
        <Field label="State or region" name="region" defaultValue={details.region} autoComplete="address-level1" />
        <Field label="ZIP or postal code" name="postal_code" defaultValue={details.postalCode} autoComplete="postal-code" />
        <div className={styles.field}><label htmlFor="profile-country">Country</label><div className={styles.inputWrap}><select id="profile-country" name="country" defaultValue={selectedCountry} autoComplete="country-name"><option value="United States">United States</option>{hasNonStandardCountry ? <option value={selectedCountry}>{selectedCountry}</option> : null}{PROFILE_COUNTRIES.slice(1).map(country => <option key={country} value={country}>{country}</option>)}</select></div></div>
      </div>
    </section>

    <section className={styles.formSection} aria-labelledby="profile-preferences-heading">
      <header><span>04</span><div><h2 id="profile-preferences-heading">Regional preferences</h2><p>Control the language and time zone used for account information.</p></div></header>
      <div className={styles.fieldGrid}>
        <div className={styles.field}><label htmlFor="profile-language">Language</label><div className={styles.inputWrap}><select id="profile-language" name="preferred_locale" defaultValue={details.preferredLocale ?? "en-US"}><option value="en-US">English (United States)</option><option value="en-GB">English (United Kingdom)</option><option value="es-US">Español (Estados Unidos)</option></select></div></div>
        <div className={styles.field}><label htmlFor="profile-timezone">Time zone</label><div className={styles.inputWrap}><select id="profile-timezone" name="timezone" defaultValue={details.timezone ?? "America/New_York"}><option value="America/New_York">Eastern Time</option><option value="America/Chicago">Central Time</option><option value="America/Denver">Mountain Time</option><option value="America/Phoenix">Arizona Time</option><option value="America/Los_Angeles">Pacific Time</option><option value="Pacific/Honolulu">Hawaii Time</option></select></div></div>
      </div>
    </section>

    {state.status !== "idle" ? <p role="status" className={state.status === "succeeded" ? styles.success : styles.error}>{state.message}</p> : null}
    <div className={styles.actions}>
      <button type="submit" disabled={pending}>{pending ? "Saving profile…" : "Save profile"}<AccountIcon name="arrow" /></button>
      <Link href="/account/security">Back to Account &amp; Security</Link>
    </div>
  </form>;
}
