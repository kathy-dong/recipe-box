"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/settings-context";
import styles from "./page.module.css";

export default function SettingsPage() {
  const { appTitle, setAppTitle } = useSettings();
  const [titleInput, setTitleInput] = useState(appTitle);
  const [titleSaving, setTitleSaving] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");

  // Keep input in sync with context after initial fetch
  useEffect(() => {
    setTitleInput(appTitle);
  }, [appTitle]);

  useEffect(() => {
    setSiteUrl(window.location.origin);
  }, []);

  async function handleSaveTitle() {
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === appTitle) return;
    setTitleSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_title: trimmed }),
    });
    setTitleSaving(false);
    if (res.ok) {
      setAppTitle(trimmed);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link href="/" className={styles.backLink}>
          ← Back to recipes
        </Link>

        <h1 className={styles.pageTitle}>Settings</h1>

        {/* Recipe Box Name */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recipe Box Name</h2>
          <p className={styles.sectionDesc}>
            This name appears in the header and browser tab.
          </p>
          <div className={styles.inlineField}>
            <input
              className={styles.input}
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
              placeholder="e.g. Christie & Alan's Recipe Box"
              maxLength={80}
            />
            <button
              className={styles.saveBtn}
              onClick={handleSaveTitle}
              disabled={titleSaving || !titleInput.trim() || titleInput.trim() === appTitle}
            >
              {titleSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </section>

        {/* Quick Add Setup */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>iOS Quick Add</h2>
          <p className={styles.sectionDesc}>
            Add recipes directly from Safari using an iOS Shortcut — no need to open the app.
          </p>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>API endpoint</span>
            <code className={styles.infoValue}>{siteUrl}/api/quick-add</code>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Passkey</span>
            <span className={styles.infoValue}>
              Set <code className={styles.inlineCode}>QUICK_ADD_KEY</code> in your Vercel environment variables
            </span>
          </div>
          <Link href="/share" className={styles.linkRow}>
            View iOS Shortcut setup instructions →
          </Link>
        </section>

        {/* Recipe Management */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recipe Management</h2>
          <p className={styles.sectionDesc}>
            Bulk editing, tag management, and import tools.
          </p>
          <Link href="/admin" className={styles.adminCard}>
            <span className={styles.adminCardLeft}>
              <span className={styles.adminCardIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                  <line x1="9" y1="9" x2="9" y2="21" />
                </svg>
              </span>
              <span className={styles.adminCardText}>
                <strong>Admin View</strong>
                <span>Manage all recipes, edit tags in bulk, import recipes</span>
              </span>
            </span>
            <span className={styles.adminArrow}>→</span>
          </Link>
        </section>
      </div>
    </div>
  );
}
