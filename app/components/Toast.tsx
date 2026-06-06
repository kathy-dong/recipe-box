"use client";

import { useEffect, useState } from "react";
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

function ToastMessage({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const [exiting, setExiting] = useState(false);

  function dismiss() {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 250);
  }

  useEffect(() => {
    const timer = setTimeout(() => dismiss(), 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  return (
    <div className={`${styles.toast} ${exiting ? styles.exiting : ""}`}>
      {toast.message}
    </div>
  );
}
