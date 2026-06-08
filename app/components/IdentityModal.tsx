"use client";

import { useIdentity } from "@/lib/identity";
import styles from "./IdentityModal.module.css";

export default function IdentityModal() {
  const { person, setPerson, person1, person2, mounted } = useIdentity();

  if (!mounted || person !== null) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <span className={styles.emoji}>🍳</span>
        <h2 className={styles.title}>Who&apos;s cooking?</h2>
        <p className={styles.sub}>
          Pick your name to track personal ratings and your cook log.
        </p>
        <div className={styles.buttons}>
          <button className={styles.personBtn} onClick={() => setPerson(person1)}>
            {person1}
          </button>
          <button className={styles.personBtn} onClick={() => setPerson(person2)}>
            {person2}
          </button>
        </div>
      </div>
    </div>
  );
}
