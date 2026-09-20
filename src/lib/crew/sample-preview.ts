"use client";

import { useSyncExternalStore } from "react";

export const sampleCrewPeople = [
  { name: "Maya", photo: "/images/home/crew/person-1.webp" },
  { name: "Daniel", photo: "/images/home/crew/person-2.webp" },
  { name: "Ari", photo: "/images/home/crew/person-3.webp" },
  { name: "Leo", photo: "/images/home/crew/person-4.webp" },
  { name: "Claire", photo: "/images/home/crew/person-5.webp" },
  { name: "Marcus", photo: "/images/home/crew/person-6.webp" },
  { name: "Mateo", photo: "/images/home/crew/person-mateo.webp" },
  { name: "Nora", photo: "/images/home/crew/person-nora.webp" },
  { name: "Samir", photo: "/images/home/crew/person-samir.webp" },
  { name: "Jules", photo: "/images/home/crew/person-jules.webp" },
  { name: "Tessa", photo: "/images/home/crew/person-tessa.webp" },
  { name: "Andre", photo: "/images/home/crew/person-andre.webp" },
  { name: "Sofia", photo: "/images/home/crew/person-sofia.webp" },
  { name: "Owen", photo: "/images/home/crew/person-owen.webp" },
] as const;

export const featuredCrewPeople = sampleCrewPeople.slice(0, 4);
export const discoveryCrewPeople = sampleCrewPeople.slice(4);

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
    if (localStorage.getItem(key) === null) write(featuredCrewPeople.map((person) => person.name));
  } catch { /* Browser storage can be disabled. */ }
}
