// The adherence ring: on-time share drawn in ink on a page-rule track (state in ink, not satin; satin is for "now").
export function AdherenceRing({ pct, size = 72, label }: { pct: number; size?: number; label: string }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" role="img" aria-label={label} className="shrink-0">
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--rule)" strokeWidth="2.5" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        transform="rotate(-90 18 18)"
      />
      <text x="18" y="18" textAnchor="middle" dominantBaseline="central" className="tnum" fill="var(--ink)" fontSize={size >= 72 ? 8.5 : 9} fontWeight={600}>
        {pct}%
      </text>
    </svg>
  );
}
