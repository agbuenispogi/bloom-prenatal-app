"use client";

import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/auth/action-state";

// Journal form primitives (DESIGN.md: fields 48px / 12px corners / rule border; one satin primary).

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  required = true,
  hint,
  inputMode,
  min,
  max,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string | number;
  required?: boolean;
  hint?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: number | string;
  max?: number | string;
  className?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[0.9375rem] text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        inputMode={inputMode}
        min={min}
        max={max}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="tnum min-h-12 w-full rounded-[12px] border border-rule bg-paper px-4 text-base text-ink placeholder:text-ink-soft"
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-[0.875rem] text-ink-soft">
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
  const look =
    variant === "primary"
      ? "min-h-14 rounded-[10px] bg-ribbon-fill px-6 text-[1.0625rem] font-semibold text-ribbon-fill-ink active:bg-ribbon-press"
      : "min-h-12 rounded-[8px] border border-rule px-5 text-base font-medium text-ink";
  return (
    <button type="submit" name={name} value={value} disabled={pending} aria-busy={pending} className={`${look} transition-[background-color,transform] duration-150 active:scale-[0.985] disabled:opacity-60`}>
      {children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-base text-ribbon">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="text-base text-ink-soft">
        {state.message}
      </p>
    );
  }
  return null;
}
