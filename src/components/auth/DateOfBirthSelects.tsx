"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  MIN_ACCOUNT_AGE_YEARS,
  isAtLeastAge,
} from "@/lib/auth/validation";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

const selectClassName =
  "w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]";

function daysInMonth(year: number, month: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month, 0);
  return date.getUTCDate();
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function buildIsoDate(
  year: number | "",
  month: number | "",
  day: number | ""
): string {
  if (year === "" || month === "" || day === "") {
    return "";
  }
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

function parseInitial(iso: string | undefined): {
  year: number | "";
  month: number | "";
  day: number | "";
} {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return { year: "", month: "", day: "" };
  }
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

function yearOptions(): number[] {
  const currentYear = new Date().getUTCFullYear();
  const maxYear = currentYear - MIN_ACCOUNT_AGE_YEARS;
  const minYear = currentYear - 100;
  const years: number[] = [];
  for (let year = maxYear; year >= minYear; year -= 1) {
    years.push(year);
  }
  return years;
}

function clampDay(
  day: number | "",
  year: number | "",
  month: number | ""
): number | "" {
  if (day === "" || year === "" || month === "") {
    return day;
  }
  const limit = daysInMonth(year, month);
  return day > limit || !isAtLeastAge(buildIsoDate(year, month, day)) ? "" : day;
}

type DateOfBirthSelectsProps = {
  defaultValue?: string;
  idPrefix?: string;
};

export function DateOfBirthSelects({
  defaultValue = "",
  idPrefix = "",
}: DateOfBirthSelectsProps) {
  const initial = useMemo(() => parseInitial(defaultValue), [defaultValue]);
  const years = useMemo(() => yearOptions(), []);

  const [year, setYear] = useState<number | "">(initial.year);
  const [manualYear, setManualYear] = useState(initial.year !== "" && !years.includes(initial.year));
  const [birthdayNotice, setBirthdayNotice] = useState("");
  const manualField = useRef<HTMLInputElement>(null);
  const focusManual = useRef(false);
  useLayoutEffect(() => {
    if (!manualYear || !focusManual.current) return;
    focusManual.current = false;
    manualField.current?.focus();
  }, [manualYear]);
  const [yearText, setYearText] = useState(initial.year === "" ? "" : String(initial.year).padStart(4, "0"));
  const [month, setMonth] = useState<number | "">(initial.month);
  const [day, setDay] = useState<number | "">(initial.day);

  const invalidManualYear = manualYear && yearText.length === 4 &&
    (Number(yearText) < 1 || !isAtLeastAge(buildIsoDate(Number(yearText), 1, 1)));
  const maxDay =
    year !== "" && month !== "" ? daysInMonth(year, month) : 31;
  const isoDate = buildIsoDate(year, month, day);
  const ageMessage =
    isoDate && !isAtLeastAge(isoDate)
      ? `You must be at least ${MIN_ACCOUNT_AGE_YEARS} years old to create an account.`
      : "";
  const id = (name: string) => `${idPrefix}${name}`;

  function changeYear(next: number | "") {
    setYear(next);
    const validMonth = next === "" || month === "" || isAtLeastAge(buildIsoDate(next, month, 1));
    if (!validMonth) setMonth("");
    const nextDay = validMonth ? clampDay(day, next, month) : "";
    if (!validMonth) setBirthdayNotice("Your selected month is unavailable for this year. Choose your birth month and day again.");
    else if (day !== "" && nextDay === "") setBirthdayNotice("Your selected day is unavailable for this year. Choose your birth day again.");
    setDay(nextDay);
  }

  return (
    <div>
      <p
        id={id("date_of_birth_label")}
        className="block text-sm font-medium text-[var(--foreground)]"
      >
        Date of birth
      </p>
      <div role="group" aria-labelledby={id("date_of_birth_label")} className="mt-1.5 grid grid-cols-3 gap-2">
        <div>
          <label htmlFor={id("dob_month")} className="sr-only">
            Month
          </label>
          <select
            id={id("dob_month")}
            name="dob_month"
            required
            value={month === "" ? "" : String(month)}
            className={selectClassName}
            onChange={(event) => {
              const nextMonth =
                event.target.value === "" ? "" : Number(event.target.value);
              setBirthdayNotice("");
              setMonth(nextMonth);
              const nextDay = clampDay(day, year, nextMonth);
              if (day !== "" && nextDay === "") setBirthdayNotice("Your selected day is unavailable for this month. Choose your birth day again.");
              setDay(nextDay);
            }}
          >
            <option value="">Month</option>
            {MONTHS.map((item) => (
              <option key={item.value} value={item.value} disabled={year !== "" && !isAtLeastAge(buildIsoDate(year, item.value, 1))}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={id("dob_day")} className="sr-only">
            Day
          </label>
          <select
            id={id("dob_day")}
            name="dob_day"
            required
            value={day === "" ? "" : String(day)}
            className={selectClassName}
            onChange={(event) => {
              setBirthdayNotice("");
              setDay(
                event.target.value === "" ? "" : Number(event.target.value)
              );
            }}
          >
            <option value="">Day</option>
            {Array.from({ length: maxDay }, (_, index) => index + 1).map(
              (value) => (
                <option key={value} value={value} disabled={Boolean(year && month && !isAtLeastAge(buildIsoDate(year, month, value)))}>
                  {value}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label htmlFor={id("dob_year")} className="sr-only">
            Year
          </label>
          <select
            id={id("dob_year")}
            name="dob_year"
            required
            value={manualYear ? "manual" : year === "" ? "" : String(year)}
            className={selectClassName}
            onChange={(event) => {
              const manual = event.target.value === "manual";
              const nextYear = manual || !event.target.value ? "" : Number(event.target.value);
              focusManual.current = manual;
              setBirthdayNotice("");
              setManualYear(manual);
              setYearText("");
              changeYear(nextYear);
            }}
          >
            <option value="">Year</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
            <option value="manual">Enter an earlier year</option>
          </select>
        </div>
      </div>
      {manualYear && <label className="mt-2 block text-sm" htmlFor={id("dob_year_input")}>
        Enter your birth year
        <input ref={manualField} id={id("dob_year_input")} name="dob_year_input" className={selectClassName} value={yearText} inputMode="numeric" pattern="(?!0000)[0-9]{4}" maxLength={4} required
          aria-invalid={invalidManualYear || undefined} aria-describedby={invalidManualYear ? id("dob_year_error") : undefined} onChange={event => {
          const text = event.target.value.replace(/\D/g, "").slice(0, 4);
          const nextYear = text.length === 4 && Number(text) > 0 && isAtLeastAge(buildIsoDate(Number(text), 1, 1)) ? Number(text) : "";
          setYearText(text);
          changeYear(nextYear);
        }} />
        {invalidManualYear ? <span id={id("dob_year_error")} role="alert" className="mt-1 block text-xs text-red-300">Enter a valid birth year that meets the minimum age of {MIN_ACCOUNT_AGE_YEARS}.</span> : null}
      </label>}

      {birthdayNotice ? <p className="mt-1 text-xs text-amber-200" role="status">{birthdayNotice}</p> : null}
      <input
        id={id("date_of_birth")}
        name="date_of_birth"
        type="hidden"
        value={isoDate}
        required
        ref={(input) => {
          if (input) {
            input.setCustomValidity(ageMessage);
          }
        }}
      />

      <p className="mt-1 text-xs text-[var(--muted)]">
        You must be at least {MIN_ACCOUNT_AGE_YEARS} years old.
      </p>
    </div>
  );
}
