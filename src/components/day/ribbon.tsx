// "Now" on Today: a soft pink pill with a line fading out across the page, like the family site's dividers.
export function Ribbon({ label }: { label: string }) {
  return (
    <li aria-label={`Now, ${label}`} className="my-1 flex items-center gap-2.5">
      <span className="tnum shrink-0 rounded-full bg-ribbon-fill px-3.5 py-1 font-serif text-[0.9375rem] font-medium text-ribbon-fill-ink">Now · {label}</span>
      <span aria-hidden className="h-0.5 flex-1 rounded-full bg-gradient-to-r from-[var(--fill-a)] to-transparent" />
    </li>
  );
}
