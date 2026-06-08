"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Recipe } from "@/lib/supabase";
import type { ToastItem } from "./Toast";
import styles from "./CookLogModal.module.css";

type Props = {
  recipe: Recipe;
  onClose: () => void;
  onLogged: (recipeId: string, cookedOn: string) => void;
  showToast: (message: string, type?: ToastItem["type"]) => void;
};

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CookLogModal({ recipe, onClose, onLogged, showToast }: Props) {
  const [cookedOn, setCookedOn] = useState(todayString());
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter((f) => {
      if (f.size > 10 * 1024 * 1024) {
        showToast(`${f.name} is too large (max 10 MB)`, "error");
        return false;
      }
      if (!f.type.startsWith("image/")) {
        showToast(`${f.name} is not an image`, "error");
        return false;
      }
      return true;
    });
    setPhotos((prev) => [...prev, ...valid]);
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/upload-photo", { method: "POST", body: form });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url ?? null;
    } catch {
      return null;
    }
  }

  async function handleSave() {
    if (!cookedOn) return;
    setSaving(true);

    // Insert cook_log entry
    const { data: logEntry, error: logErr } = await supabase
      .from("cook_log")
      .insert({
        recipe_id: recipe.id,
        cooked_on: cookedOn,
        notes: notes.trim() || null,
      })
      .select()
      .single();

    if (logErr || !logEntry) {
      showToast("Couldn't save cook log — please try again.", "error");
      setSaving(false);
      return;
    }

    // Upload photos and insert cook_log_photos rows
    if (photos.length > 0) {
      const urls = await Promise.all(photos.map(uploadPhoto));
      const photoRows = urls
        .filter((url): url is string => url !== null)
        .map((photo_url) => ({ cook_log_id: logEntry.id, photo_url }));

      if (photoRows.length > 0) {
        await supabase.from("cook_log_photos").insert(photoRows);
      }

      if (urls.some((u) => u === null)) {
        showToast("Some photos failed to upload", "error");
      }
    }

    // If recipe was "to_try", bump it to "made_it"
    if (recipe.status === "to_try") {
      await supabase.from("recipes").update({ status: "made_it" }).eq("id", recipe.id);
    }

    showToast("Cook logged!", "success");
    onLogged(recipe.id, cookedOn);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Log a cook</h2>
            <p className={styles.recipeName}>{recipe.title}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Date</label>
          <input
            type="date"
            className={styles.input}
            value={cookedOn}
            onChange={(e) => setCookedOn(e.target.value)}
            max={todayString()}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Notes <span className={styles.optional}>optional</span></label>
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it turn out? Any tweaks?"
            rows={3}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Photos <span className={styles.optional}>optional</span></label>
          <div
            className={styles.photoDropZone}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className={styles.fileInput}
              onChange={(e) => handleFiles(e.target.files)}
            />
            <span className={styles.photoDropIcon}>📷</span>
            <span className={styles.photoDropText}>Tap to add photos</span>
          </div>
          {photos.length > 0 && (
            <div className={styles.photoPreviewList}>
              {photos.map((file, idx) => (
                <div key={idx} className={styles.photoPreview}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className={styles.photoThumb}
                  />
                  <button
                    className={styles.removePhotoBtn}
                    onClick={() => removePhoto(idx)}
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || !cookedOn}
          >
            {saving ? "Saving…" : "Log Cook"}
          </button>
        </div>
      </div>
    </div>
  );
}
