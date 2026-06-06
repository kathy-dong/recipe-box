"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Recipe } from "@/lib/supabase";
import type { ToastItem } from "./Toast";
import RecipeForm, { type RecipeFormValues } from "./RecipeForm";
import styles from "./EditRecipeModal.module.css";

type Props = {
  recipe: Recipe;
  onClose: () => void;
  onSaved: (updated: Recipe) => void;
  showToast: (message: string, type?: ToastItem["type"]) => void;
};

export default function EditRecipeModal({ recipe, onClose, onSaved, showToast }: Props) {
  const [saving, setSaving] = useState(false);

  const initialValues: RecipeFormValues = {
    title: recipe.title,
    author: recipe.author ?? "",
    cook_time: recipe.cook_time ?? "",
    rating: recipe.rating ?? "",
    image_url: recipe.image_url ?? "",
    description: recipe.description ?? "",
    status: recipe.status,
    tags: recipe.tags ?? [],
  };

  async function handleSave(values: RecipeFormValues) {
    setSaving(true);

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
        />
      </div>
    </div>
  );
}
