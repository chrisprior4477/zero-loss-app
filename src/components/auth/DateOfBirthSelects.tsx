"use client";

import { useMemo, useState } from "react";
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
  return new Date(year, month, 0).getDate();
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
  return `${year}-${pad2(month)}-${pad2(day)}`;
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
  const currentYear = new Date().getFullYear();
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
  return day > limit ? "" : day;
}

type DateOfBirthSelectsProps = {
  defaultValue?: string;
};

export function DateOfBirthSelects({
  defaultValue = "",
}: DateOfBirthSelectsProps) {
  const initial = useMemo(() => parseInitial(defaultValue), [defaultValue]);
  const years = useMemo(() => yearOptions(), []);

  const [year, setYear] = useState<number | "">(initial.year);
  const [month, setMonth] = useState<number | "">(initial.month);
  const [day, setDay] = useState<number | "">(initial.day);

  const maxDay =
    year !== "" && month !== "" ? daysInMonth(year, month) : 31;
  const isoDate = buildIsoDate(year, month, day);
  const ageMessage =
    isoDate && !isAtLeastAge(isoDate)
      ? `You must be at least ${MIN_ACCOUNT_AGE_YEARS} years old to create an account.`
      : "";

  return (
    <div>
      <p
        id="date_of_birth_label"
        className="block text-sm font-medium text-[var(--foreground)]"
      >
        Date of birth
      </p>
      <div className="mt-1.5 grid grid-cols-3 gap-2">
        <div>
          <label htmlFor="dob_month" className="sr-only">
            Month
          </label>
          <select
            id="dob_month"
            required
            value={month === "" ? "" : String(month)}
            aria-labelledby="date_of_birth_label"
            className={selectClassName}
            onChange={(event) => {
              const nextMonth =
                event.target.value === "" ? "" : Number(event.target.value);
              setMonth(nextMonth);
              setDay((current) => clampDay(current, year, nextMonth));
            }}
          >
            <option value="">Month</option>
            {MONTHS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dob_day" className="sr-only">
            Day
          </label>
          <select
            id="dob_day"
            required
            value={day === "" ? "" : String(day)}
            aria-labelledby="date_of_birth_label"
            className={selectClassName}
            onChange={(event) => {
              setDay(
                event.target.value === "" ? "" : Number(event.target.value)
              );
            }}
          >
            <option value="">Day</option>
            {Array.from({ length: maxDay }, (_, index) => index + 1).map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label htmlFor="dob_year" className="sr-only">
            Year
          </label>
          <select
            id="dob_year"
            required
            value={year === "" ? "" : String(year)}
            aria-labelledby="date_of_birth_label"
            className={selectClassName}
            onChange={(event) => {
              const nextYear =
                event.target.value === "" ? "" : Number(event.target.value);
              setYear(nextYear);
              setDay((current) => clampDay(current, nextYear, month));
            }}
          >
            <option value="">Year</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <input
        id="date_of_birth"
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
