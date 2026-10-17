// The satin ribbon bookmark that marks "now" between Today's lines. An authored SVG: a satin band with an
// off-centre sheen, cut with a swallowtail at the page edge and running off the other edge of the page.
function Satin({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="var(--ribbon-shade)" />
      <stop offset="0.22" stopColor="var(--ribbon-fill)" />
      <stop offset="0.36" stopColor="var(--ribbon-sheen)" />
      <stop offset="0.58" stopColor="var(--ribbon-fill)" />
      <stop offset="0.86" stopColor="var(--ribbon-fill)" />
      <stop offset="1" stopColor="var(--ribbon-shade)" />
    </linearGradient>
  );
}

export function Ribbon({ label }: { label: string }) {
  return (
    <li aria-label={`Now, ${label}`} className="relative -mx-5 my-2 h-8 sm:-mx-6">
      {/* Swallowtail end: ribbon arms top and bottom, the V notch cut into the middle. */}
      <svg aria-hidden width="20" height="32" viewBox="0 0 20 32" className="absolute top-0 left-0 h-8 w-5">
        <defs>
          <Satin id="ribbon-satin-end" />
        </defs>
        <path d="M0 4h20v24H0l9-12z" fill="url(#ribbon-satin-end)" />
      </svg>
      {/* The band itself runs to the far edge of the viewport (html clips the overflow). */}
      <svg aria-hidden className="absolute top-0 left-5 h-8 w-screen" preserveAspectRatio="none" viewBox="0 0 100 32">
        <defs>
          <Satin id="ribbon-satin" />
        </defs>
        <rect x="0" y="4" width="100" height="24" fill="url(#ribbon-satin)" />
      </svg>
      <span className="tnum relative flex h-full items-center pl-8 text-[0.9375rem] font-semibold tracking-[0.01em] text-ribbon-fill-ink">
        Now · {label}
      </span>
    </li>
  );
}
