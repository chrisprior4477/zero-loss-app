"use client";

import { useState, useTransition } from "react";
import { menuLayouts } from "@/lib/navigation/menu-layout";
import { saveMenuLayout } from "@/lib/account/menu-layout-action";
import { useMenuLayout } from "@/components/layout/MenuLayoutProvider";
import { MenuLayoutPreview, type MenuPreviewAccount } from "./MenuLayoutPreview";
import styles from "./menu-layout-picker.module.css";

const emptyPreview: MenuPreviewAccount = { count: 0, balance: "$0.00", avatarUrl: null, showPhoto: false };

export function MenuLayoutPicker({ previewAccount = emptyPreview }: { previewAccount?: MenuPreviewAccount }) {
  const { layout, savedLayout, preview, keep, cancel } = useMenuLayout();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [previewChoice, setPreviewChoice] = useState(0);
  const current = menuLayouts.find(option => option.id === layout)!;
  const changed = layout !== savedLayout;

  function save() {
    const chosen = layout;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await saveMenuLayout(chosen);
        if (!result.ok) { setMessage({ text: result.message, error: true }); return; }
        keep(chosen);
        setMessage({ text: "Your menu choice is saved.", error: false });
      } catch { setMessage({ text: "Your menu choice could not be saved. Please try again.", error: true }); }
    });
  }

  return <section id="personalize-menu" className={styles.ticket} aria-labelledby="personalize-menu-heading">
      <div><span className={styles.eyebrow}>MAKE IT YOURS</span><h2 id="personalize-menu-heading">Personalize your top menu</h2><span className={styles.summaryText}>Choose how your menu and search look.</span><span className={styles.current}>Current style: {menuLayouts.find(option => option.id === savedLayout)!.name}</span></div>
      <div className={styles.content}>
        <p>Choose a style to reveal its interactive preview. Your top menu changes live too.</p>
        <fieldset disabled={pending} className={styles.options}>
          <legend className="sr-only">Choose your top menu style</legend>
          {menuLayouts.map((option, index) => <label key={option.id} className={styles.option} data-selected={option.id === layout}>
            <input type="radio" name="menu-layout" aria-label={`${index + 1}. ${option.name}`} value={option.id} checked={option.id === layout} onChange={() => { preview(option.id); setMessage(null); setPreviewChoice(value => value + 1); }} onClick={() => { if (option.id === layout) setPreviewChoice(value => value + 1); }} />
            <span className={styles.number}>{index + 1}</span><span><strong>{option.name}</strong><small>{option.rows}</small></span>
          </label>)}
        </fieldset>
        {previewChoice > 0 ? <>
        <MenuLayoutPreview key={`${layout}:${previewChoice}`} layout={layout} account={previewAccount} />
        <p className={styles.description}>{current.description}</p>
        <div className={styles.actions}>
          <button type="button" disabled={pending || !changed} onClick={save}>{pending ? "Saving…" : changed ? "Keep this layout" : "Your saved layout"}</button>
          <button type="button" disabled={pending} onClick={() => { cancel(); setMessage(null); setPreviewChoice(0); }}>{changed ? "Cancel preview" : "Close preview"}</button>
        </div>
        <p className={styles.status} role={message?.error ? "alert" : "status"} data-error={message?.error}>{message?.text ?? (changed ? "You’re trying this style. Keep it when you’re ready." : "You can come back and change this anytime.")}</p>
        </> : null}
      </div>
  </section>;
}
