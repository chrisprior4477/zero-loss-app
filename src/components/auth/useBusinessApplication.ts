"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { blankDraft, guestDraftKey, readDeviceDraft, type BusinessDraft, type BusinessFile, type BusinessRecord } from "@/lib/business/application";
import { readBusinessApplication, saveBusinessApplication } from "@/lib/business/actions";
import { releaseMaterials, uploadMaterials } from "@/lib/business/materials";
import { recoverBusinessDraft } from "@/lib/business/recover-draft";

export function useBusinessApplication(owner: string | null, record: BusinessRecord | null, completeLegacy: (draft: BusinessDraft) => BusinessDraft) {
  const [draft, setDraft] = useState<BusinessDraft>(() => record ? completeLegacy(record.document) : blankDraft);
  const [savedDraft, setSavedDraft] = useState(draft);
  const [guestDraft, setGuestDraft] = useState<BusinessDraft | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [submitted, setSubmitted] = useState(record?.status === "submitted");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<BusinessDraft | null>(null);
  const [conflictingFields, setConflictingFields] = useState<string[]>([]);
  const [reviewingRecovery, setReviewingRecovery] = useState(false);
  const [conflictPending, setConflictPending] = useState(false);
  const recoveryKey = owner ? `zero-loss-business-draft:${owner}` : null;
  const revision = useRef(record?.revision ?? 0);
  const lastSaved = useRef(draft);
  const uploaded = useRef(new Set(record?.document.files.map(f => f.id)));
  const queue = useRef(Promise.resolve(false));
  const imported = useRef<string | null>(null);
  const deviceCopy = useRef<string | null>(null);
  const locked = useRef(submitted);
  const conflict = useRef(false);
  const latestDraft = useRef(draft);
  const removedMaterials = useRef(new Map<string, BusinessFile>());
  const protectedDrafts = useRef<BusinessDraft[]>([]);
  const referencedIds = [...new Set([draft, savedDraft, guestDraft, recoveredDraft].flatMap(candidate => candidate?.files.map(file => file.id) ?? []))].sort().join(',');
  useLayoutEffect(() => {
    protectedDrafts.current = [draft, savedDraft, guestDraft, recoveredDraft].filter((candidate): candidate is BusinessDraft => candidate !== null);
  }, [draft, savedDraft, guestDraft, recoveredDraft]);
  useLayoutEffect(() => {
    if (!referencedIds || !navigator.locks) return;
    const controller = new AbortController();
    const releases: (() => void)[] = [];
    for (const id of referencedIds.split(',')) {
      void navigator.locks.request(`zero-loss-business-material:${id}`, { mode: 'shared', signal: controller.signal }, () =>
        new Promise<void>(resolve => releases.push(resolve))).catch(() => undefined);
    }
    return () => {
      controller.abort();
      releases.forEach(release => release());
    };
  }, [referencedIds]);
  useEffect(() => {
    if (!navigator.locks) return;
    for (const [id, file] of removedMaterials.current) {
      if (protectedDrafts.current.some(candidate => candidate.files.some(item => item.id === id))) continue;
      removedMaterials.current.delete(id);
      void navigator.locks.request(`zero-loss-business-material:${id}`, async () => {
        const device = localStorage.getItem(guestDraftKey);
        const deviceDraft = device ? readDeviceDraft(device) : null;
        if ((device && !deviceDraft) || deviceDraft?.files.some(item => item.id === id)
          || protectedDrafts.current.some(candidate => candidate.files.some(item => item.id === id))) return;
        await releaseMaterials([file]);
      }).catch(() => undefined);
    }
  }, [savedDraft]);
  function discardMaterial(file: BusinessFile) { removedMaterials.current.set(file.id, file); }
  useLayoutEffect(() => { latestDraft.current = draft; }, [draft]);
  const initialRead = useRef(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (initialRead.current) return;
      initialRead.current = true;
      if (recoveryKey) try {
        const copy = JSON.parse(sessionStorage.getItem(recoveryKey) ?? "null");
        const snapshot = copy && readDeviceDraft(JSON.stringify(copy.draft));
        if (snapshot && Number.isSafeInteger(copy.revision) && copy.revision >= 0
          && JSON.stringify(snapshot) !== JSON.stringify(lastSaved.current)) {
          if (!locked.current && copy.revision === revision.current && copy.review !== true) setDraft(completeLegacy(snapshot));
          else {
            const local = completeLegacy(snapshot);
            const previous = !locked.current && copy.revision !== revision.current && copy.baseline
              ? readDeviceDraft(JSON.stringify(copy.baseline)) : null;
            const recovered = previous ? recoverBusinessDraft(completeLegacy(previous), local, lastSaved.current) : null;
            setRecoveredDraft(recovered?.draft ?? local);
            const previousConflicts = Array.isArray(copy.conflicts) ? copy.conflicts.filter((item: unknown) => typeof item === "string") : [];
            setConflictingFields([...new Set([...previousConflicts, ...recovered?.conflicts ?? []])]);
          }
        } else sessionStorage.removeItem(recoveryKey);
      } catch { /* The saved account draft is still available. */ }
      if (!record) {
        try {
          const raw = localStorage.getItem(guestDraftKey);
          deviceCopy.current = raw;
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
      sessionStorage.setItem(recoveryKey, JSON.stringify({
        draft, revision: revision.current, baseline: lastSaved.current, review: reviewingRecovery, conflicts: conflictingFields,
      }));
    } catch { /* The server draft can still be saved normally. */ }
  }, [recoveryKey, initialized, submitted, draft, savedDraft, recoveredDraft, reviewingRecovery, conflictingFields]);

  const loadConflict = useCallback(async () => {
    if (!owner || !conflict.current) return;
    try {
      const result = await readBusinessApplication(owner);
      if ("error" in result) { setMessage(result.error); return; }
      const local = latestDraft.current;
      const baseline = lastSaved.current;
      const saved = result.record ? completeLegacy(result.record.document) : blankDraft;
      const newer = result.record?.revision ?? 0;
      const recovery = result.record?.status === "submitted" ? { draft: local, conflicts: [] } : recoverBusinessDraft(baseline, local, saved);
      const recovered = recovery.draft;
      if (recoveryKey) try {
        sessionStorage.setItem(recoveryKey, JSON.stringify({ draft: recovered, revision: newer, baseline: saved, review: true, conflicts: recovery.conflicts }));
      } catch { /* The in-memory recovery remains available in this tab. */ }
      revision.current = newer;
      lastSaved.current = saved;
      saved.files.forEach(file => uploaded.current.add(file.id));
      setSavedDraft(saved);
      setDraft(saved);
      setConflictPending(false);
      setRecoveredDraft(recovered);
      setConflictingFields(recovery.conflicts);
      if (result.record?.status === "submitted") {
        locked.current = true;
        setSubmitted(true);
        setMessage("Another tab already submitted your application. Your previous edits are still in this tab’s recovery copy.");
        return;
      }
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
    if (snapshot.files.some(file => file.needsListingReview)) {
      setMessage("Reassign or remove the files whose products were removed before saving.");
      return Promise.resolve(false);
    }
    if (!owner) {
      const saveDeviceDraft = () => {
        try {
          const raw = localStorage.getItem(guestDraftKey);
          if (raw !== deviceCopy.current) {
            const stored = raw ? readDeviceDraft(raw) : null;
            const saved = stored ? completeLegacy(stored) : blankDraft;
            const recovery = recoverBusinessDraft(lastSaved.current, latestDraft.current, saved);
            if (recovery.conflicts.length) {
              deviceCopy.current = raw;
              lastSaved.current = saved;
              setSavedDraft(saved);
              setDraft(saved);
              setRecoveredDraft(recovery.draft);
              setConflictingFields(recovery.conflicts);
              setMessage("Review the edits from both tabs before saving.");
              return false;
            }
            snapshot = recovery.draft;
            setDraft(snapshot);
          }
          const serialized = JSON.stringify(snapshot);
          localStorage.setItem(guestDraftKey, serialized);
          deviceCopy.current = serialized;
          lastSaved.current = snapshot;
          setSavedDraft(snapshot);
          setReviewingRecovery(false);
          setConflictingFields([]);
          setMessage("Draft saved on this device.");
          return true;
        } catch { setMessage("This browser could not save your draft."); return false; }
      };
      return navigator.locks ? navigator.locks.request(guestDraftKey, saveDeviceDraft).catch(() => {
        setMessage("This browser could not save your draft.");
        return false;
      }) : Promise.resolve(saveDeviceDraft());
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
        setConflictingFields([]);
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
  }, [owner, recoveryKey, loadConflict, completeLegacy]);

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
    setMessage("Review your recovered edits, then choose Save draft to keep them.");
  }
  function discardRecoveredDraft() {
    conflict.current = false;
    setRecoveredDraft(null);
    setConflictingFields([]);
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
  return { draft, setDraft, initialized, saving, submitted, hasUnsavedChanges, message: status, setMessage, save, discardMaterial, guestDraft, importGuest, dismissGuest: () => setGuestDraft(null), recoveredDraft, reviewRecoveredDraft, discardRecoveredDraft, conflictPending, retryConflict, conflictingFields };
}
