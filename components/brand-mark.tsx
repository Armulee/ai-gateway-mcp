// The logo: a gateway arch with a single point passing through it. Same
// drawing as app/icon.svg, cropped to the arch and in the current text colour.
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="5 5.5 22 22" aria-hidden="true">
      <path d="M9.5 25V14.5a6.5 6.5 0 0 1 13 0V25" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="18.5" r="2.4" fill="currentColor" />
    </svg>
  );
}
