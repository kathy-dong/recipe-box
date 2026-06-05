"use client";

import { MEAL_TYPE_TAGS, ATTRIBUTE_TAGS } from "@/lib/tags";
import styles from "./TagSelector.module.css";

type Props = {
  selected: string[];
  onChange: (tags: string[]) => void;
};

export default function TagSelector({ selected, onChange }: Props) {
  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((t) => t !== value)
        : [...selected, value]
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.group}>
        <span className={styles.groupLabel}>Meal type</span>
        <div className={styles.pills}>
          {MEAL_TYPE_TAGS.map((tag) => (
            <button
              key={tag.value}
              type="button"
              className={`${styles.pill} ${selected.includes(tag.value) ? styles.pillActive : ""}`}
              onClick={() => toggle(tag.value)}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.group}>
        <span className={styles.groupLabel}>Attributes</span>
        <div className={styles.pills}>
          {ATTRIBUTE_TAGS.map((tag) => (
            <button
              key={tag.value}
              type="button"
              className={`${styles.pill} ${selected.includes(tag.value) ? styles.pillActive : ""}`}
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
