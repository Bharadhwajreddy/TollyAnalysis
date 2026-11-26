import { useId } from "react";
import { initialsOf } from "@/components/hero/hero-avatar";

/** Kept for caller compatibility; each SvgAvatar scopes its own clipPath id via useId. */
export function AvatarClipDef() {
  return null;
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
  const rawId = useId();
  const clipId = `avatar-clip-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 2.5} fill={selected ? "var(--ink)" : color} />
      <circle cx={cx} cy={cy} r={r + 0.5} fill="var(--surface)" />
      {photo ? (
        <>
          <defs>
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <circle cx="0.5" cy="0.5" r="0.5" />
            </clipPath>
          </defs>
          <image
            href={photo}
            x={cx - r}
            y={cy - r}
            width={r * 2}
            height={r * 2}
            preserveAspectRatio="xMidYMin slice"
            clipPath={`url(#${clipId})`}
          />
        </>
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
