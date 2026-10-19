"use client";

import { Undo2, X } from "lucide-react";
import type { Toast } from "./use-day";

// A slip of paper at the foot of the page: what was just logged, and a way to take it back.
export function UndoToast({ toast, onUndo, onDismiss }: { toast: Toast | null; onUndo: () => void; onDismiss: () => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 md:bottom-6">
      {toast ? (
        <div
          key={toast.id}
          role={toast.error ? "alert" : undefined}
          className="settle-in pointer-events-auto flex min-h-14 w-full max-w-md items-center gap-2 rounded-[12px] border border-rule bg-paper py-1.5 pr-1.5 pl-4 text-ink shadow-[0_8px_24px_rgb(28_23_25/0.18)]"
        >
          <p className={`min-w-0 flex-1 text-base ${toast.error ? "text-ribbon" : ""}`}>{toast.label}</p>
          {toast.undo?.length ? (
            <button type="button" onClick={onUndo} className="flex min-h-12 items-center gap-1.5 rounded-[8px] px-3 text-base font-semibold text-ribbon">
              <Undo2 aria-hidden className="size-5" /> Undo
            </button>
          ) : (
            <button type="button" onClick={onDismiss} aria-label="Dismiss" className="flex size-12 items-center justify-center rounded-full text-ink-soft">
              <X aria-hidden className="size-5" />
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
