"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Recipe, CookLogEntry } from "@/lib/supabase";
import type { ToastItem } from "./Toast";
import RecipeForm, { type RecipeFormValues } from "./RecipeForm";
import styles from "./EditRecipeModal.module.css";

type RatingInfo = {
  myRating: number | null;
  otherRating: number | null;
  myInitial: string;
  otherInitial: string;
};

type Props = {
  recipe: Recipe;
  onClose: () => void;
  onSaved: (updated: Recipe) => void;
  showToast: (message: string, type?: ToastItem["type"]) => void;
  ratingInfo?: RatingInfo;
  onRate?: (recipeId: string, rating: number) => void;
};

function StarPicker({
  rating,
  onChange,
}: {
  rating: number | null;
  onChange: (r: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? rating ?? 0;
  return (
    <span className={styles.starPicker}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`${styles.starBtn} ${n <= display ? styles.starFilled : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          {n <= display ? "★" : "☆"}
        </button>
      ))}
    </span>
  );
}

function formatCookDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const thisYear = new Date().getFullYear();
  const opts: Intl.DateTimeFormatOptions =
    year === thisYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" };
  return date.toLocaleDateString("en-US", opts);
}

export default function EditRecipeModal({ recipe, onClose, onSaved, showToast, ratingInfo, onRate }: Props) {
  const [saving, setSaving] = useState(false);
  const [cookLog, setCookLog] = useState<CookLogEntry[]>([]);
  const [cookLogLoading, setCookLogLoading] = useState(false);

  useEffect(() => {
    async function fetchCookLog() {
      setCookLogLoading(true);
      const { data } = await supabase
        .from("cook_log")
        .select("*, cook_log_photos(*)")
        .eq("recipe_id", recipe.id)
        .order("cooked_on", { ascending: false });
      setCookLog((data as CookLogEntry[]) ?? []);
      setCookLogLoading(false);
    }
    fetchCookLog();
  }, [recipe.id]);

  const initialValues: RecipeFormValues = {
    title: recipe.title,
    author: recipe.author ?? "",
    cook_time: recipe.cook_time ?? "",
    rating: recipe.rating ?? "",
    image_url: recipe.image_url ?? "",
    description: recipe.description ?? "",
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

    const { data, error: err } = await supabase
      .from("recipes")
      .update({
        title: values.title.trim(),
        author: values.author.trim() || null,
        cook_time: values.cook_time.trim() || null,
        rating: values.rating.trim() || null,
        image_url: values.image_url.trim() || null,
        description: values.description.trim() || null,
        status: values.status,
        tags: values.tags,
        notes: values.notes.trim() || null,
        ingredients: ingredientsList,
      })
      .eq("id", recipe.id)
      .select()
      .single();

    setSaving(false);

    if (err || !data) {
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

        <RecipeForm
          initialValues={initialValues}
          onSubmit={handleSave}
          onCancel={onClose}
          submitLabel="Save Changes"
          saving={saving}
          statusOptions={["to_try", "made_it", "favorite"]}
          showNotes
        />

        {/* Personal ratings */}
        {ratingInfo && (
          <div className={styles.ratingsSection}>
            <h3 className={styles.sectionTitle}>Personal ratings</h3>
            <div className={styles.ratingsGrid}>
              {ratingInfo.myInitial && (
                <div className={styles.ratingRow}>
                  <span className={styles.ratingInitial}>{ratingInfo.myInitial}</span>
                  <StarPicker
                    rating={ratingInfo.myRating}
                    onChange={(r) => onRate?.(recipe.id, r)}
                  />
                  {ratingInfo.myRating === null && (
                    <span className={styles.ratingEmpty}>not rated</span>
                  )}
                </div>
              )}
              {ratingInfo.otherInitial && (
                <div className={styles.ratingRow}>
                  <span className={styles.ratingInitial}>{ratingInfo.otherInitial}</span>
                  <span className={styles.staticStars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`${styles.staticStar} ${
                          ratingInfo.otherRating !== null && n <= ratingInfo.otherRating
                            ? styles.staticStarFilled
                            : ""
                        }`}
                      >
                        {ratingInfo.otherRating !== null && n <= ratingInfo.otherRating ? "★" : "☆"}
                      </span>
                    ))}
                  </span>
                  {ratingInfo.otherRating === null && (
                    <span className={styles.ratingEmpty}>not rated</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cook history */}
        <div className={styles.cookHistorySection}>
          <h3 className={styles.sectionTitle}>
            Cook history
            {cookLog.length > 0 && (
              <span className={styles.cookCount}>{cookLog.length}×</span>
            )}
          </h3>
          {cookLogLoading ? (
            <p className={styles.cookLogEmpty}>Loading…</p>
          ) : cookLog.length === 0 ? (
            <p className={styles.cookLogEmpty}>Not cooked yet — log your first cook from the recipe card.</p>
          ) : (
            <ul className={styles.cookLogList}>
              {cookLog.map((entry) => (
                <li key={entry.id} className={styles.cookLogEntry}>
                  <div className={styles.cookLogHeader}>
                    <span className={styles.cookLogDate}>{formatCookDate(entry.cooked_on)}</span>
                    {entry.person && (
                      <span className={styles.cookLogPerson}>{entry.person}</span>
                    )}
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
