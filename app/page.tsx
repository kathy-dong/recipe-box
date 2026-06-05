"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Recipe } from "@/lib/supabase";
import RecipeCard from "./components/RecipeCard";
import AddRecipeModal from "./components/AddRecipeModal";
import EditRecipeModal from "./components/EditRecipeModal";
import DeleteConfirmDialog from "./components/DeleteConfirmDialog";
import Toast, { type ToastItem } from "./components/Toast";
import styles from "./page.module.css";

type Tab = "all" | "to_try" | "favorite";

let toastCounter = 0;

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<Recipe | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastItem["type"] = "error") => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("recipes")
        .select("*")
        .order("added_at", { ascending: false });
      setRecipes((data as Recipe[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // Tab counts
  const allCount = recipes.length;
  const toTryCount = recipes.filter((r) => r.status === "to_try").length;
  const favCount = recipes.filter((r) => r.status === "favorite").length;

  const displayRecipes = recipes.filter((r) => {
    if (tab === "all") return true;
    return r.status === tab;
  });

  // --- Handlers ---

  function handleAdded(recipe: Recipe) {
    setRecipes((prev) => [recipe, ...prev]);
  }

  async function handleToggleFavorite(id: string) {
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return;
    const newStatus = recipe.status === "favorite" ? "to_try" : "favorite";

    // Optimistic
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));

    const { error } = await supabase.from("recipes").update({ status: newStatus }).eq("id", id);
    if (error) {
      // Revert
      setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, status: recipe.status } : r)));
      showToast("Couldn't update — please try again.");
    }
  }

  function handleEditOpen(recipe: Recipe) {
    setEditingRecipe(recipe);
  }

  function handleEditSaved(updated: Recipe) {
    setRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setEditingRecipe(null);
  }

  function handleDeleteOpen(recipe: Recipe) {
    setDeletingRecipe(recipe);
  }

  async function handleDeleteConfirm() {
    if (!deletingRecipe) return;
    const { id } = deletingRecipe;
    const snapshot = deletingRecipe;
    setDeletingRecipe(null);

    // Start fade-out animation
    setDeletingIds((prev) => new Set([...prev, id]));

    // Remove from state after animation
    setTimeout(() => {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);

    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) {
      // Revert
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setRecipes((prev) => {
        if (prev.find((r) => r.id === id)) return prev;
        return [snapshot, ...prev];
      });
      showToast("Couldn't delete — please try again.");
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.siteTitle}>Sam & Kathy&apos;s Recipes</h1>
        <button className={styles.addBtn} onClick={() => setAddOpen(true)}>
          + Add Recipe
        </button>
      </header>

      <nav className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "all" ? styles.tabActive : ""}`}
          onClick={() => setTab("all")}
        >
          All <span className={styles.tabCount}>({allCount})</span>
        </button>
        <button
          className={`${styles.tab} ${tab === "to_try" ? styles.tabActive : ""}`}
          onClick={() => setTab("to_try")}
        >
          To Try <span className={styles.tabCount}>({toTryCount})</span>
        </button>
        <button
          className={`${styles.tab} ${tab === "favorite" ? styles.tabActive : ""}`}
          onClick={() => setTab("favorite")}
        >
          Favorites <span className={styles.tabCount}>({favCount})</span>
        </button>
      </nav>

      {loading ? (
        <div className={styles.loading}>Loading recipes…</div>
      ) : displayRecipes.length === 0 ? (
        <div className={styles.empty}>
          {recipes.length === 0 ? (
            <>
              <p>No recipes yet.</p>
              <button className={styles.emptyAddBtn} onClick={() => setAddOpen(true)}>
                Add your first recipe
              </button>
            </>
          ) : (
            <p>No recipes in this list.</p>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {displayRecipes.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              isDeleting={deletingIds.has(r.id)}
              onToggleFavorite={handleToggleFavorite}
              onEdit={handleEditOpen}
              onDelete={handleDeleteOpen}
            />
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      <button className={styles.fab} onClick={() => setAddOpen(true)} aria-label="Add recipe">
        +
      </button>

      {/* Modals */}
      {addOpen && (
        <AddRecipeModal onClose={() => setAddOpen(false)} onAdded={handleAdded} />
      )}
      {editingRecipe && (
        <EditRecipeModal
          recipe={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSaved={handleEditSaved}
        />
      )}
      {deletingRecipe && (
        <DeleteConfirmDialog
          title={deletingRecipe.title}
          onCancel={() => setDeletingRecipe(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
