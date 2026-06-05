"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Recipe } from "@/lib/supabase";
import RecipeCard from "./components/RecipeCard";
import AddRecipeModal from "./components/AddRecipeModal";
import EditRecipeModal from "./components/EditRecipeModal";
import DeleteConfirmDialog from "./components/DeleteConfirmDialog";
import FilterBar from "./components/FilterBar";
import Toast, { type ToastItem } from "./components/Toast";
import styles from "./page.module.css";

type Tab = "all" | "to_try" | "made_it" | "favorite";

let toastCounter = 0;

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<Recipe | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (mobileSearchOpen) searchInputRef.current?.focus();
  }, [mobileSearchOpen]);

  // Tab counts (unaffected by tag/search filters)
  const allCount = recipes.length;
  const toTryCount = recipes.filter((r) => r.status === "to_try").length;
  const madeItCount = recipes.filter((r) => r.status === "made_it").length;
  const favCount = recipes.filter((r) => r.status === "favorite").length;

  const displayRecipes = recipes.filter((r) => {
    if (tab !== "all" && r.status !== tab) return false;
    if (activeTags.length > 0 && !activeTags.every((t) => r.tags.includes(t))) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const haystack = [r.title, r.author, r.source_site, r.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // --- Handlers ---

  function handleAdded(recipe: Recipe) {
    setRecipes((prev) => [recipe, ...prev]);
  }

  async function handleToggleFavorite(id: string) {
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return;
    // to_try → favorite, made_it → favorite, favorite → made_it
    const newStatus: Recipe["status"] =
      recipe.status === "favorite" ? "made_it" : "favorite";

    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));

    const { error } = await supabase.from("recipes").update({ status: newStatus }).eq("id", id);
    if (error) {
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

    setDeletingIds((prev) => new Set([...prev, id]));
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
        <div className={styles.headerInner}>
          {mobileSearchOpen ? (
            <div className={styles.mobileSearchBar}>
              <SearchIcon />
              <input
                ref={searchInputRef}
                className={styles.mobileSearchInput}
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                className={styles.mobileSearchClose}
                onClick={() => { setMobileSearchOpen(false); setSearchQuery(""); }}
                aria-label="Close search"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <h1 className={styles.siteTitle}>Sam & Kathy&apos;s Recipes</h1>
              <div className={styles.headerRight}>
                <div className={styles.desktopSearch}>
                  <SearchIcon />
                  <input
                    className={styles.searchInput}
                    placeholder="Search recipes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  className={styles.mobileSearchBtn}
                  onClick={() => setMobileSearchOpen(true)}
                  aria-label="Search"
                >
                  <SearchIcon />
                </button>
                <button className={styles.addBtn} onClick={() => setAddOpen(true)}>
                  + Add Recipe
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <nav className={styles.tabs}>
        <div className={styles.tabsInner}>
          {(["all", "to_try", "made_it", "favorite"] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = {
              all: "All",
              to_try: "To Try",
              made_it: "Made It",
              favorite: "Favorites",
            };
            const counts: Record<Tab, number> = {
              all: allCount,
              to_try: toTryCount,
              made_it: madeItCount,
              favorite: favCount,
            };
            return (
              <button
                key={t}
                className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
                onClick={() => setTab(t)}
              >
                {labels[t]} <span className={styles.tabCount}>({counts[t]})</span>
              </button>
            );
          })}
        </div>
      </nav>

      <FilterBar activeTags={activeTags} onChange={setActiveTags} />

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
            <p>No recipes match your filters.</p>
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

      <button className={styles.fab} onClick={() => setAddOpen(true)} aria-label="Add recipe">
        +
      </button>

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

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
