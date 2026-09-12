"use client";

import Image from "next/image";
import { ChangeEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PHOTO_KEY = "zero-loss-profile-photo";
const CROP_KEY = "zero-loss-profile-photo-crop";
const AVATAR_EVENT = "zero-loss-avatar-updated";

type Crop = { x: number; y: number; zoom: number };
const defaultCrop: Crop = { x: 0, y: 0, zoom: 1 };

function readCrop(): Crop {
  try {
    return JSON.parse(window.localStorage.getItem(CROP_KEY) ?? "") as Crop;
  } catch {
    return defaultCrop;
  }
}

function AvatarImage({ photo, crop, offsetScale = 1 }: { photo: string; crop: Crop; offsetScale?: number }) {
  return (
    <Image
      src={photo}
      alt=""
      fill
      unoptimized
      draggable={false}
      className="pointer-events-none select-none object-cover"
      style={{
        transform: `translate(${crop.x * offsetScale}px, ${crop.y * offsetScale}px) scale(${crop.zoom})`,
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
  const x = (size - width) / 2 + crop.x * 2;
  const y = (size - height) / 2 + crop.y * 2;
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
}: {
  initials: string;
  fullName: string;
  email: string;
  initialAvatarUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ x: number; y: number; cropX: number; cropY: number } | null>(null);
  const migrationStarted = useRef(false);
  const [photo, setPhoto] = useState<string | null>(initialAvatarUrl);
  const [draftPhoto, setDraftPhoto] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>(defaultCrop);
  const [draftCrop, setDraftCrop] = useState<Crop>(defaultCrop);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persistPhoto(source: string, sourceCrop: Crop) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Please sign in again before saving your photo.");

    const blob = await renderCroppedPhoto(source, sourceCrop);
    const reference = `${user.id}/avatar.webp`;
    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(reference, blob, { contentType: "image/webp", upsert: true });
    if (uploadError) throw uploadError;

    const { error: profileError } = await supabase.rpc("update_customer_profile_preferences", {
      p_updates: { avatar_reference: reference },
    });
    if (profileError) throw profileError;

    const publicUrl = supabase.storage.from("profile-photos").getPublicUrl(reference).data.publicUrl;
    const refreshedUrl = `${publicUrl}?v=${Date.now()}`;
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
    };
  }

  function movePhoto(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    setDraftCrop((current) => ({
      ...current,
      x: Math.max(-90, Math.min(90, dragRef.current!.cropX + event.clientX - dragRef.current!.x)),
      y: Math.max(-90, Math.min(90, dragRef.current!.cropY + event.clientY - dragRef.current!.y)),
    }));
  }

  async function savePhoto() {
    if (!draftPhoto) return;
    setSaving(true);
    setError(null);
    try {
      await persistPhoto(draftPhoto, draftCrop);
      setEditing(false);
    } catch {
      setError("We could not sync your photo. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function openEditor() {
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
      <article className="rounded-[28px] border border-cyan-300/20 bg-[#06264a] p-6 sm:p-7">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={openEditor}
            aria-label={photo ? "Adjust profile photo" : "Add profile photo"}
            className="group relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-cyan-300/25 bg-[#07533f] text-2xl font-black text-[#72ff9f] transition hover:border-cyan-200 focus-visible:outline focus-visible:outline-4 focus-visible:outline-cyan-300/40"
          >
            {photo ? <AvatarImage photo={photo} crop={crop} offsetScale={0.375} /> : initials}
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              Edit
            </span>
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-black text-white">{fullName}</h2>
            <p className="mt-1 break-all text-sm text-white/55">{email}</p>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} className="sr-only" aria-label="Choose a profile photo" />
            <button type="button" onClick={openEditor} className="mt-4 inline-flex min-h-10 items-center rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 text-sm font-bold text-cyan-200 transition hover:bg-cyan-300 hover:text-[#00132e]">
              {photo ? "Adjust profile photo" : "Add profile photo"}
            </button>
          </div>
        </div>
        <p className="mt-5 border-t border-white/10 pt-4 text-sm leading-6 text-white/50">
          Your photo becomes the account-menu button and follows your account across devices.
        </p>
        {error ? <p role="alert" className="mt-3 text-sm leading-5 text-amber-200">{error}</p> : null}
      </article>

      {editing && draftPhoto ? (
        <div className="fixed inset-0 z-[160] grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="photo-editor-title">
          <div className="w-full max-w-md rounded-[28px] border border-cyan-300/25 bg-[#052447] p-6 shadow-2xl">
            <h2 id="photo-editor-title" className="text-2xl font-black text-white">Adjust your photo</h2>
            <p className="mt-2 text-sm text-white/60">Drag to reposition it, then use the slider to resize it.</p>
            <div
              className="relative mx-auto mt-6 h-64 w-64 touch-none cursor-move overflow-hidden rounded-full border-4 border-cyan-300 bg-[#00132e]"
              onPointerDown={beginDrag}
              onPointerMove={movePhoto}
              onPointerUp={() => { dragRef.current = null; }}
              onPointerCancel={() => { dragRef.current = null; }}
            >
              <AvatarImage photo={draftPhoto} crop={draftCrop} />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,.35)]" />
            </div>
            <label htmlFor="profile-photo-zoom" className="mt-6 block text-sm font-bold text-white">
              Photo size
            </label>
            <input
              id="profile-photo-zoom"
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={draftCrop.zoom}
              onChange={(event) => setDraftCrop((current) => ({ ...current, zoom: Number(event.target.value) }))}
              className="mt-3 w-full accent-cyan-300"
            />
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setEditing(false)} className="min-h-12 rounded-xl border border-white/20 text-sm font-bold text-white hover:bg-white/8">
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={savePhoto} className="min-h-12 rounded-xl bg-[#31e800] text-sm font-black text-[#002719] hover:bg-[#72ff4e] disabled:cursor-wait disabled:opacity-60">
                {saving ? "Saving…" : "Save photo"}
              </button>
            </div>
            <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 w-full text-sm font-bold text-cyan-300 hover:text-cyan-100">
              Choose a different photo
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
