"use client";

import { MEAL_TYPE_TAGS, ATTRIBUTE_TAGS } from "@/lib/tags";
import styles from "./FilterBar.module.css";

type Props = {
  activeTags: string[];
  onChange: (tags: string[]) => void;
};

export default function FilterBar({ activeTags, onChange }: Props) {
  function toggle(value: string) {
    onChange(
      activeTags.includes(value)
        ? activeTags.filter((t) => t !== value)
        : [...activeTags, value]
    );
  }

  const hasFilters = activeTags.length > 0;

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.scroll}>
          {MEAL_TYPE_TAGS.map((tag) => (
            <button
              key={tag.value}
              className={`${styles.pill} ${activeTags.includes(tag.value) ? styles.pillActive : ""}`}
              onClick={() => toggle(tag.value)}
            >
              {tag.label}
            </button>
          ))}
          <span className={styles.divider} />
          {ATTRIBUTE_TAGS.map((tag) => (
            <button
              key={tag.value}
              className={`${styles.pill} ${activeTags.includes(tag.value) ? styles.pillActive : ""}`}
              onClick={() => toggle(tag.value)}
            >
              {tag.label}
            </button>
          ))}
          {hasFilters && (
            <button className={styles.clearBtn} onClick={() => onChange([])}>
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
