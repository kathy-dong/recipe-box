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

export default function EditRecipeModal({ recipe, onClose, onSaved, showToast }: Props) {
  const [activeTab, setActiveTab] = useState<"edit" | "history">("edit");
  const [saving, setSaving] = useState(false);
  const [ourRating, setOurRating] = useState<number | null>(recipe.our_rating);
  const [cookLog, setCookLog] = useState<CookLogEntry[]>([]);
  const [cookLogLoading, setCookLogLoading] = useState(false);

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
            {/* Our Rating — at the top */}
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
                    <span className={styles.cookLogDate}>{formatCookDate(entry.cooked_on)}</span>
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
