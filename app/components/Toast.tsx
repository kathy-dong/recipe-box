"use client";

import { useEffect } from "react";
import styles from "./Toast.module.css";

export type ToastItem = {
  id: number;
  message: string;
  type: "error" | "success";
};

type Props = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
};

export default function Toast({ toasts, onDismiss }: Props) {
  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <ToastMessage key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={`${styles.toast} ${toast.type === "error" ? styles.error : styles.success}`}>
      <span>{toast.message}</span>
      <button className={styles.dismiss} onClick={() => onDismiss(toast.id)} aria-label="Dismiss">✕</button>
    </div>
  );
}
