"use client";

import { useState } from "react";
import TagSelector from "./TagSelector";
import styles from "./RecipeForm.module.css";

export type RecipeFormValues = {
  title: string;
  cook_time: string;
  rating: string; // online crowd rating — preserved but not shown as editable field
  image_url: string;
  status: "to_try" | "made_it" | "favorite";
  tags: string[];
  notes: string;
  ingredients: string; // newline-separated
};

type StatusOption = "to_try" | "made_it" | "favorite";

const STATUS_LABELS: Record<StatusOption, string> = {
  to_try: "To Try",
  made_it: "Made It",
  favorite: "♥ Favorite",
};

type Props = {
  initialValues: RecipeFormValues;
  onSubmit: (values: RecipeFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
  saving?: boolean;
  statusOptions?: StatusOption[];
  showNotes?: boolean;
};

export default function RecipeForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  saving = false,
  statusOptions = ["to_try", "made_it", "favorite"],
  showNotes = false,
}: Props) {
  const [title, setTitle] = useState(initialValues.title);
  const [cookTime, setCookTime] = useState(initialValues.cook_time);
  const [imageUrl, setImageUrl] = useState(initialValues.image_url);
  const [status, setStatus] = useState<StatusOption>(initialValues.status);
  const [tags, setTags] = useState<string[]>(initialValues.tags);
  const [notes, setNotes] = useState(initialValues.notes);
  const [ingredients, setIngredients] = useState(initialValues.ingredients);
  const [ingredientsExpanded, setIngredientsExpanded] = useState(
    !!initialValues.ingredients.trim()
  );

  function handleSubmit() {
    onSubmit({
      title,
      cook_time: cookTime,
      rating: initialValues.rating, // pass through unchanged
      image_url: imageUrl,
      status,
      tags,
      notes,
      ingredients,
    });
  }

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label}>Title *</label>
        <input
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Recipe title"
        />
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Cook time</label>
          <input
            className={styles.input}
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
            placeholder="e.g. 30 min"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Image URL</label>
          <input
            className={styles.input}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>

      {/* Collapsible ingredients */}
      <div className={styles.field}>
        <button
          type="button"
          className={styles.collapseToggle}
          onClick={() => setIngredientsExpanded((v) => !v)}
        >
          Ingredients
          <span className={styles.collapseIcon}>{ingredientsExpanded ? "▴" : "▾"}</span>
        </button>
        {ingredientsExpanded && (
          <textarea
            className={styles.textarea}
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder={"2 cups flour\n1 tsp salt\n…"}
            rows={4}
          />
        )}
      </div>

      {showNotes && (
        <div className={styles.field}>
          <label className={styles.label}>Personal notes</label>
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tips, tweaks, or memories from making this…"
            rows={3}
          />
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label}>Tags</label>
        <TagSelector selected={tags} onChange={setTags} />
      </div>

      <div className={styles.statusRow}>
        <span className={styles.label}>Status</span>
        <div className={styles.toggle}>
          {statusOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`${styles.toggleBtn} ${status === opt ? styles.toggleActive : ""}`}
              onClick={() => setStatus(opt)}
            >
              {STATUS_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={handleSubmit}
          disabled={saving || !title.trim()}
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
