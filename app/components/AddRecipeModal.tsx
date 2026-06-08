"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Recipe } from "@/lib/supabase";
import type { ToastItem } from "./Toast";
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
  suggested_tags?: string[];
  ingredients?: string[];
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
  notes: "",
  ingredients: "",
};

type Props = {
  onClose: () => void;
  onAdded: (recipe: Recipe) => void;
  showToast: (message: string, type?: ToastItem["type"]) => void;
};

export default function AddRecipeModal({ onClose, onAdded, showToast }: Props) {
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [formValues, setFormValues] = useState<RecipeFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const showForm = parsed !== null || fetchError !== "";

  async function handleFetch() {
    if (!url.trim()) return;
    setFetching(true);
    setFetchError("");
    setParsed(null);

    try {
      const res = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = "Couldn't fetch that page — try filling in the details manually.";
        setFetchError(msg);
        showToast(msg, "error");
        setParsed({});
        setFormValues(EMPTY_FORM);
      } else {
        if (data.source_site === "Instagram" && !data.title) {
          showToast("Instagram blocks automatic parsing — please fill in the details manually.", "error");
        }

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
          notes: "",
          ingredients: (data.ingredients ?? []).join("\n"),
        });
      }
    } catch {
      const msg = "Couldn't fetch that page — try filling in the details manually.";
      setFetchError(msg);
      showToast(msg, "error");
      setParsed({});
      setFormValues(EMPTY_FORM);
    } finally {
      setFetching(false);
    }
  }

  async function handleSave(values: RecipeFormValues) {
    setSaving(true);

    const { data: existing } = await supabase
      .from("recipes")
      .select("id")
      .eq("url", url.trim())
      .maybeSingle();

    if (existing) {
      showToast("This recipe is already in your box", "error");
      setSaving(false);
      return;
    }

    const ingredientsList = values.ingredients
      ? values.ingredients.split("\n").map((s) => s.trim()).filter(Boolean)
      : [];

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
        ingredients: ingredientsList,
      })
      .select()
      .single();

    setSaving(false);

    if (error || !data) {
      if (error?.code === "23505") {
        showToast("This recipe is already in your box", "error");
      } else {
        showToast("Something went wrong — please try again.", "error");
      }
      return;
    }

    onAdded(data as Recipe);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h2 className={styles.modalTitle}>Add a Recipe</h2>
            {parsed?.is_video && (
              <span className={styles.videoBadge}>▶ Video</span>
            )}
          </div>
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
