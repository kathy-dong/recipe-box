"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Recipe } from "@/lib/supabase";
import { MEAL_TYPE_TAGS, ATTRIBUTE_TAGS, labelForTag } from "@/lib/tags";
import Toast, { type ToastItem } from "../components/Toast";
import BulkImportModal from "../components/BulkImportModal";
import styles from "./page.module.css";

// ─── Types ───────────────────────────────────────────────────────────────────

type SortCol = "title" | "source_site" | "cook_time" | "our_rating" | "status" | "added_at";

type PopoverState =
  | { type: "tags"; recipeId: string; rect: DOMRect }
  | { type: "status"; recipeId: string; rect: DOMRect }
  | { type: "bulk-tags"; rect: DOMRect }
  | { type: "bulk-status"; rect: DOMRect };

let toastCounter = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCookMins(str: string | null): number {
  if (!str) return Infinity;
  let mins = 0;
  const hrMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hr|hour)/i);
  const minMatch = str.match(/(\d+)\s*min/i);
  if (hrMatch) mins += parseFloat(hrMatch[1]) * 60;
  if (minMatch) mins += parseInt(minMatch[1]);
  return mins || Infinity;
}

function formatDate(str: string): string {
  return new Date(str).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(s: Recipe["status"]): string {
  if (s === "to_try") return "To Try";
  if (s === "made_it") return "Made It";
  if (s === "favorite") return "Favorite";
  return s;
}

// ─── Thumb ───────────────────────────────────────────────────────────────────

function Thumb({ imageUrl, size }: { imageUrl: string | null; size: number }) {
  const [err, setErr] = useState(false);
  const proxyUrl = imageUrl ? `/api/image-proxy?url=${encodeURIComponent(imageUrl)}` : null;
  const s = { width: size, height: size, flexShrink: 0 } as React.CSSProperties;
  if (!proxyUrl || err) {
    return (
      <div className={styles.thumbPlaceholder} style={s}>
        🍴
      </div>
    );
  }
  return (
    <img
      src={proxyUrl}
      alt=""
      className={styles.thumb}
      style={s}
      onError={() => setErr(true)}
    />
  );
}

// ─── InlineStars ─────────────────────────────────────────────────────────────

function InlineStars({
  rating,
  onChange,
}: {
  rating: number | null;
  onChange: (r: number | null) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? rating ?? 0;
  return (
    <div className={styles.inlineStars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`${styles.inlineStar} ${n <= display ? styles.inlineStarFilled : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => {
            e.stopPropagation();
            onChange(n === rating ? null : n);
          }}
        >
          {n <= display ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

// ─── TagPills ────────────────────────────────────────────────────────────────

function TagPills({ tags }: { tags: string[] }) {
  if (!tags.length) return <span className={styles.emptyCell}>—</span>;
  const visible = tags.slice(0, 3);
  const overflow = tags.length - visible.length;
  return (
    <div className={styles.tagPills}>
      {visible.map((t) => (
        <span key={t} className={styles.tagPill}>
          {labelForTag(t)}
        </span>
      ))}
      {overflow > 0 && <span className={styles.tagPill}>+{overflow}</span>}
    </div>
  );
}

// ─── PopoverWrap (portal, fixed) ─────────────────────────────────────────────

function PopoverWrap({
  rect,
  onClose,
  children,
  upward = false,
}: {
  rect: DOMRect;
  onClose: () => void;
  children: React.ReactNode;
  upward?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const maxW = 260;
  const left = Math.min(rect.left, window.innerWidth - maxW - 8);
  const style: React.CSSProperties = upward
    ? { position: "fixed", bottom: window.innerHeight - rect.top + 6, left }
    : { position: "fixed", top: rect.bottom + 6, left };

  return (
    <div ref={ref} className={styles.popover} style={style}>
      {children}
    </div>
  );
}

// ─── TagEditorContent ────────────────────────────────────────────────────────

function TagEditorContent({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  function toggle(val: string) {
    onChange(
      selected.includes(val)
        ? selected.filter((t) => t !== val)
        : [...selected, val]
    );
  }
  return (
    <div className={styles.popoverBody}>
      <div className={styles.popoverGroup}>
        <span className={styles.popoverGroupLabel}>Meal type</span>
        <div className={styles.popoverPills}>
          {MEAL_TYPE_TAGS.map((tag) => (
            <button
              key={tag.value}
              type="button"
              className={`${styles.popoverPill} ${selected.includes(tag.value) ? styles.popoverPillActive : ""}`}
              onClick={() => toggle(tag.value)}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.popoverGroup}>
        <span className={styles.popoverGroupLabel}>Attributes</span>
        <div className={styles.popoverPills}>
          {ATTRIBUTE_TAGS.map((tag) => (
            <button
              key={tag.value}
              type="button"
              className={`${styles.popoverPill} ${selected.includes(tag.value) ? styles.popoverPillActive : ""}`}
              onClick={() => toggle(tag.value)}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── StatusDropdownContent ───────────────────────────────────────────────────

const STATUS_OPTIONS: { value: Recipe["status"]; label: string }[] = [
  { value: "to_try", label: "To Try" },
  { value: "made_it", label: "Made It" },
  { value: "favorite", label: "Favorite" },
];

function StatusDropdownContent({
  current,
  onSelect,
}: {
  current: Recipe["status"] | null;
  onSelect: (s: Recipe["status"]) => void;
}) {
  return (
    <div className={styles.statusOptions}>
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`${styles.statusOption} ${current === opt.value ? styles.statusOptionActive : ""}`}
          onClick={() => onSelect(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── BulkBar ─────────────────────────────────────────────────────────────────

function BulkBar({
  count,
  onAddTags,
  onSetStatus,
  onDelete,
}: {
  count: number;
  onAddTags: (e: React.MouseEvent) => void;
  onSetStatus: (e: React.MouseEvent) => void;
  onDelete: () => void;
}) {
  return (
    <div className={styles.bulkBar}>
      <span className={styles.bulkCount}>
        {count} recipe{count !== 1 ? "s" : ""} selected
      </span>
      <div className={styles.bulkActions}>
        <button className={styles.bulkBtn} onClick={onAddTags}>
          Add Tags
        </button>
        <button className={styles.bulkBtn} onClick={onSetStatus}>
          Set Status
        </button>
        <button className={`${styles.bulkBtn} ${styles.bulkBtnDelete}`} onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── BulkDeleteConfirm ───────────────────────────────────────────────────────

function BulkDeleteConfirm({
  count,
  onCancel,
  onConfirm,
}: {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className={styles.confirmOverlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.confirmDialog}>
        <p className={styles.confirmMsg}>
          Delete <strong>{count} recipe{count !== 1 ? "s" : ""}</strong>?
        </p>
        <p className={styles.confirmSub}>This can&apos;t be undone.</p>
        <div className={styles.confirmActions}>
          <button className={styles.confirmCancel} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.confirmDelete} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({
    col: "added_at",
    dir: "desc",
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [bulkPendingTags, setBulkPendingTags] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectAllMobileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const showToast = useCallback((message: string, type: ToastItem["type"] = "success") => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .order("added_at", { ascending: false });
    setRecipes((data as Recipe[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  // Derived: filtered + sorted
  const displayRecipes = useMemo(() => {
    let list = recipes;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.source_site ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sort.col) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "source_site":
          cmp = (a.source_site ?? "").localeCompare(b.source_site ?? "");
          break;
        case "cook_time":
          cmp = parseCookMins(a.cook_time) - parseCookMins(b.cook_time);
          break;
        case "our_rating": {
          const ra = a.our_rating ?? -1;
          const rb = b.our_rating ?? -1;
          cmp = ra - rb;
          break;
        }
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "added_at":
          cmp = a.added_at.localeCompare(b.added_at);
          break;
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [recipes, search, sort]);

  // Select-all state
  const allVisibleIds = displayRecipes.map((r) => r.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));
  const someSelected = allVisibleIds.some((id) => selected.has(id)) && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
    if (selectAllMobileRef.current) selectAllMobileRef.current.indeterminate = someSelected;
  }, [someSelected]);

  function handleSort(col: SortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" }
    );
  }

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(allVisibleIds));
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Inline saves ───────────────────────────────────────────────────────────

  async function handleRating(recipeId: string, rating: number | null) {
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, our_rating: rating } : r))
    );
    await supabase.from("recipes").update({ our_rating: rating }).eq("id", recipeId);
  }

  async function handleInlineTags(recipeId: string, tags: string[]) {
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, tags } : r))
    );
    await supabase.from("recipes").update({ tags }).eq("id", recipeId);
  }

  async function handleInlineStatus(recipeId: string, status: Recipe["status"]) {
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, status } : r))
    );
    await supabase.from("recipes").update({ status }).eq("id", recipeId);
    setPopover(null);
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────

  async function applyBulkTags(tagsToAdd: string[]) {
    if (!tagsToAdd.length) { setPopover(null); return; }
    const ids = [...selected];
    const updates = ids.map((id) => {
      const r = recipes.find((x) => x.id === id)!;
      return { id, tags: Array.from(new Set([...r.tags, ...tagsToAdd])) };
    });
    setRecipes((prev) =>
      prev.map((r) => {
        const u = updates.find((x) => x.id === r.id);
        return u ? { ...r, tags: u.tags } : r;
      })
    );
    await Promise.all(
      updates.map((u) => supabase.from("recipes").update({ tags: u.tags }).eq("id", u.id))
    );
    showToast(`Tags updated for ${ids.length} recipe${ids.length !== 1 ? "s" : ""}`);
    setPopover(null);
    setBulkPendingTags([]);
  }

  async function handleBulkStatus(status: Recipe["status"]) {
    const ids = [...selected];
    setRecipes((prev) =>
      prev.map((r) => (selected.has(r.id) ? { ...r, status } : r))
    );
    await Promise.all(
      ids.map((id) => supabase.from("recipes").update({ status }).eq("id", id))
    );
    showToast(`Status updated for ${ids.length} recipe${ids.length !== 1 ? "s" : ""}`);
    setPopover(null);
  }

  async function handleBulkDelete() {
    const ids = [...selected];
    setBulkDeleteOpen(false);
    setRecipes((prev) => prev.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
    await Promise.all(ids.map((id) => supabase.from("recipes").delete().eq("id", id)));
    showToast(`${ids.length} recipe${ids.length !== 1 ? "s" : ""} deleted`);
  }

  // ── Popover openers ────────────────────────────────────────────────────────

  function openTagsPopover(e: React.MouseEvent, recipeId: string) {
    e.stopPropagation();
    setPopover({ type: "tags", recipeId, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() });
  }

  function openStatusPopover(e: React.MouseEvent, recipeId: string) {
    e.stopPropagation();
    setPopover({ type: "status", recipeId, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() });
  }

  function openBulkTagsPopover(e: React.MouseEvent) {
    e.stopPropagation();
    setBulkPendingTags([]);
    setPopover({ type: "bulk-tags", rect: (e.currentTarget as HTMLElement).getBoundingClientRect() });
  }

  function openBulkStatusPopover(e: React.MouseEvent) {
    e.stopPropagation();
    setPopover({ type: "bulk-status", rect: (e.currentTarget as HTMLElement).getBoundingClientRect() });
  }

  function closePopover() {
    setPopover(null);
    setBulkPendingTags([]);
  }

  // ── Sort header helper ─────────────────────────────────────────────────────

  function Th({ col, label }: { col: SortCol; label: string }) {
    const active = sort.col === col;
    return (
      <th
        className={`${styles.th} ${styles.thSortable} ${active ? styles.thActive : ""}`}
        onClick={() => handleSort(col)}
      >
        {label}
        {active && <span className={styles.sortArrow}>{sort.dir === "asc" ? " ▲" : " ▼"}</span>}
      </th>
    );
  }

  const selectedCount = [...selected].filter((id) => displayRecipes.some((r) => r.id === id)).length;
  // Use total selected (including hidden rows) for action bar count
  const totalSelected = selected.size;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.backLink}>
            ← Back to recipes
          </Link>
          <div className={styles.headerRight}>
            <h1 className={styles.pageTitle}>Admin</h1>
            <button className={styles.importBtn} onClick={() => setImportOpen(true)}>
              Bulk Import
            </button>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className={styles.searchInput}
              placeholder="Search by title or source…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {!loading && (
            <span className={styles.recipeCount}>
              {displayRecipes.length} recipe{displayRecipes.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading ? (
          <p className={styles.loadingMsg}>Loading recipes…</p>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thCheck}>
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        className={styles.checkbox}
                        checked={allSelected}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className={styles.thThumb}></th>
                    <Th col="title" label="Title" />
                    <Th col="source_site" label="Source" />
                    <Th col="cook_time" label="Cook Time" />
                    <Th col="our_rating" label="Rating" />
                    <Th col="status" label="Status" />
                    <th className={styles.th}>Tags</th>
                    <Th col="added_at" label="Date Added" />
                  </tr>
                </thead>
                <tbody>
                  {displayRecipes.map((recipe, i) => {
                    const isSelected = selected.has(recipe.id);
                    return (
                      <tr
                        key={recipe.id}
                        className={`${styles.tr} ${i % 2 === 1 ? styles.trAlt : ""} ${isSelected ? styles.trSelected : ""}`}
                      >
                        <td className={styles.td}>
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={isSelected}
                            onChange={() => toggleSelect(recipe.id)}
                          />
                        </td>
                        <td className={styles.td}>
                          <Thumb imageUrl={recipe.image_url} size={40} />
                        </td>
                        <td className={`${styles.td} ${styles.tdTitle}`}>
                          <a
                            href={recipe.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.titleLink}
                          >
                            {recipe.title}
                          </a>
                        </td>
                        <td className={styles.td}>
                          {recipe.source_site ?? <span className={styles.emptyCell}>—</span>}
                        </td>
                        <td className={styles.td}>
                          {recipe.cook_time ?? <span className={styles.emptyCell}>—</span>}
                        </td>
                        <td className={styles.td}>
                          <InlineStars
                            rating={recipe.our_rating}
                            onChange={(r) => handleRating(recipe.id, r)}
                          />
                        </td>
                        <td
                          className={`${styles.td} ${styles.tdClickable}`}
                          onClick={(e) => openStatusPopover(e, recipe.id)}
                        >
                          <span className={`${styles.statusBadge} ${styles[`status_${recipe.status}`]}`}>
                            {statusLabel(recipe.status)}
                          </span>
                        </td>
                        <td
                          className={`${styles.td} ${styles.tdClickable}`}
                          onClick={(e) => openTagsPopover(e, recipe.id)}
                        >
                          <TagPills tags={recipe.tags} />
                        </td>
                        <td className={`${styles.td} ${styles.tdDate}`}>
                          {formatDate(recipe.added_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {displayRecipes.length === 0 && (
                <p className={styles.emptyMsg}>No recipes match your search.</p>
              )}
            </div>

            {/* ── Mobile card list ── */}
            <div className={styles.mobileList}>
              <div className={styles.mobileSelectAll}>
                <input
                  ref={selectAllMobileRef}
                  type="checkbox"
                  className={styles.checkbox}
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
                <span className={styles.mobileSelectAllLabel}>
                  {allSelected ? "Deselect all" : "Select all"}
                </span>
              </div>
              {displayRecipes.map((recipe) => {
                const isSelected = selected.has(recipe.id);
                return (
                  <div
                    key={recipe.id}
                    className={`${styles.mobileCard} ${isSelected ? styles.mobileCardSelected : ""}`}
                  >
                    <div className={styles.mobileCardRow}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isSelected}
                        onChange={() => toggleSelect(recipe.id)}
                      />
                      <Thumb imageUrl={recipe.image_url} size={44} />
                      <div className={styles.mobileMeta}>
                        <a
                          href={recipe.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.mobileTitleLink}
                        >
                          {recipe.title}
                        </a>
                        {recipe.source_site && (
                          <span className={styles.mobileSource}>{recipe.source_site}</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.mobileCardFooter}>
                      <InlineStars
                        rating={recipe.our_rating}
                        onChange={(r) => handleRating(recipe.id, r)}
                      />
                      <button
                        className={`${styles.statusBadge} ${styles[`status_${recipe.status}`]} ${styles.statusBadgeBtn}`}
                        onClick={(e) => openStatusPopover(e, recipe.id)}
                      >
                        {statusLabel(recipe.status)}
                      </button>
                      <button
                        className={styles.mobileTagsBtn}
                        onClick={(e) => openTagsPopover(e, recipe.id)}
                      >
                        {recipe.tags.length > 0 ? (
                          <TagPills tags={recipe.tags} />
                        ) : (
                          <span className={styles.addTagsHint}>+ tags</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
              {displayRecipes.length === 0 && (
                <p className={styles.emptyMsg}>No recipes match your search.</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bulk action bar */}
      {totalSelected > 0 && (
        <BulkBar
          count={totalSelected}
          onAddTags={openBulkTagsPopover}
          onSetStatus={openBulkStatusPopover}
          onDelete={() => setBulkDeleteOpen(true)}
        />
      )}

      {/* Bulk delete confirm */}
      {bulkDeleteOpen && (
        <BulkDeleteConfirm
          count={totalSelected}
          onCancel={() => setBulkDeleteOpen(false)}
          onConfirm={handleBulkDelete}
        />
      )}

      {/* Popovers via portal */}
      {mounted &&
        popover &&
        createPortal(
          <PopoverWrap
            rect={popover.rect}
            onClose={closePopover}
            upward={popover.type === "bulk-tags" || popover.type === "bulk-status"}
          >
            {popover.type === "tags" && (() => {
              const recipe = recipes.find((r) => r.id === popover.recipeId);
              if (!recipe) return null;
              return (
                <TagEditorContent
                  selected={recipe.tags}
                  onChange={(tags) => handleInlineTags(popover.recipeId, tags)}
                />
              );
            })()}

            {popover.type === "status" && (() => {
              const recipe = recipes.find((r) => r.id === popover.recipeId);
              if (!recipe) return null;
              return (
                <StatusDropdownContent
                  current={recipe.status}
                  onSelect={(s) => handleInlineStatus(popover.recipeId, s)}
                />
              );
            })()}

            {popover.type === "bulk-tags" && (
              <>
                <TagEditorContent
                  selected={bulkPendingTags}
                  onChange={setBulkPendingTags}
                />
                <div className={styles.popoverFooter}>
                  <button
                    className={styles.popoverApplyBtn}
                    onClick={() => applyBulkTags(bulkPendingTags)}
                    disabled={bulkPendingTags.length === 0}
                  >
                    Add to {totalSelected} recipe{totalSelected !== 1 ? "s" : ""}
                  </button>
                </div>
              </>
            )}

            {popover.type === "bulk-status" && (
              <StatusDropdownContent current={null} onSelect={handleBulkStatus} />
            )}
          </PopoverWrap>,
          document.body
        )}

      {importOpen && (
        <BulkImportModal
          onClose={() => setImportOpen(false)}
          onImported={loadRecipes}
        />
      )}

      <Toast toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
