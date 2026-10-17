"use client";

import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/auth/action-state";

// Interim form primitives for Phase 2. The design pass (Phase 4) restyles these.

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  required = true,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  required?: boolean;
  hint?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="min-h-12 rounded-xl border border-foreground/20 bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-sm opacity-70">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children,
  name,
  value,
  variant = "primary",
}: {
  children: React.ReactNode;
  name?: string;
  value?: string;
  variant?: "primary" | "quiet";
}) {
  const { pending } = useFormStatus();
  const base = "min-h-12 rounded-xl px-5 text-base font-medium transition-opacity disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2";
  const look = variant === "primary" ? "bg-foreground text-background" : "border border-foreground/25";
  return (
    <button type="submit" name={name} value={value} disabled={pending} aria-busy={pending} className={`${base} ${look}`}>
      {children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-xl bg-foreground/5 px-4 py-3 text-sm">
        {state.message}
      </p>
    );
  }
  return null;
}
