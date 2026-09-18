"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AccountIcon } from "./AccountIcon";
import { saveProfileDetails } from "@/lib/account/actions";
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

function Field({ label, name, defaultValue, autoComplete, type = "text", placeholder, className }: {
  label: string; name: string; defaultValue?: string | null; autoComplete?: string; type?: string; placeholder?: string; className?: string;
}) {
  return <label className={className}>{label}<input type={type} name={name} defaultValue={defaultValue ?? ""} autoComplete={autoComplete} placeholder={placeholder} /></label>;
}

export function ProfileDetailsForm({ details }: { details: ProfileDetails }) {
  const [state, action, pending] = useActionState(saveProfileDetails, { status: "idle" });
  const legalName = [details.legalFirstName, details.legalLastName].filter(Boolean).join(" ") || "Not available";
  return <form action={action} className={styles.form} aria-label="Edit profile">
    <section className={styles.formSection} aria-labelledby="personal-details-heading">
      <header><span>01</span><div><h2 id="personal-details-heading">Personal information</h2><p>Choose how your name appears throughout Zero Loss.</p></div></header>
      <div className={styles.fieldGrid}>
        <Field label="Display name" name="display_name" defaultValue={details.displayName} autoComplete="name" className={styles.fullField} />
        <label>Legal name<input readOnly value={legalName} aria-label="Legal name" /></label>
        <label>Date of birth<input readOnly value={details.dateOfBirth ?? "Not available"} aria-label="Date of birth" /></label>
      </div>
      <p className={styles.lockedNote}><AccountIcon name="security" /> Legal name and date of birth are protected identity details and cannot be changed here.</p>
    </section>

    <section className={styles.formSection} aria-labelledby="contact-details-heading">
      <header><span>02</span><div><h2 id="contact-details-heading">Contact details</h2><p>Keep your email and phone information current.</p></div></header>
      <div className={styles.fieldGrid}>
        <label>Email address<input readOnly value={details.email ?? "Not available"} aria-label="Email address" /><small className={details.emailConfirmed ? styles.verified : styles.pending}>{details.emailConfirmed ? "✓ Verified" : "Confirmation pending"}</small></label>
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
        <Field label="Country" name="country" defaultValue={details.country ?? "United States"} autoComplete="country-name" />
      </div>
    </section>

    <section className={styles.formSection} aria-labelledby="profile-preferences-heading">
      <header><span>04</span><div><h2 id="profile-preferences-heading">Regional preferences</h2><p>Control the language and time zone used for account information.</p></div></header>
      <div className={styles.fieldGrid}>
        <label>Language<select name="preferred_locale" defaultValue={details.preferredLocale ?? "en-US"}><option value="en-US">English (United States)</option><option value="en-GB">English (United Kingdom)</option><option value="es-US">Español (Estados Unidos)</option></select></label>
        <label>Time zone<select name="timezone" defaultValue={details.timezone ?? "America/New_York"}><option value="America/New_York">Eastern Time</option><option value="America/Chicago">Central Time</option><option value="America/Denver">Mountain Time</option><option value="America/Phoenix">Arizona Time</option><option value="America/Los_Angeles">Pacific Time</option><option value="Pacific/Honolulu">Hawaii Time</option></select></label>
      </div>
    </section>

    {state.status !== "idle" ? <p role="status" className={state.status === "succeeded" ? styles.success : styles.error}>{state.message}</p> : null}
    <div className={styles.actions}>
      <button type="submit" disabled={pending}>{pending ? "Saving profile…" : "Save profile"}<AccountIcon name="arrow" /></button>
      <Link href="/account/security">Back to Account &amp; Security</Link>
    </div>
  </form>;
}
