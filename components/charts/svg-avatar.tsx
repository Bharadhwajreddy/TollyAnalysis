import { initialsOf } from "@/components/hero/hero-avatar";

/** Shared clip path for circular portraits inside SVG charts. Render once per <svg>. */
export function AvatarClipDef() {
  return (
    <clipPath id="avatar-clip" clipPathUnits="objectBoundingBox">
      <circle cx="0.5" cy="0.5" r="0.5" />
    </clipPath>
  );
}

/** Circular portrait (or initials) centred at cx, cy with a coloured ring. */
export function SvgAvatar({
  cx,
  cy,
  r,
  photo,
  name,
  color,
  selected,
}: {
  cx: number;
  cy: number;
  r: number;
  photo: string | null;
  name: string;
  color: string;
  selected?: boolean;
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 2.5} fill={selected ? "var(--ink)" : color} />
      <circle cx={cx} cy={cy} r={r + 0.5} fill="var(--surface)" />
      {photo ? (
        <image
          href={photo}
          x={cx - r}
          y={cy - r}
          width={r * 2}
          height={r * 2}
          preserveAspectRatio="xMidYMin slice"
          clipPath="url(#avatar-clip)"
        />
      ) : (
        <>
          <circle cx={cx} cy={cy} r={r} fill={color} />
          <text x={cx} y={cy} dy="0.35em" textAnchor="middle" fill="white" fontSize={r * 0.8} fontWeight={600}>
            {initialsOf(name)}
          </text>
        </>
      )}
    </g>
  );
}
