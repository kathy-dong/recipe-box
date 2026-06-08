"use client";

import { useState, useRef, useEffect } from "react";
import { useIdentity } from "@/lib/identity";
import styles from "./IdentityIndicator.module.css";

export default function IdentityIndicator() {
  const { person, setPerson, person1, person2, mounted } = useIdentity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!mounted || !person) return null;

  const other = person === person1 ? person2 : person1;

  return (
    <div className={styles.wrap} ref={ref}>
      <button className={styles.trigger} onClick={() => setOpen(!open)}>
        <span className={styles.label}>Browsing as</span>
        <strong className={styles.name}>{person}</strong>
        <span className={`${styles.caret} ${open ? styles.caretOpen : ""}`}>▾</span>
      </button>
      {open && (
        <div className={styles.dropdown}>
          <button
            className={styles.switchBtn}
            onClick={() => { setPerson(other); setOpen(false); }}
          >
            Switch to <strong>{other}</strong>
          </button>
        </div>
      )}
    </div>
  );
}
