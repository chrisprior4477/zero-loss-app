"use client";

import { createClient } from "@/lib/supabase/client";
import { businessFileNameLimit, materialsBucket, type BusinessFile } from "./application";

export const materialTypes = ["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/quicktime","application/pdf","text/plain","text/csv","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
// Staged bytes survive the guest's sign-in/verification round trip on this browser.
async function stagedFile(id: string, action: "read" | "write" | "remove", file?: File): Promise<File | undefined> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open("zero-loss-business-materials", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("files");
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  try {
    return await new Promise<File | undefined>((resolve, reject) => {
      const tx = db.transaction("files", action === "read" ? "readonly" : "readwrite");
      const store = tx.objectStore("files");
      const request = action === "read" ? store.get(id) : action === "remove" ? store.delete(id) : store.put(file, id);
      tx.oncomplete = () => resolve(action === "read" ? request.result : undefined);
      tx.onabort = () => reject(tx.error ?? new Error("File staging failed"));
    });
  } finally { db.close(); }
}

export async function stageMaterials(files: File[], listingIndex: number | null) {
  const rejected: string[] = [];
  const accepted = files.filter(file => {
    const name = file.name.slice(0, 80) || "Unnamed file";
    if (!file.name || file.name.length > businessFileNameLimit) {
      rejected.push(`Rename “${name}” to ${businessFileNameLimit} characters or fewer, then attach it again.`);
      return false;
    }
    if (!file.size || file.size > 50 * 1024 * 1024 || !materialTypes.includes(file.type) || (listingIndex !== null && !file.type.startsWith("image/"))) {
      rejected.push(`“${name}” was skipped. Choose a supported, nonempty file up to 50 MB. Listing photos must be JPEG, PNG, WebP or GIF.`);
      return false;
    }
    return true;
  });
  const staged: BusinessFile[] = [];
  try {
    for (const file of accepted) {
      const id = crypto.randomUUID();
      await stagedFile(id, "write", file);
      staged.push({ id, name: file.name, listingIndex, mediaType: file.type });
    }
  } catch {
    await releaseMaterials(staged);
    throw new Error("This browser could not keep the selected files. Free some device space and try again.");
  }
  return { staged, rejected };
}

export function isListingPhoto(file: BusinessFile) {
  return file.mediaType ? ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mediaType)
    : /\.(?:jpe?g|png|webp|gif)$/i.test(file.name);
}

export async function uploadMaterials(owner: string, files: BusinessFile[], uploaded: Set<string>) {
  const bucket = createClient().storage.from(materialsBucket);
  for (const item of files) {
    if (uploaded.has(item.id)) continue;
    const path = `${owner}/${item.id}`;
    const file = await stagedFile(item.id, "read").catch(() => undefined);
    if (!file) {
      if (!(await bucket.exists(path)).data) throw new Error(`Reselect ${item.name} on the device where you attached it.`);
      uploaded.add(item.id);
      continue;
    }
    const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
    // A previous upload may have completed before its response reached the browser.
    if (error && !(await bucket.exists(path)).data) throw new Error(`Could not upload ${item.name}. Your draft is still open. Try saving again.`);
    uploaded.add(item.id);
  }
}

export async function releaseMaterials(files: BusinessFile[]) {
  await Promise.allSettled(files.map(f => stagedFile(f.id, "remove")));
}

export async function downloadMaterial(owner: string, file: BusinessFile) {
  const { data, error } = await createClient().storage.from(materialsBucket).download(`${owner}/${file.id}`);
  if (error || !data) throw new Error("Download failed");
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url; link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
