// The logo: a ring with a single point passing through it, drawn in CSS.
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span className="brand-mark-ring" />
      <span className="brand-mark-dot" />
    </span>
  );
}
