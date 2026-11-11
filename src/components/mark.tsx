export function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#14352c" />
      <rect x="4" y="13.5" width="24" height="5" rx="2.5" fill="#f4ecdf" />
      <rect x="4" y="13.5" width="11" height="5" rx="2.5" fill="#c24d2c" />
    </svg>
  );
}
