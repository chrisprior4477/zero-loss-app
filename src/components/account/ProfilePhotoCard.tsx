"use client";

import popupStyles from "@/components/layout/responsive-popup.module.css";
import photoStyles from "./profile-photo.module.css";

import Image from "next/image";
import { ChangeEvent, MouseEvent, PointerEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { saveProfilePhoto, saveProfilePhotoVisibility, type PhotoVisibilitySurface } from "@/lib/account/actions";

const PHOTO_KEY = "zero-loss-profile-photo";
const CROP_KEY = "zero-loss-profile-photo-crop";
const AVATAR_EVENT = "zero-loss-avatar-updated";
// Keep draft offsets in one coordinate space, independent of the visible editor size.
const CROP_SIZE = 256;

type Crop = { x: number; y: number; zoom: number };
const defaultCrop: Crop = { x: 0, y: 0, zoom: 1 };

function readCrop(): Crop {
  try {
    return JSON.parse(window.localStorage.getItem(CROP_KEY) ?? "") as Crop;
  } catch {
    return defaultCrop;
  }
}

function AvatarImage({ photo, crop }: { photo: string; crop: Crop }) {
  return (
    <Image
      src={photo}
      alt=""
      fill
      unoptimized
      draggable={false}
      className="pointer-events-none select-none object-cover"
      style={{
        transform: `translate(${crop.x / CROP_SIZE * 100}%, ${crop.y / CROP_SIZE * 100}%) scale(${crop.zoom})`,
      }}
    />
  );
}

async function renderCroppedPhoto(photo: string, crop: Crop): Promise<Blob> {
  const image = new window.Image();
  image.src = photo;
  await image.decode();

  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Photo editor is not available in this browser.");

  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight) * crop.zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (size - width) / 2 + crop.x * size / CROP_SIZE;
  const y = (size - height) / 2 + crop.y * size / CROP_SIZE;
  context.drawImage(image, x, y, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("We could not prepare that photo.")),
      "image/webp",
      0.9,
    );
  });
}

export function ProfilePhotoCard({
  initials,
  fullName,
  email,
  initialAvatarUrl,
  compact = false,
  emailStatus,
  initialVisibility,
}: {
  initials: string;
  fullName: string;
  email: string;
  initialAvatarUrl: string | null;
  compact?: boolean;
  emailStatus?: "verified" | "pending";
  initialVisibility?: { menu: boolean; crew: boolean };
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLInputElement>(null);
  const editorTriggerRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ x: number; y: number; cropX: number; cropY: number; scale: number } | null>(null);
  const migrationStarted = useRef(false);
  const [photo, setPhoto] = useState<string | null>(initialAvatarUrl);
  const [draftPhoto, setDraftPhoto] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>(defaultCrop);
  const [draftCrop, setDraftCrop] = useState<Crop>(defaultCrop);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(initialVisibility?.menu ?? true);
  const [crewVisible, setCrewVisible] = useState(initialVisibility?.crew ?? true);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [visibilityMessage, setVisibilityMessage] = useState<{ error: boolean; text: string } | null>(null);

  useLayoutEffect(() => {
    if (!editing) return;
    const editor = editorRef.current;
    if (!editor) return;
    // Remember the clicked button before a file chooser can move focus elsewhere.
    const trigger = editorTriggerRef.current;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    zoomRef.current?.focus({ preventScroll: true });

    const keepFocusInside = (event: FocusEvent) => {
      if (event.target instanceof Node && !editor.contains(event.target)) {
        zoomRef.current?.focus({ preventScroll: true });
      }
    };
    const handleKeys = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setEditing(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(editor.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
      )).filter(control => control.tabIndex >= 0 && !control.hidden);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("focusin", keepFocusInside);
    document.addEventListener("keydown", handleKeys);
    return () => {
      document.removeEventListener("focusin", keepFocusInside);
      document.removeEventListener("keydown", handleKeys);
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [editing]);

  async function changeVisibility(surface: PhotoVisibilitySurface, enabled: boolean) {
    const previous = surface === "menu" ? menuVisible : crewVisible;
    if (surface === "menu") {
      setMenuVisible(enabled);
      window.dispatchEvent(new CustomEvent("zero-loss-photo-menu-visibility", { detail: { enabled } }));
    } else {
      setCrewVisible(enabled);
    }
    setVisibilityMessage({ error: false, text: "Saving photo choice…" });
    setSavingVisibility(true);
    try {
      const result = await saveProfilePhotoVisibility(surface, enabled);
      if (!result.ok) throw new Error(result.message);
      setVisibilityMessage({ error: false, text: "Photo choice saved." });
    } catch (caught) {
      if (surface === "menu") {
        setMenuVisible(previous);
        window.dispatchEvent(new CustomEvent("zero-loss-photo-menu-visibility", { detail: { enabled: previous } }));
      } else {
        setCrewVisible(previous);
      }
      setVisibilityMessage({ error: true, text: caught instanceof Error ? caught.message : "Your photo choice could not be saved." });
    } finally {
      setSavingVisibility(false);
    }
  }

  async function persistPhoto(source: string, sourceCrop: Crop) {
    const blob = await renderCroppedPhoto(source, sourceCrop);
    const formData = new FormData();
    formData.set("photo", new File([blob], "avatar.webp", { type: "image/webp" }));
    const result = await saveProfilePhoto(formData);
    if (!result.ok) throw new Error(result.message);

    const refreshedUrl = `${result.publicUrl}?v=${Date.now()}`;
    setPhoto(refreshedUrl);
    setCrop(defaultCrop);
    window.localStorage.removeItem(PHOTO_KEY);
    window.localStorage.removeItem(CROP_KEY);
    window.dispatchEvent(new CustomEvent(AVATAR_EVENT, { detail: { photo: refreshedUrl } }));
    return refreshedUrl;
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(async () => {
      if (initialAvatarUrl || migrationStarted.current) return;
      const legacyPhoto = window.localStorage.getItem(PHOTO_KEY);
      if (!legacyPhoto) return;
      migrationStarted.current = true;
      try {
        await persistPhoto(legacyPhoto, readCrop());
      } catch {
        setPhoto(legacyPhoto);
        setCrop(readCrop());
        setError("Your existing photo is still on this device. Open the editor and save it to sync everywhere.");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialAvatarUrl]);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") return;
      setDraftPhoto(reader.result);
      setDraftCrop(defaultCrop);
      setEditing(true);
    });
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      cropX: draftCrop.x,
      cropY: draftCrop.y,
      scale: CROP_SIZE / Math.max(1, event.currentTarget.clientWidth),
    };
  }

  function movePhoto(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    setDraftCrop((current) => ({
      ...current,
      x: Math.max(-90, Math.min(90, dragRef.current!.cropX + (event.clientX - dragRef.current!.x) * dragRef.current!.scale)),
      y: Math.max(-90, Math.min(90, dragRef.current!.cropY + (event.clientY - dragRef.current!.y) * dragRef.current!.scale)),
    }));
  }

  async function savePhoto() {
    if (!draftPhoto) return;
    setSaving(true);
    setError(null);
    try {
      await persistPhoto(draftPhoto, draftCrop);
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error
        ? caught.message
        : "We could not sync your photo. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function openEditor(event: MouseEvent<HTMLButtonElement>) {
    editorTriggerRef.current = event.currentTarget;
    if (!photo) {
      inputRef.current?.click();
      return;
    }
    setDraftPhoto(photo);
    setDraftCrop(crop);
    setEditing(true);
  }

  return (
    <>
      <article className={`border border-cyan-300/20 bg-[#06264a] ${compact ? "flex flex-col justify-center rounded-2xl p-4 sm:p-5" : "rounded-[28px] p-6 sm:p-7"}`}>
        <div className={`flex items-center ${compact ? "gap-4" : "gap-5"}`}>
          <button
            type="button"
            onClick={openEditor}
            aria-label={photo ? "Adjust profile photo" : "Add profile photo"}
            className={`group relative grid shrink-0 place-items-center overflow-hidden rounded-full border-4 border-cyan-300/25 bg-[#07533f] text-2xl font-black text-[#72ff9f] transition hover:border-cyan-200 focus-visible:outline focus-visible:outline-4 focus-visible:outline-cyan-300/40 ${compact ? "h-16 w-16" : "h-24 w-24"}`}
          >
            {photo ? <AvatarImage photo={photo} crop={crop} /> : initials}
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              Edit
            </span>
          </button>
          <div className="min-w-0">
            <h2 className={`break-words font-black text-white ${compact ? "text-xl" : "text-2xl"}`}>{fullName}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className={`break-all text-white/60 ${compact ? "text-xs" : "text-sm"}`}>{email}</p>
              {emailStatus ? <span data-status={emailStatus} className={`inline-flex items-center gap-1 text-[11px] font-bold ${emailStatus === "verified" ? "text-[#63ff7d]" : "text-amber-300"}`}><span aria-hidden="true" className={`grid h-4 w-4 place-items-center rounded-full text-[10px] text-white ${emailStatus === "verified" ? "bg-[#07883c]" : "bg-amber-600"}`}>{emailStatus === "verified" ? "✓" : "!"}</span>{emailStatus === "verified" ? "Verified" : "Confirmation pending"}</span> : null}
            </div>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} tabIndex={-1} className="sr-only" aria-label="Choose a profile photo" />
            <button type="button" onClick={openEditor} className={`inline-flex min-h-11 items-center rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 text-sm font-bold text-cyan-200 transition hover:bg-cyan-300 hover:text-[#00132e] ${compact ? "mt-2" : "mt-4"}`}>
              {photo ? "Adjust profile photo" : "Add profile photo"}
            </button>
          </div>
        </div>
        {initialVisibility ? <fieldset className="mt-4 border-t border-[#b9d7ea] pt-4 text-[#0b1c4d]">
          <legend className="sr-only">Where to show your photo</legend>
          <p className="mb-2 text-sm font-extrabold">Where to show your photo</p>
          <label className="flex min-h-12 cursor-pointer items-start gap-3 py-2 text-sm font-bold">
            <input type="checkbox" checked={menuVisible} disabled={savingVisibility} onChange={(event) => changeVisibility("menu", event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#087fff]" />
            <span>Show my photo in the account menu<span className="mt-0.5 block text-xs font-normal text-[#506b8e]">The round photo in the header changes immediately.</span></span>
          </label>
          <label className="flex min-h-12 cursor-pointer items-start gap-3 py-2 text-sm font-bold">
            <input type="checkbox" checked={crewVisible} disabled={savingVisibility} onChange={(event) => changeVisibility("crew", event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#087fff]" />
            <span>Show my photo to My Crew<span className="mt-0.5 block text-xs font-normal text-[#506b8e]">Connected Crew members see it in My Crew.</span></span>
          </label>
          {visibilityMessage ? <p role={visibilityMessage.error ? "alert" : "status"} className={`mt-2 text-xs font-semibold ${visibilityMessage.error ? "text-[#a6321a]" : "text-[#087443]"}`}>{visibilityMessage.text}</p> : null}
        </fieldset> : null}
        {!compact ? <p className="mt-5 border-t border-white/10 pt-4 text-sm leading-6 text-white/50">
          Your saved photo follows your account across devices. Choose where to show it in Profile settings.
        </p> : null}
        {error && !editing ? <p role="alert" className="mt-3 text-sm leading-5 text-amber-200">{error}</p> : null}
      </article>

      {editing && draftPhoto ? createPortal(
        <div ref={editorRef} className={`${popupStyles.overlay} ${photoStyles.overlay} fixed inset-0 z-[160] grid place-items-center bg-black/75 p-4`} role="dialog" aria-modal="true" aria-labelledby="photo-editor-title">
          <div className={`${popupStyles.surface} ${photoStyles.editorSurface} w-full max-w-md rounded-[28px] border border-cyan-300/25 bg-[#052447] shadow-2xl`}>
            <div className={photoStyles.heading}>
              <h2 id="photo-editor-title" className="text-2xl font-black text-white">Adjust your photo</h2>
              <p className="mt-2 text-sm text-white/60">Drag to reposition it, then use the slider to resize it.</p>
            </div>
            <div
              className={`${photoStyles.cropArea} relative touch-none cursor-move overflow-hidden rounded-full border-4 border-cyan-300 bg-[#00132e]`}
              aria-label="Photo crop preview"
              onPointerDown={beginDrag}
              onPointerMove={movePhoto}
              onPointerUp={() => { dragRef.current = null; }}
              onPointerCancel={() => { dragRef.current = null; }}
            >
              <AvatarImage photo={draftPhoto} crop={draftCrop} />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,.35)]" />
            </div>
            <div className={photoStyles.controls}>
              <label htmlFor="profile-photo-zoom" className="block text-sm font-bold text-white">
                Photo size
              </label>
              <input
                ref={zoomRef}
                id="profile-photo-zoom"
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={draftCrop.zoom}
                onChange={(event) => setDraftCrop((current) => ({ ...current, zoom: Number(event.target.value) }))}
                className="mt-2 block min-h-6 w-full accent-cyan-300"
              />
              {error ? <p role="alert" className="mt-3 text-sm leading-5 text-amber-200">{error}</p> : null}
            </div>
            <div className={photoStyles.actions}>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setEditing(false)} className="min-h-12 rounded-xl border border-white/20 text-sm font-bold text-white hover:bg-white/8">
                  Cancel
                </button>
                <button type="button" disabled={saving} onClick={savePhoto} className="min-h-12 rounded-xl bg-[#31e800] text-sm font-black text-[#002719] hover:bg-[#72ff4e] disabled:cursor-wait disabled:opacity-60">
                  {saving ? "Saving…" : "Save photo"}
                </button>
              </div>
              <button type="button" onClick={() => inputRef.current?.click()} className="mt-2 min-h-11 w-full text-sm font-bold text-cyan-300 hover:text-cyan-100">
                Choose a different photo
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
