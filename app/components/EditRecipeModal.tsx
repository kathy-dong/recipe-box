"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Recipe, CookLogEntry } from "@/lib/supabase";
import type { ToastItem } from "./Toast";
import RecipeForm, { type RecipeFormValues } from "./RecipeForm";
import styles from "./EditRecipeModal.module.css";

type Props = {
  recipe: Recipe;
  onClose: () => void;
  onSaved: (updated: Recipe) => void;
  showToast: (message: string, type?: ToastItem["type"]) => void;
  onCookDeleted?: (recipeId: string, remainingCount: number, newLastDate: string | null) => void;
};

function OurRatingPicker({
  rating,
  onChange,
}: {
  rating: number | null;
  onChange: (r: number | null) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? rating ?? 0;

  return (
    <div className={styles.ratingPicker}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`${styles.ratingStarBtn} ${n <= display ? styles.ratingStarBtnFilled : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(n === rating ? null : n)}
          aria-label={n === rating ? "Clear rating" : `Rate ${n} star${n !== 1 ? "s" : ""}`}
        >
          {n <= display ? "★" : "☆"}
        </button>
      ))}
      {rating !== null && (
        <button
          type="button"
          className={styles.clearRatingBtn}
          onClick={() => onChange(null)}
          aria-label="Clear rating"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function formatCookDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const thisYear = new Date().getFullYear();
  const opts: Intl.DateTimeFormatOptions =
    year === thisYear
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" };
  return date.toLocaleDateString("en-US", opts);
}

function extractStoragePath(photoUrl: string): string | null {
  const match = photoUrl.match(/\/public\/cook-photos\/(.+)$/);
  return match ? match[1] : null;
}

function SmallTrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export default function EditRecipeModal({ recipe, onClose, onSaved, showToast, onCookDeleted }: Props) {
  const [activeTab, setActiveTab] = useState<"edit" | "history">("edit");
  const [saving, setSaving] = useState(false);
  const [ourRating, setOurRating] = useState<number | null>(recipe.our_rating);
  const [cookLog, setCookLog] = useState<CookLogEntry[]>([]);
  const [cookLogLoading, setCookLogLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (activeTab !== "history") return;
    setCookLogLoading(true);
    supabase
      .from("cook_log")
      .select("*, cook_log_photos(*)")
      .eq("recipe_id", recipe.id)
      .order("cooked_on", { ascending: false })
      .then(({ data }) => {
        setCookLog((data as CookLogEntry[]) ?? []);
        setCookLogLoading(false);
      });
  }, [activeTab, recipe.id]);

  const initialValues: RecipeFormValues = {
    title: recipe.title,
    cook_time: recipe.cook_time ?? "",
    rating: recipe.rating ?? "",
    image_url: recipe.image_url ?? "",
    status: recipe.status,
    tags: recipe.tags ?? [],
    notes: recipe.notes ?? "",
    ingredients: (recipe.ingredients ?? []).join("\n"),
  };

  async function handleSave(values: RecipeFormValues) {
    setSaving(true);

    const ingredientsList = values.ingredients
      ? values.ingredients.split("\n").map((s) => s.trim()).filter(Boolean)
      : [];

    const { data, error } = await supabase
      .from("recipes")
      .update({
        title: values.title.trim(),
        cook_time: values.cook_time.trim() || null,
        image_url: values.image_url.trim() || null,
        status: values.status,
        tags: values.tags,
        notes: values.notes.trim() || null,
        ingredients: ingredientsList,
        our_rating: ourRating,
      })
      .eq("id", recipe.id)
      .select()
      .single();

    setSaving(false);

    if (error || !data) {
      showToast("Something went wrong — please try again.", "error");
      return;
    }

    onSaved(data as Recipe);
    onClose();
  }

  async function handleDeleteEntry(entry: CookLogEntry) {
    setConfirmingDelete(null);

    // Delete photos from Storage (rows are handled by CASCADE)
    if (entry.cook_log_photos.length > 0) {
      const paths = entry.cook_log_photos
        .map((p) => extractStoragePath(p.photo_url))
        .filter((p): p is string => p !== null);
      if (paths.length > 0) {
        await supabase.storage.from("cook-photos").remove(paths);
      }
    }

    const { error } = await supabase.from("cook_log").delete().eq("id", entry.id);
    if (error) {
      showToast("Couldn't delete entry — please try again.", "error");
      return;
    }

    const newLog = cookLog.filter((e) => e.id !== entry.id);
    setCookLog(newLog);

    const lastDate = newLog.length > 0 ? newLog[0].cooked_on : null;
    onCookDeleted?.(recipe.id, newLog.length, lastDate);

    showToast("Cook log entry deleted", "success");
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.modalTitle}>Edit Recipe</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "edit" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("edit")}
          >
            Edit
          </button>
          <button
            className={`${styles.tab} ${activeTab === "history" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("history")}
          >
            History{cookLog.length > 0 ? ` (${cookLog.length})` : ""}
          </button>
        </div>

        {activeTab === "edit" ? (
          <div className={styles.editTab}>
            <div className={styles.ratingField}>
              <span className={styles.ratingLabel}>Our Rating</span>
              <OurRatingPicker rating={ourRating} onChange={setOurRating} />
            </div>

            <RecipeForm
              initialValues={initialValues}
              onSubmit={handleSave}
              onCancel={onClose}
              submitLabel="Save Changes"
              saving={saving}
              statusOptions={["to_try", "made_it", "favorite"]}
              showNotes
            />
          </div>
        ) : (
          <div className={styles.historyTab}>
            {cookLogLoading ? (
              <p className={styles.historyEmpty}>Loading…</p>
            ) : cookLog.length === 0 ? (
              <p className={styles.historyEmpty}>
                Not cooked yet — log your first cook from the recipe card.
              </p>
            ) : (
              <ul className={styles.cookLogList}>
                {cookLog.map((entry) => (
                  <li key={entry.id} className={styles.cookLogEntry}>
                    {confirmingDelete === entry.id ? (
                      <div className={styles.deleteConfirm}>
                        <span>Delete this entry?</span>
                        <button
                          className={styles.deleteConfirmBtn}
                          onClick={() => handleDeleteEntry(entry)}
                        >
                          Yes
                        </button>
                        <span className={styles.deleteConfirmDot}>·</span>
                        <button
                          className={styles.deleteConfirmBtn}
                          onClick={() => setConfirmingDelete(null)}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className={styles.cookLogEntryHeader}>
                          <span className={styles.cookLogDate}>{formatCookDate(entry.cooked_on)}</span>
                          <button
                            className={styles.deleteEntryBtn}
                            onClick={() => setConfirmingDelete(entry.id)}
                            aria-label="Delete entry"
                          >
                            <SmallTrashIcon />
                          </button>
                        </div>
                        {entry.notes && (
                          <p className={styles.cookLogNotes}>{entry.notes}</p>
                        )}
                        {entry.cook_log_photos.length > 0 && (
                          <div className={styles.cookLogPhotos}>
                            {entry.cook_log_photos.map((photo) => (
                              <a
                                key={photo.id}
                                href={photo.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.cookLogPhotoLink}
                              >
                                <img
                                  src={photo.photo_url}
                                  alt={photo.caption ?? "Cook photo"}
                                  className={styles.cookLogPhoto}
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
