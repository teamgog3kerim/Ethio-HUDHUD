export function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="HUDHUD">
      <rect width="64" height="64" rx="16" fill="#176B55" />
      <g className="flap">
        <g stroke="#E6B85C" strokeWidth="2.6" strokeLinecap="round">
          <path d="M34 27 L21 11" /><path d="M34 27 L28 8" /><path d="M34 27 L35 6" />
          <path d="M34 27 L42 8" /><path d="M34 27 L48 12" />
        </g>
        <g fill="#F7F8F5">
          <circle cx="21" cy="11" r="2.2" /><circle cx="28" cy="8" r="2.2" /><circle cx="35" cy="6" r="2.2" />
          <circle cx="42" cy="8" r="2.2" /><circle cx="48" cy="12" r="2.2" />
        </g>
      </g>
      <ellipse cx="40" cy="48" rx="15" ry="9" fill="#F7F8F5" />
      <path d="M33 45 h14 M32 49 h16 M34 53 h12" stroke="#104C3D" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="34" cy="35" r="11" fill="#F7F8F5" />
      <path d="M25 33 Q12 35 7 46 Q18 41 26 40Z" fill="#E6B85C" />
      <circle cx="32" cy="33" r="1.8" fill="#104C3D" />
    </svg>
  );
}
