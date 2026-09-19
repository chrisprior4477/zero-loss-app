"use client";

import { useSyncExternalStore } from "react";

export const sampleCrewPeople = [
  { name: "Maya", photo: "/images/home/crew/person-1.webp" },
  { name: "Daniel", photo: "/images/home/crew/person-2.webp" },
  { name: "Ari", photo: "/images/home/crew/person-3.webp" },
  { name: "Leo", photo: "/images/home/crew/person-4.webp" },
] as const;

export type SampleCrewName = (typeof sampleCrewPeople)[number]["name"];
const key = "zero-loss-sample-crew-v1";
const changed = "zero-loss-sample-crew-changed";
const empty = "[]";

function isSampleName(value: unknown): value is SampleCrewName {
  return sampleCrewPeople.some((person) => person.name === value);
}

function parse(value: string): SampleCrewName[] {
  try {
    const stored: unknown = JSON.parse(value);
    return Array.isArray(stored) ? stored.filter(isSampleName) : [];
  } catch {
    return [];
  }
}

function read() {
  try { return localStorage.getItem(key) ?? empty; } catch { return empty; }
}

function write(names: SampleCrewName[]) {
  try {
    localStorage.setItem(key, JSON.stringify([...new Set(names)]));
    window.dispatchEvent(new Event(changed));
  } catch { /* The visual preview remains usable when storage is unavailable. */ }
}

function subscribe(callback: () => void) {
  window.addEventListener(changed, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(changed, callback); window.removeEventListener("storage", callback); };
}

export function useSampleCrewPreviews(): SampleCrewName[] {
  return parse(useSyncExternalStore(subscribe, read, () => empty));
}

export function addSampleCrewPreview(name: SampleCrewName) {
  write([...parse(read()), name]);
}

export function removeSampleCrewPreview(name: SampleCrewName) {
  write(parse(read()).filter((person) => person !== name));
}

// The old homepage buttons held their choices only in component memory. Their
// state cannot be recovered after navigation, so show the four pictured sample
// profiles once in the account preview and retain later edits in this browser.
export function initializeSampleCrewPreview() {
  try {
    if (localStorage.getItem(key) === null) write(sampleCrewPeople.map((person) => person.name));
  } catch { /* Browser storage can be disabled. */ }
}
