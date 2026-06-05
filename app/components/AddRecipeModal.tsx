"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Recipe } from "@/lib/supabase";
import RecipeForm, { type RecipeFormValues } from "./RecipeForm";
import styles from "./AddRecipeModal.module.css";

type ParsedData = {
  title?: string | null;
  image_url?: string | null;
  author?: string | null;
  cook_time?: string | null;
  rating?: string | null;
  rating_count?: string | null;
  description?: string | null;
  source_site?: string | null;
  is_video?: boolean;
};

const EMPTY_FORM: RecipeFormValues = {
  title: "",
  author: "",
  cook_time: "",
  rating: "",
  image_url: "",
  description: "",
  status: "to_try",
  tags: [],
};

type Props = {
  onClose: () => void;
  onAdded: (recipe: Recipe) => void;
};

export default function AddRecipeModal({ onClose, onAdded }: Props) {
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [formValues, setFormValues] = useState<RecipeFormValues>(EMPTY_FORM);
  const [duplicateError, setDuplicateError] = useState(false);
  const [saving, setSaving] = useState(false);

  const showForm = parsed !== null || fetchError !== "";

  async function handleFetch() {
    if (!url.trim()) return;
    setFetching(true);
    setFetchError("");
    setDuplicateError(false);
    setParsed(null);

    try {
      const res = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFetchError("Couldn't read that page — you can fill in the details manually.");
        setParsed({});
        setFormValues(EMPTY_FORM);
      } else {
        setParsed(data);
        setFormValues({
          title: data.title ?? "",
          author: data.author ?? "",
          cook_time: data.cook_time ?? "",
          rating: data.rating ?? "",
          image_url: data.image_url ?? "",
          description: data.description ?? "",
          status: "to_try",
          tags: data.suggested_tags ?? [],
        });
      }
    } catch {
      setFetchError("Couldn't read that page — you can fill in the details manually.");
      setParsed({});
      setFormValues(EMPTY_FORM);
    } finally {
      setFetching(false);
    }
  }

  async function handleSave(values: RecipeFormValues) {
    setSaving(true);
    setDuplicateError(false);

    const { data: existing } = await supabase
      .from("recipes")
      .select("id")
      .eq("url", url.trim())
      .maybeSingle();

    if (existing) {
      setDuplicateError(true);
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("recipes")
      .insert({
        url: url.trim(),
        title: values.title.trim(),
        image_url: values.image_url.trim() || null,
        author: values.author.trim() || null,
        cook_time: values.cook_time.trim() || null,
        rating: values.rating.trim() || null,
        rating_count: parsed?.rating_count ?? null,
        description: values.description.trim() || null,
        source_site: parsed?.source_site ?? null,
        is_video: parsed?.is_video ?? false,
        status: values.status,
        tags: values.tags,
      })
      .select()
      .single();

    setSaving(false);

    if (error || !data) {
      if (error?.code === "23505") setDuplicateError(true);
      return;
    }

    onAdded(data as Recipe);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.modalTitle}>Add a Recipe</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.urlRow}>
          <input
            className={styles.urlInput}
            type="url"
            placeholder="Paste a recipe URL…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            disabled={fetching}
          />
          <button
            className={styles.fetchBtn}
            onClick={handleFetch}
            disabled={fetching || !url.trim()}
          >
            {fetching ? <span className={styles.spinner} /> : "Fetch Recipe"}
          </button>
        </div>

        {fetchError && <p className={styles.errorMsg}>{fetchError}</p>}
        {duplicateError && <p className={styles.duplicateMsg}>This recipe is already in your box!</p>}

        {showForm && (
          <RecipeForm
            key={url}
            initialValues={formValues}
            onSubmit={handleSave}
            onCancel={onClose}
            submitLabel="Save Recipe"
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
