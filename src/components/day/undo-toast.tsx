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
          className="settle-in pointer-events-auto flex min-h-14 w-full max-w-md items-center gap-2 rounded-full bg-ink py-1.5 pr-1.5 pl-5 font-bold text-paper soft-shadow"
        >
          <p className={`min-w-0 flex-1 text-base ${toast.error ? "text-[var(--fill-a)]" : ""}`}>{toast.label}</p>
          {toast.undo?.length ? (
            <button type="button" onClick={onUndo} className="flex min-h-11 items-center gap-1.5 rounded-full bg-ribbon-fill px-4 font-serif text-base text-ribbon-fill-ink">
              <Undo2 aria-hidden className="size-5" /> Undo
            </button>
          ) : (
            <button type="button" onClick={onDismiss} aria-label="Dismiss" className="flex size-12 items-center justify-center rounded-full text-paper">
              <X aria-hidden className="size-5" />
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
