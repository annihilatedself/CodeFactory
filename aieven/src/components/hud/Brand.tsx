export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="aieven-g" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0" stopColor="#34e3a4" />
          <stop offset="1" stopColor="#22d3a7" />
        </linearGradient>
      </defs>
      <path
        d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z"
        stroke="url(#aieven-g)"
        strokeWidth="1.5"
        opacity="0.55"
      />
      {/* central node + spokes */}
      <circle cx="16" cy="16" r="3.4" fill="url(#aieven-g)" />
      {[
        [16, 6],
        [25, 11],
        [25, 21],
        [16, 26],
        [7, 21],
        [7, 11],
      ].map(([x, y], i) => (
        <g key={i}>
          <line x1="16" y1="16" x2={x} y2={y} stroke="#22d3a7" strokeWidth="0.9" opacity="0.5" />
          <circle cx={x} cy={y} r="1.7" fill="#34e3a4" />
        </g>
      ))}
    </svg>
  );
}
