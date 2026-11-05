"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { blankDraft, guestDraftKey, readDeviceDraft, type BusinessDraft, type BusinessRecord } from "@/lib/business/application";
import { saveBusinessApplication } from "@/lib/business/actions";
import { releaseMaterials, uploadMaterials } from "@/lib/business/materials";

export function useBusinessApplication(owner: string | null, record: BusinessRecord | null, completeLegacy: (draft: BusinessDraft) => BusinessDraft) {
  const [draft, setDraft] = useState<BusinessDraft>(() => record ? completeLegacy(record.document) : blankDraft);
  const [savedDraft, setSavedDraft] = useState(draft);
  const [guestDraft, setGuestDraft] = useState<BusinessDraft | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [submitted, setSubmitted] = useState(record?.status === "submitted");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const revision = useRef(record?.revision ?? 0);
  const lastSaved = useRef(draft);
  const uploaded = useRef(new Set(record?.document.files.map(f => f.id)));
  const queue = useRef(Promise.resolve(false));
  const imported = useRef<string | null>(null);
  const locked = useRef(submitted);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!record) {
        try {
          const raw = localStorage.getItem(guestDraftKey);
          const stored = raw && readDeviceDraft(raw);
          if (stored) {
            const data = completeLegacy(stored);
            if (owner) setGuestDraft(data);
            else { lastSaved.current = data; setSavedDraft(data); setDraft(data); }
          }
        } catch { /* A blocked or outdated device draft must not hide the form. */ }
      }
      setInitialized(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [owner, record, completeLegacy]);

  const save = useCallback((snapshot: BusinessDraft, submit = false) => {
    if (!owner) {
      try {
        localStorage.setItem(guestDraftKey, JSON.stringify(snapshot));
        lastSaved.current = snapshot;
        setSavedDraft(snapshot);
        setMessage("Draft saved on this device.");
        return Promise.resolve(true);
      } catch { setMessage("This browser could not save your draft."); return Promise.resolve(false); }
    }
    const run = async () => {
      if (locked.current) return false;
      if (!submit && lastSaved.current === snapshot && revision.current) return true;
      setSaving(true);
      try {
        await uploadMaterials(owner, snapshot.files, uploaded.current);
        const result = await saveBusinessApplication(owner, snapshot, revision.current, submit);
        if (!result.revision) throw new Error(result.error);
        const savedFiles = new Set(lastSaved.current.files.map(file => file.id));
        const newlySavedFiles = snapshot.files.filter(file => !savedFiles.has(file.id));
        revision.current = result.revision;
        lastSaved.current = snapshot;
        setSavedDraft(snapshot);
        locked.current = submit;
        setSubmitted(submit);
        setMessage(submit ? "Application submitted for review." : "Draft saved to your account.");
        if (imported.current) {
          try { if (localStorage.getItem(guestDraftKey) === imported.current) localStorage.removeItem(guestDraftKey); } catch { /* Already saved online. */ }
          imported.current = null;
        }
        await releaseMaterials(newlySavedFiles);
        return true;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Save failed. Your edits are still on this page.");
        return false;
      } finally { setSaving(false); }
    };
    queue.current = queue.current.then(run, run);
    return queue.current;
  }, [owner]);

  useEffect(() => {
    if (!initialized || submitted || draft === lastSaved.current) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (draft !== lastSaved.current) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    const timer = owner ? window.setTimeout(() => { void save(draft); }, 750) : undefined;
    return () => { clearTimeout(timer); window.removeEventListener("beforeunload", warn); };
  }, [initialized, submitted, draft, owner, save]);

  function importGuest() {
    if (!guestDraft) return;
    try { imported.current = localStorage.getItem(guestDraftKey); } catch { /* Import the loaded copy. */ }
    setDraft(guestDraft);
    setGuestDraft(null);
    void save(guestDraft);
  }
  const status = savedDraft !== draft && message.startsWith("Draft saved") ? "Unsaved changes." : message;
  return { draft, setDraft, initialized, saving, submitted, message: status, setMessage, save, guestDraft, importGuest, dismissGuest: () => setGuestDraft(null) };
}
