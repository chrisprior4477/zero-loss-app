"use client";

import { useState } from "react";
import { menuLayouts } from "@/lib/navigation/menu-layout";
import { useMenuLayout } from "@/components/layout/MenuLayoutProvider";
import { MenuLayoutPreview, type MenuPreviewAccount } from "./MenuLayoutPreview";
import styles from "./menu-layout-picker.module.css";
import type { MenuPreviewSearchResults } from "@/lib/navigation/search-examples";

const emptyPreview: MenuPreviewAccount = { count: 0, balance: "$0.00", avatarUrl: null, showPhoto: false };

export function MenuLayoutPicker({ previewAccount = emptyPreview, previewSearchResults }: { previewAccount?: MenuPreviewAccount; previewSearchResults?: MenuPreviewSearchResults }) {
  const { layout, savedLayout, preview, cancel, pending, message, clearMessage, save } = useMenuLayout();
  const [previewChoice, setPreviewChoice] = useState(0);
  const current = menuLayouts.find(option => option.id === layout)!;
  const changed = layout !== savedLayout;

  return <section id="personalize-menu" className={styles.ticket} aria-labelledby="personalize-menu-heading">
      <div><span className={styles.eyebrow}>MAKE IT YOURS</span><h2 id="personalize-menu-heading">Personalize your top menu</h2><span className={styles.summaryText}>Choose how your menu and search look.</span>
        <div className={styles.styleToolbar}>
          <span className={styles.current}>Current style: {menuLayouts.find(option => option.id === savedLayout)!.name}</span>
          <button type="button" className={styles.quickSave} disabled={pending || !changed} onClick={save}>{pending ? "Saving…" : "Keep New Layout"}</button>
        </div>
        {message ? <p className={styles.status} role={message.error ? "alert" : "status"} data-error={message.error}>{message.text}</p> : null}
      </div>
      <div className={styles.content}>
        <p>Choose a style to reveal its interactive preview. Your top menu changes live too.</p>
        <fieldset disabled={pending} className={styles.options}>
          <legend className="sr-only">Choose your top menu style</legend>
          {menuLayouts.map((option, index) => <label key={option.id} className={styles.option} data-selected={option.id === layout}>
            <input type="radio" name="menu-layout" aria-label={`${index + 1}. ${option.name}`} value={option.id} checked={option.id === layout} onChange={() => { preview(option.id); clearMessage(); setPreviewChoice(value => value + 1); }} onClick={() => { if (option.id === layout) setPreviewChoice(value => value + 1); }} />
            <span className={styles.number}>{index + 1}</span><span><strong>{option.name}</strong><small>{option.rows}</small></span>
          </label>)}
        </fieldset>
        {previewChoice > 0 ? <>
        <MenuLayoutPreview key={`${layout}:${previewChoice}`} layout={layout} account={previewAccount} searchResults={previewSearchResults} />
        <p className={styles.description}>{current.description}</p>
        <div className={styles.actions}>
          <button type="button" disabled={pending || !changed} onClick={save}>{pending ? "Saving…" : changed ? "Keep this layout" : "Your saved layout"}</button>
          <button type="button" disabled={pending} onClick={() => { cancel(); clearMessage(); setPreviewChoice(0); }}>{changed ? "Cancel preview" : "Close preview"}</button>
        </div>
        {!message ? <p className={styles.status} role="status">{changed ? "You’re trying this style. Keep it when you’re ready." : "You can come back and change this anytime."}</p> : null}
        </> : null}
      </div>
  </section>;
}
