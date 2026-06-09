"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import styles from "./BulkImportModal.module.css";

type ImportStatus = "pending" | "processing" | "success" | "duplicate" | "invalid" | "failed";

type ImportRow = {
  url: string;
  status: ImportStatus;
  label: string;
};

type Props = {
  onClose: () => void;
  onImported: () => void;
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function truncateUrl(url: string, max = 55): string {
  if (url.length <= max) return url;
  return url.slice(0, max) + "…";
}

export default function BulkImportModal({ onClose, onImported }: Props) {
  const [phase, setPhase] = useState<"input" | "importing" | "done">("input");
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [hasNewImports, setHasNewImports] = useState(false);
  const [mounted, setMounted] = useState(false);

  const cancelledRef = useRef(false);
  const phaseRef = useRef<"input" | "importing" | "done">("input");
  const progressRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdropRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const handleClose = useCallback(() => {
    if (phaseRef.current === "importing") {
      setConfirmAbort(true);
    } else {
      if (hasNewImports) onImported();
      onClose();
    }
  }, [hasNewImports, onImported, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleClose]);

  // Auto-scroll progress list to keep the current row visible
  useEffect(() => {
    if (!progressRef.current) return;
    const processingIdx = rows.findIndex((r) => r.status === "processing");
    if (processingIdx < 0) return;
    const rowH = 44;
    const target = Math.max(0, processingIdx * rowH - 80);
    progressRef.current.scrollTop = target;
  }, [rows]);

  // Derived
  const validLines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("http"));

  const successCount = rows.filter((r) => r.status === "success").length;
  const dupCount = rows.filter((r) => r.status === "duplicate").length;
  const failCount = rows.filter((r) => r.status === "failed" || r.status === "invalid").length;
  const validTotal = rows.filter((r) => r.status !== "invalid").length;
  const doneCount = rows.filter((r) =>
    ["success", "duplicate", "failed"].includes(r.status)
  ).length;

  async function handleImport() {
    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const initialRows: ImportRow[] = lines.map((url) => ({
      url,
      status: url.startsWith("http") ? "pending" : "invalid",
      label: url.startsWith("http") ? "" : "Not a valid URL",
    }));

    setRows(initialRows);
    setPhase("importing");
    cancelledRef.current = false;
    let imported = 0;

    for (let i = 0; i < initialRows.length; i++) {
      if (cancelledRef.current) break;
      if (initialRows[i].status === "invalid") continue;

      const url = initialRows[i].url;

      setRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "processing" } : r))
      );

      try {
        // Duplicate check
        const { data: existing } = await supabase
          .from("recipes")
          .select("title")
          .eq("url", url)
          .maybeSingle();

        if (existing) {
          setRows((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: "duplicate", label: "Already saved" } : r
            )
          );
          await delay(500);
          continue;
        }

        // Parse
        const res = await fetch("/api/parse-recipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
          signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) throw new Error("parse_failed");
        const parsed = await res.json();

        const title = (parsed.title as string | null) || url;
        const tags = (parsed.suggested_tags as string[] | null) ?? [];

        const { error } = await supabase.from("recipes").insert({
          url,
          title,
          image_url: (parsed.image_url as string | null) ?? null,
          author: (parsed.author as string | null) ?? null,
          cook_time: (parsed.cook_time as string | null) ?? null,
          rating: (parsed.rating as string | null) ?? null,
          rating_count: (parsed.rating_count as string | null) ?? null,
          description: (parsed.description as string | null) ?? null,
          source_site: (parsed.source_site as string | null) ?? null,
          is_video: (parsed.is_video as boolean | null) ?? false,
          status: "to_try",
          tags,
          ingredients: (parsed.ingredients as string[] | null) ?? [],
        });

        if (error?.code === "23505") {
          setRows((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: "duplicate", label: "Already saved" } : r
            )
          );
        } else if (error) {
          throw new Error("insert_failed");
        } else {
          imported++;
          setRows((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: "success", label: title } : r
            )
          );
        }
      } catch (err) {
        const isNetwork =
          err instanceof TypeError ||
          (err instanceof DOMException && err.name === "TimeoutError");
        const label = isNetwork
          ? "Failed — couldn't reach this URL"
          : "Failed — couldn't parse this page";
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "failed", label } : r
          )
        );
      }

      if (!cancelledRef.current && i < initialRows.length - 1) {
        await delay(500);
      }
    }

    if (!cancelledRef.current) {
      setPhase("done");
      if (imported > 0) {
        setHasNewImports(true);
      }
    }
  }

  function handleDone() {
    if (hasNewImports) onImported();
    onClose();
  }

  function handleConfirmAbort() {
    cancelledRef.current = true;
    setConfirmAbort(false);
    if (hasNewImports) onImported();
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(e) => { mouseDownOnBackdropRef.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => {
        if (mouseDownOnBackdropRef.current && e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Bulk Import Recipes</h2>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Input phase */}
        {phase === "input" && (
          <>
            <textarea
              className={styles.textarea}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"Paste recipe URLs, one per line"}
              rows={10}
              autoFocus
            />
            <p className={styles.helperText}>
              Supports recipe sites, YouTube, and Instagram
            </p>
            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={handleClose}>
                Cancel
              </button>
              <button
                className={styles.importBtn}
                onClick={handleImport}
                disabled={validLines.length === 0}
              >
                Import{validLines.length > 0 ? ` ${validLines.length} recipe${validLines.length !== 1 ? "s" : ""}` : ""}
              </button>
            </div>
          </>
        )}

        {/* Progress / done phase */}
        {(phase === "importing" || phase === "done") && (
          <>
            <p className={styles.counter}>
              {phase === "done" ? (
                <>
                  Done!{" "}
                  <strong>{successCount}</strong> imported
                  {dupCount > 0 && <>, <strong>{dupCount}</strong> already existed</>}
                  {failCount > 0 && <>, <strong>{failCount}</strong> failed</>}
                </>
              ) : (
                <>
                  Processing <strong>{Math.min(doneCount + 1, validTotal)}</strong> of{" "}
                  <strong>{validTotal}</strong>…
                </>
              )}
            </p>

            <div ref={progressRef} className={styles.progressList}>
              {rows.map((row, i) => (
                <div key={i} className={`${styles.progressRow} ${styles[`row_${row.status}`]}`}>
                  <span className={styles.progressUrl}>{truncateUrl(row.url)}</span>
                  <span className={styles.progressStatus}>
                    {row.status === "processing" && (
                      <span className={styles.statusIcon} aria-label="Processing">⏳</span>
                    )}
                    {row.status === "pending" && (
                      <span className={styles.pendingDot}>·</span>
                    )}
                    {row.status === "success" && (
                      <span className={styles.statusText}>✅ {row.label}</span>
                    )}
                    {row.status === "duplicate" && (
                      <span className={styles.statusText}>⚠️ {row.label}</span>
                    )}
                    {(row.status === "failed" || row.status === "invalid") && (
                      <span className={styles.statusText}>❌ {row.label}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.actions}>
              {phase === "done" ? (
                <button className={styles.importBtn} onClick={handleDone}>
                  Done
                </button>
              ) : (
                <button className={styles.cancelBtn} onClick={handleClose}>
                  Cancel
                </button>
              )}
            </div>
          </>
        )}

        {/* Abort confirmation overlay */}
        {confirmAbort && (
          <div className={styles.abortOverlay}>
            <div className={styles.abortDialog}>
              <p className={styles.abortMsg}>
                Import in progress — are you sure you want to cancel?
              </p>
              <p className={styles.abortSub}>
                Recipes already imported will be kept.
              </p>
              <div className={styles.abortActions}>
                <button
                  className={styles.abortKeepBtn}
                  onClick={() => setConfirmAbort(false)}
                >
                  Keep importing
                </button>
                <button className={styles.abortStopBtn} onClick={handleConfirmAbort}>
                  Stop import
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
