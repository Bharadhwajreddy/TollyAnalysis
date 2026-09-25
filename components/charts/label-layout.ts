import { forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";

export interface LabelInput {
  id: string;
  text: string;
  /** Anchor point (the dot centre). */
  ax: number;
  ay: number;
  /** Dot radius, so labels start beside the dot. */
  r: number;
}

export interface PlacedLabel extends LabelInput {
  x: number; // label centre
  y: number;
  w: number;
  h: number;
  displaced: boolean;
}

interface Node extends SimulationNodeDatum {
  id: string;
  w: number;
  h: number;
  tx: number;
  ty: number;
  fixed: boolean;
}

/**
 * Collision-aware label placement using d3-force.
 * Labels are pulled toward a spot right of their dot and pushed apart by a
 * rectangle-collision force; dots act as fixed obstacles. Runs synchronously.
 */
export function layoutLabels(
  labels: LabelInput[],
  obstacles: { x: number; y: number; r: number }[],
  bounds: { width: number; height: number },
  charWidth = 6.1,
): PlacedLabel[] {
  const h = 14;
  const nodes: Node[] = labels.map((l) => {
    const w = l.text.length * charWidth + 6;
    const tx = l.ax + l.r + 3 + w / 2;
    return { id: l.id, w, h, tx, ty: l.ay, x: tx, y: l.ay, fixed: false };
  });
  const obstacleNodes: Node[] = obstacles.map((o, i) => ({
    id: `o${i}`,
    w: o.r * 2 + 2,
    h: o.r * 2 + 2,
    tx: o.x,
    ty: o.y,
    x: o.x,
    y: o.y,
    fx: o.x,
    fy: o.y,
    fixed: true,
  }));
  const all = [...nodes, ...obstacleNodes];

  function rectCollide(alpha: number) {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = 0; j < all.length; j++) {
        const b = all[j];
        if (a === b) continue;
        const dx = (b.x ?? 0) - (a.x ?? 0);
        const dy = (b.y ?? 0) - (a.y ?? 0);
        const ox = (a.w + b.w) / 2 - Math.abs(dx);
        const oy = (a.h + b.h) / 2 - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          // Push along the axis of least overlap; prefer vertical moves for wide labels.
          const k = alpha * 0.9;
          if (oy < ox * 1.6) {
            const s = (dy === 0 ? (i % 2 ? 1 : -1) : Math.sign(dy)) * oy * k;
            if (b.fixed) a.y! -= s;
            else {
              a.y! -= s / 2;
              b.y! += s / 2;
            }
          } else {
            const s = (dx === 0 ? 1 : Math.sign(dx)) * ox * k;
            if (b.fixed) a.x! -= s;
            else {
              a.x! -= s / 2;
              b.x! += s / 2;
            }
          }
        }
      }
    }
  }

  const sim = forceSimulation<Node>(all)
    .force("x", forceX<Node>((d) => d.tx).strength((d) => (d.fixed ? 0 : 0.12)))
    .force("y", forceY<Node>((d) => d.ty).strength((d) => (d.fixed ? 0 : 0.12)))
    .force("collide", rectCollide)
    .stop();
  for (let i = 0; i < 260; i++) sim.tick();

  return nodes.map((n, i) => {
    const x = Math.max(n.w / 2 + 2, Math.min(bounds.width - n.w / 2 - 2, n.x ?? n.tx));
    const y = Math.max(n.h / 2 + 2, Math.min(bounds.height - n.h / 2 - 2, n.y ?? n.ty));
    return {
      ...labels[i],
      x,
      y,
      w: n.w,
      h: n.h,
      displaced: Math.hypot(x - n.tx, y - n.ty) > 10,
    };
  });
}
