"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { blankDraft, guestDraftKey, readDeviceDraft, type BusinessDraft, type BusinessRecord } from "@/lib/business/application";
import { readBusinessApplication, saveBusinessApplication } from "@/lib/business/actions";
import { releaseMaterials, uploadMaterials } from "@/lib/business/materials";

export function useBusinessApplication(owner: string | null, record: BusinessRecord | null, completeLegacy: (draft: BusinessDraft) => BusinessDraft) {
  const [draft, setDraft] = useState<BusinessDraft>(() => record ? completeLegacy(record.document) : blankDraft);
  const [savedDraft, setSavedDraft] = useState(draft);
  const [guestDraft, setGuestDraft] = useState<BusinessDraft | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [submitted, setSubmitted] = useState(record?.status === "submitted");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<BusinessDraft | null>(null);
  const [reviewingRecovery, setReviewingRecovery] = useState(false);
  const [conflictPending, setConflictPending] = useState(false);
  const recoveryKey = owner ? `zero-loss-business-draft:${owner}` : null;
  const recoveredRevision = useRef<number | null>(null);
  const revision = useRef(record?.revision ?? 0);
  const lastSaved = useRef(draft);
  const uploaded = useRef(new Set(record?.document.files.map(f => f.id)));
  const queue = useRef(Promise.resolve(false));
  const imported = useRef<string | null>(null);
  const deviceCopy = useRef<string | null>(null);
  const locked = useRef(submitted);
  const conflict = useRef(false);
  const latestDraft = useRef(draft);
  useLayoutEffect(() => { latestDraft.current = draft; }, [draft]);
  const initialRead = useRef(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (initialRead.current) return;
      initialRead.current = true;
      if (recoveryKey) try {
        const copy = JSON.parse(sessionStorage.getItem(recoveryKey) ?? "null");
        const snapshot = copy && readDeviceDraft(JSON.stringify(copy.draft));
        if (snapshot && !locked.current && Number.isSafeInteger(copy.revision) && copy.revision >= 0
          && JSON.stringify(snapshot) !== JSON.stringify(lastSaved.current)) {
          if (copy.revision === revision.current) setDraft(completeLegacy(snapshot));
          else {
            recoveredRevision.current = copy.revision;
            setRecoveredDraft(completeLegacy(snapshot));
          }
        } else sessionStorage.removeItem(recoveryKey);
      } catch { /* The saved account draft is still available. */ }
      if (!record) {
        try {
          const raw = localStorage.getItem(guestDraftKey);
          const stored = raw && readDeviceDraft(raw);
          if (stored) {
            const data = completeLegacy(stored);
            if (owner) { deviceCopy.current = raw; setGuestDraft(data); }
            else { lastSaved.current = data; setSavedDraft(data); setDraft(data); }
          }
        } catch { /* A blocked or outdated device draft must not hide the form. */ }
      }
      setInitialized(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [owner, record, completeLegacy, recoveryKey]);

  useLayoutEffect(() => {
    if (!recoveryKey || !initialized || submitted || draft === savedDraft || recoveredDraft) return;
    try {
      sessionStorage.setItem(recoveryKey, JSON.stringify({ draft, revision: recoveredRevision.current ?? revision.current }));
    } catch { /* The server draft can still be saved normally. */ }
  }, [recoveryKey, initialized, submitted, draft, savedDraft, recoveredDraft]);

  const loadConflict = useCallback(async () => {
    if (!owner || !conflict.current) return;
    try {
      const result = await readBusinessApplication(owner);
      if ("error" in result) { setMessage(result.error); return; }
      const local = latestDraft.current;
      const baseline = lastSaved.current;
      const saved = result.record ? completeLegacy(result.record.document) : blankDraft;
      const newer = result.record?.revision ?? 0;
      const listingSectionChanged = JSON.stringify([local.listings, local.files]) !== JSON.stringify([baseline.listings, baseline.files]);
      const recovered = {
        ...local,
        values: { ...saved.values, ...Object.fromEntries(Object.entries(local.values).filter(([key, value]) => value !== baseline.values[key])) },
        // Listings and uploads share slot indices, so keep a coherent version of both.
        listings: listingSectionChanged ? local.listings : saved.listings,
        files: listingSectionChanged ? local.files : saved.files,
      };
      if (recoveryKey) try {
        sessionStorage.setItem(recoveryKey, JSON.stringify({ draft: recovered, revision: revision.current }));
      } catch { /* The in-memory recovery remains available in this tab. */ }
      recoveredRevision.current = revision.current;
      revision.current = newer;
      lastSaved.current = saved;
      saved.files.forEach(file => uploaded.current.add(file.id));
      setSavedDraft(saved);
      setDraft(saved);
      setConflictPending(false);
      if (result.record?.status === "submitted") {
        locked.current = true;
        setSubmitted(true);
        setMessage("Another tab already submitted your application. Your previous edits are still in this tab’s recovery copy.");
        return;
      }
      setRecoveredDraft(recovered);
      setMessage("The latest saved draft is ready. Review your edits before saving again.");
    } catch { setMessage("We couldn’t check the latest saved draft. Your edits are still here."); }
  }, [owner, completeLegacy, recoveryKey]);

  async function retryConflict() {
    if (saving) return;
    setSaving(true);
    try { await loadConflict(); }
    finally { setSaving(false); }
  }

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
      if (locked.current || conflict.current) return false;
      if (!submit && lastSaved.current === snapshot && revision.current) return true;
      setSaving(true);
      try {
        await uploadMaterials(owner, snapshot.files, uploaded.current);
        const result = await saveBusinessApplication(owner, snapshot, revision.current, submit);
        if (result.conflict) {
          conflict.current = true;
          setConflictPending(true);
          await loadConflict();
          return false;
        }
        if (!result.revision) throw new Error(result.error);
        const savedFiles = new Set(lastSaved.current.files.map(file => file.id));
        const newlySavedFiles = snapshot.files.filter(file => !savedFiles.has(file.id));
        revision.current = result.revision;
        lastSaved.current = snapshot;
        setSavedDraft(snapshot);
        locked.current = submit;
        recoveredRevision.current = null;
        setReviewingRecovery(false);
        setSubmitted(submit);
        setMessage(submit ? "Application submitted for review." : "Draft saved to your account.");
        if (imported.current) {
          try { if (localStorage.getItem(guestDraftKey) === imported.current) localStorage.removeItem(guestDraftKey); } catch { /* Already saved online. */ }
          imported.current = null;
        }
        await releaseMaterials(newlySavedFiles);
        if (recoveryKey) try {
          const copy = JSON.parse(sessionStorage.getItem(recoveryKey) ?? "null");
          if (JSON.stringify(copy?.draft) === JSON.stringify(snapshot)) sessionStorage.removeItem(recoveryKey);
        } catch { /* The account copy is already saved. */ }
        return true;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Save failed. Your edits are still on this page.");
        return false;
      } finally { setSaving(false); }
    };
    queue.current = queue.current.then(run, run);
    return queue.current;
  }, [owner, recoveryKey, loadConflict]);

  useEffect(() => {
    if (!initialized || submitted || draft === lastSaved.current) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (draft !== lastSaved.current) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    const timer = owner && !conflictPending && !reviewingRecovery && !recoveredDraft ? window.setTimeout(() => { void save(draft); }, 750) : undefined;
    return () => { clearTimeout(timer); window.removeEventListener("beforeunload", warn); };
  }, [initialized, submitted, draft, owner, save, reviewingRecovery, recoveredDraft, conflictPending]);

  function reviewRecoveredDraft() {
    if (!recoveredDraft) return;
    conflict.current = false;
    setDraft(recoveredDraft);
    setRecoveredDraft(null);
    setReviewingRecovery(true);
    setMessage("Review your recovered edits. Choose Save draft when you’re ready to apply them to the current account draft.");
  }
  function discardRecoveredDraft() {
    conflict.current = false;
    recoveredRevision.current = null;
    setRecoveredDraft(null);
    if (recoveryKey) try { sessionStorage.removeItem(recoveryKey); } catch { /* Tab storage is optional. */ }
  }

  function importGuest() {
    if (!guestDraft) return;
    try {
      const current = localStorage.getItem(guestDraftKey);
      if (current !== deviceCopy.current) {
        deviceCopy.current = current;
        const latest = current && readDeviceDraft(current);
        setGuestDraft(latest ? completeLegacy(latest) : null);
        setMessage(latest ? "The device draft changed. Choose Use this draft again to import the latest version." : "The device draft is no longer available.");
        return;
      }
    } catch { /* Import the loaded copy. */ }
    imported.current = deviceCopy.current;
    setDraft(guestDraft);
    setGuestDraft(null);
    void save(guestDraft);
  }
  function hasUnsavedChanges() {
    return !submitted && draft !== lastSaved.current;
  }
  const status = savedDraft !== draft && message.startsWith("Draft saved") ? "Unsaved changes." : message;
  return { draft, setDraft, initialized, saving, submitted, hasUnsavedChanges, message: status, setMessage, save, guestDraft, importGuest, dismissGuest: () => setGuestDraft(null), recoveredDraft, reviewRecoveredDraft, discardRecoveredDraft, conflictPending, retryConflict };
}
