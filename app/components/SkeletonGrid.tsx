"use client";

import { useEffect, useState } from "react";
import styles from "./SkeletonGrid.module.css";

const PHRASES = [
  "Preheating the oven...",
  "Chopping the onions...",
  "Tasting for seasoning...",
  "Plating up...",
  "Almost ready to serve...",
];

export default function SkeletonGrid() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhraseIdx((i) => (i + 1) % PHRASES.length);
        setVisible(true);
      }, 300);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div className={styles.grid}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className={styles.card}>
            <div className={styles.image} />
            <div className={styles.body}>
              <div className={styles.titleBar} />
              <div className={styles.metaBar} />
            </div>
          </div>
        ))}
      </div>
      <p className={`${styles.phrase} ${visible ? styles.phraseVisible : styles.phraseHidden}`}>
        {PHRASES[phraseIdx]}
      </p>
    </>
  );
}
