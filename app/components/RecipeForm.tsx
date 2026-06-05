"use client";

import { useState } from "react";
import TagSelector from "./TagSelector";
import styles from "./RecipeForm.module.css";

export type RecipeFormValues = {
  title: string;
  author: string;
  cook_time: string;
  rating: string;
  image_url: string;
  description: string;
  status: "to_try" | "made_it" | "favorite";
  tags: string[];
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
};

export default function RecipeForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  saving = false,
  statusOptions = ["to_try", "favorite"],
}: Props) {
  const [title, setTitle] = useState(initialValues.title);
  const [author, setAuthor] = useState(initialValues.author);
  const [cookTime, setCookTime] = useState(initialValues.cook_time);
  const [rating, setRating] = useState(initialValues.rating);
  const [imageUrl, setImageUrl] = useState(initialValues.image_url);
  const [description, setDescription] = useState(initialValues.description);
  const [status, setStatus] = useState<StatusOption>(initialValues.status);
  const [tags, setTags] = useState<string[]>(initialValues.tags);

  function handleSubmit() {
    onSubmit({ title, author, cook_time: cookTime, rating, image_url: imageUrl, description, status, tags });
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
          <label className={styles.label}>Author</label>
          <input
            className={styles.input}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="e.g. Samin Nosrat"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Cook time</label>
          <input
            className={styles.input}
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
            placeholder="e.g. 30 min"
          />
        </div>
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
      <div className={styles.field}>
        <label className={styles.label}>Description</label>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A short description…"
          rows={3}
        />
      </div>

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
