/**
 * All the cow drawings, in one place. Everything is inline SVG so it scales on
 * any screen and needs no network requests.
 */

interface IconProps {
  className?: string;
  /** Pink Cow variant — the penalty marker, deliberately loud. */
  pink?: boolean;
  title?: string;
}

/**
 * A single cow token: the little face you collect one of per matched answer.
 */
export function CowToken({ className = 'w-8 h-8', pink = false, title }: IconProps) {
  const hide = pink ? '#ff7cba' : '#fffdf7';
  const spot = pink ? '#e01c78' : '#1f1b18';
  const muzzle = pink ? '#ffd6ea' : '#f5c9b8';
  const outline = pink ? '#a91356' : '#1f1b18';

  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title ?? (pink ? 'Pink Cow' : 'Cow token')}>
      {title ? <title>{title}</title> : null}
      {/* ears */}
      <ellipse cx="11" cy="26" rx="9" ry="6" fill={hide} stroke={outline} strokeWidth="2.5" />
      <ellipse cx="53" cy="26" rx="9" ry="6" fill={hide} stroke={outline} strokeWidth="2.5" />
      {/* horns */}
      <path d="M20 15c-3-4-8-5-10-2 2 3 6 5 8 6z" fill="#e9d8b4" stroke={outline} strokeWidth="2" strokeLinejoin="round" />
      <path d="M44 15c3-4 8-5 10-2-2 3-6 5-8 6z" fill="#e9d8b4" stroke={outline} strokeWidth="2" strokeLinejoin="round" />
      {/* head */}
      <path
        d="M32 12c12 0 19 7 19 17 0 13-8 22-19 22s-19-9-19-22c0-10 7-17 19-17z"
        fill={hide}
        stroke={outline}
        strokeWidth="2.5"
      />
      {/* a spot, because it wouldn't be a cow without one */}
      <path d="M18 22c4-3 9-1 9 3s-4 7-8 6-4-7-1-9z" fill={spot} opacity="0.9" />
      {/* muzzle */}
      <ellipse cx="32" cy="41" rx="12" ry="9" fill={muzzle} stroke={outline} strokeWidth="2.5" />
      <ellipse cx="27" cy="40" rx="1.8" ry="2.4" fill={outline} />
      <ellipse cx="37" cy="40" rx="1.8" ry="2.4" fill={outline} />
      {/* eyes */}
      <ellipse cx="25" cy="29" rx="2.6" ry="3" fill={outline} />
      <ellipse cx="39" cy="29" rx="2.6" ry="3" fill={outline} />
    </svg>
  );
}

/**
 * The big friendly cow on the join screen — full body, side on, mid-chew.
 */
export function CowMascot({ className = 'w-56 h-44' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 170" className={className} role="img" aria-label="A cheerful cow">
      {/* back legs */}
      <rect x="52" y="108" width="16" height="46" rx="7" fill="#fffdf7" stroke="#1f1b18" strokeWidth="3" />
      <rect x="152" y="108" width="16" height="46" rx="7" fill="#fffdf7" stroke="#1f1b18" strokeWidth="3" />
      <rect x="52" y="140" width="16" height="14" rx="5" fill="#1f1b18" />
      <rect x="152" y="140" width="16" height="14" rx="5" fill="#1f1b18" />
      {/* tail */}
      <path d="M182 76c14 6 18 26 10 40" fill="none" stroke="#1f1b18" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="192" cy="120" rx="5" ry="8" fill="#1f1b18" transform="rotate(20 192 120)" />
      {/* body */}
      <rect x="38" y="52" width="146" height="72" rx="34" fill="#fffdf7" stroke="#1f1b18" strokeWidth="3.5" />
      {/* body spots */}
      <path d="M74 66c18-7 34 4 32 20-2 15-18 22-32 16-13-6-15-29 0-36z" fill="#1f1b18" />
      <path d="M140 92c12-5 22 3 21 14-1 10-12 15-21 10-8-4-9-20 0-24z" fill="#1f1b18" />
      {/* udder, for accuracy */}
      <ellipse cx="96" cy="126" rx="14" ry="9" fill="#ffb3d6" stroke="#1f1b18" strokeWidth="2.5" />
      {/* head */}
      <g>
        <ellipse cx="42" cy="52" rx="9" ry="6" fill="#fffdf7" stroke="#1f1b18" strokeWidth="3" transform="rotate(-25 42 52)" />
        <path d="M24 34c-4-5-10-6-12-2 2 4 7 6 10 7z" fill="#e9d8b4" stroke="#1f1b18" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M52 30c4-5 10-7 12-3-2 4-7 7-10 8z" fill="#e9d8b4" stroke="#1f1b18" strokeWidth="2.5" strokeLinejoin="round" />
        <path
          d="M38 22c16 0 26 10 26 24 0 18-12 28-27 28-14 0-25-11-25-28 0-14 10-24 26-24z"
          fill="#fffdf7"
          stroke="#1f1b18"
          strokeWidth="3.5"
        />
        <path d="M20 34c6-4 13-1 12 5-1 7-8 10-13 7s-4-9 1-12z" fill="#1f1b18" />
        <ellipse cx="38" cy="62" rx="16" ry="12" fill="#f5c9b8" stroke="#1f1b18" strokeWidth="3" />
        <ellipse cx="32" cy="61" rx="2.4" ry="3.2" fill="#1f1b18" />
        <ellipse cx="45" cy="61" rx="2.4" ry="3.2" fill="#1f1b18" />
        <ellipse cx="30" cy="42" rx="3.2" ry="3.8" fill="#1f1b18" />
        <ellipse cx="49" cy="42" rx="3.2" ry="3.8" fill="#1f1b18" />
        {/* a blade of grass, still being considered */}
        <path d="M54 68c8 2 14-2 18-8" fill="none" stroke="#5c8a3c" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Rolling hills + fence, used as the join screen's backdrop. */
export function PastureScene({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 160"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M0 70c60-30 110 10 170-6s110-40 230-8v104H0z" fill="#7fb055" />
      <path d="M0 100c70-24 130 6 200-4s130-26 200-6v70H0z" fill="#5c8a3c" />
      <g stroke="#7a5230" strokeWidth="6" strokeLinecap="round">
        <path d="M30 150v-38M110 150v-38M190 150v-38M270 150v-38M350 150v-38" />
      </g>
      <g stroke="#96683f" strokeWidth="5" strokeLinecap="round">
        <path d="M10 122h380M10 138h380" />
      </g>
    </svg>
  );
}

/** Decorative floating spots for empty background space. */
export function DriftingSpots({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} aria-hidden="true">
      <g fill="#1f1b18" opacity="0.08">
        <path d="M42 18c26-12 58 2 60 28 2 24-16 40-40 42-25 2-44-12-46-32-2-18 8-30 26-38z" />
        <path d="M228 38c22 4 34 22 30 40-4 20-24 30-42 24-18-6-26-24-20-42 5-14 18-25 32-22z" />
        <path d="M134 168c30-8 58 12 58 40 0 26-22 44-50 42-26-2-44-22-42-46 2-20 16-32 34-36z" />
      </g>
    </svg>
  );
}
