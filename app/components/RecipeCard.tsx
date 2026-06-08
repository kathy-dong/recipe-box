"use client";

import { useState } from "react";
import type { Recipe } from "@/lib/supabase";
import { MEAL_TYPE_VALUES, labelForTag } from "@/lib/tags";
import styles from "./RecipeCard.module.css";

export type CardCookInfo = {
  count: number;
  lastDate: string | null;
};

type Props = {
  recipe: Recipe;
  isDeleting?: boolean;
  onToggleFavorite: (id: string) => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  onLogCook?: (recipe: Recipe) => void;
  cookInfo?: CardCookInfo;
  onRate?: (recipeId: string, rating: number | null) => void;
};

function OurRatingStars({
  rating,
  onRate,
}: {
  rating: number | null;
  onRate?: (r: number | null) => void;
}) {
  if (rating === null) return null;

  return (
    <div className={styles.ourRating}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`${styles.ourRatingStar} ${n <= rating ? styles.ourRatingStarFilled : ""}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRate?.(n === rating ? null : n);
          }}
          aria-label={n === rating ? "Clear rating" : `Rate ${n} star${n !== 1 ? "s" : ""}`}
        >
          {n <= rating ? "★" : "☆"}
        </button>
      ))}
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
      : { month: "short", day: "numeric", year: "2-digit" };
  return date.toLocaleDateString("en-US", opts);
}

export default function RecipeCard({
  recipe,
  isDeleting,
  onToggleFavorite,
  onEdit,
  onDelete,
  onLogCook,
  cookInfo,
  onRate,
}: Props) {
  const [imgError, setImgError] = useState(false);

  const proxyUrl = recipe.image_url
    ? `/api/image-proxy?url=${encodeURIComponent(recipe.image_url)}`
    : null;

  function stopAndCall(e: React.MouseEvent, fn: () => void) {
    e.preventDefault();
    e.stopPropagation();
    fn();
  }

  return (
    <a
      href={recipe.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.card} ${isDeleting ? styles.deleting : ""}`}
    >
      <div className={styles.imageWrap}>
        {proxyUrl && !imgError ? (
          <img
            src={proxyUrl}
            alt={recipe.title}
            className={styles.image}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <span className={styles.placeholderIcon}>🍴</span>
          </div>
        )}
        {recipe.source_site && (
          <span className={styles.sourceBadge}>
            {recipe.is_video && <span className={styles.sourceBadgePlay}>▶</span>}
            {recipe.source_site}
          </span>
        )}
        {recipe.is_video && (
          <div className={styles.playButton} aria-hidden="true">
            <span className={styles.playTriangle}>▶</span>
          </div>
        )}

        {/* Edit — top-left */}
        <button
          className={styles.editBtn}
          onClick={(e) => stopAndCall(e, () => onEdit(recipe))}
          aria-label="Edit recipe"
        >
          <PencilIcon />
        </button>

        {/* Trash — below edit */}
        <button
          className={styles.trashBtn}
          onClick={(e) => stopAndCall(e, () => onDelete(recipe))}
          aria-label="Delete recipe"
        >
          <TrashIcon />
        </button>

        {/* Cook log — bottom-right */}
        {onLogCook && (
          <button
            className={`${styles.cookLogBtn} ${cookInfo && cookInfo.count > 0 ? styles.cookLogBtnActive : ""}`}
            onClick={(e) => stopAndCall(e, () => onLogCook(recipe))}
            aria-label="Log a cook"
            title="Log a cook"
          >
            <CheckIcon />
          </button>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{recipe.title}</h2>
          {recipe.notes && (
            <span className={styles.notesIcon} title="Has personal notes">✎</span>
          )}
        </div>
        {recipe.author && <p className={styles.author}>{recipe.author}</p>}
        <div className={styles.meta}>
          {recipe.cook_time && (
            <span className={styles.cookTime}>
              <ClockIcon />
              {recipe.cook_time}
            </span>
          )}
        </div>

        <OurRatingStars
          rating={recipe.our_rating}
          onRate={(r) => onRate?.(recipe.id, r)}
        />

        {cookInfo && cookInfo.count > 0 && (
          <p className={styles.cookSummary}>
            Cooked {cookInfo.count}×
            {cookInfo.lastDate ? ` · Last: ${formatCookDate(cookInfo.lastDate)}` : ""}
          </p>
        )}

        <TagPills tags={recipe.tags} />
      </div>

      {/* Heart — top-right */}
      <button
        className={styles.heart}
        onClick={(e) => stopAndCall(e, () => onToggleFavorite(recipe.id))}
        aria-label={recipe.status === "favorite" ? "Unfavorite" : "Favorite"}
      >
        {recipe.status === "favorite" ? <HeartFilled /> : <HeartOutline />}
      </button>
    </a>
  );
}

function TagPills({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  const sorted = [
    ...tags.filter((t) => MEAL_TYPE_VALUES.has(t as never)),
    ...tags.filter((t) => !MEAL_TYPE_VALUES.has(t as never)),
  ];
  const visible = sorted.slice(0, 4);
  const overflow = sorted.length - visible.length;
  return (
    <div className={styles.tagPills}>
      {visible.map((t) => (
        <span key={t} className={styles.tagPill}>{labelForTag(t)}</span>
      ))}
      {overflow > 0 && <span className={styles.tagPill}>+{overflow}</span>}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function HeartFilled() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#C84B31" stroke="#C84B31" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function HeartOutline() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaaaaa" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
