export function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#ffffff" />
      <rect x="1" y="1" width="30" height="30" rx="5" fill="none" stroke="#111111" strokeWidth="1" />
      <rect x="4" y="13" width="24" height="6" rx="1" fill="#111111" />
      <rect x="4" y="13" width="7" height="6" fill="#c8102e" />
    </svg>
  );
}
