"use client";

import styles from "./DeleteConfirmDialog.module.css";

type Props = {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteConfirmDialog({ title, onCancel, onConfirm }: Props) {
  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.dialog}>
        <p className={styles.message}>
          Delete <strong>{title}</strong>?
        </p>
        <p className={styles.sub}>This can&apos;t be undone.</p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button className={styles.deleteBtn} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
