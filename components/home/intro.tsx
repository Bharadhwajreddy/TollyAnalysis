"use client";

/* eslint-disable @next/next/no-img-element -- tiny local thumbnails inside a short animation */
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { INTRO_KEY } from "@/lib/intro";

/** How long the whole opening runs; the CSS animations in globals.css are timed to match. */
const DURATION_MS = 3300;

const round = (n: number) => Math.round(n * 100) / 100;

/** Where ball i ends up: a golden-angle spiral, stretched to fill a wide or a tall screen. */
function flight(i: number, n: number) {
  const angle = i * 2.39996 + 0.6;
  const r = 0.56 + 0.44 * (((i * 7) % n) / n);
  const dx = Math.cos(angle) * r * 45;
  let dy = Math.sin(angle) * r * 40;
  // Keep the band just under the board clear: the site's name is written there.
  if (dy > 8 && dy < 30) dy = 31 + (dy - 8) * 0.4;
  return { dx: round(dx), dy: round(dy) };
}

/**
 * The opening: a clapperboard claps and the heroes' photos burst out of it, then the page is revealed.
 * Shown once per browser session, on whichever page the visitor lands; any click or key skips it.
 * The CSS alone hides it at the end, so it can never block the page if scripts fail.
 */
export function Intro({ faces }: { faces: { name: string; src: string }[] }) {
  const [gone, setGone] = useState(false);

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* private mode: it simply plays again next time */
    }
    document.documentElement.dataset.intro = "skip";
    setGone(true);
  }, []);

  useEffect(() => {
    const skip = document.documentElement.dataset.intro === "skip";
    const timer = setTimeout(finish, skip ? 0 : DURATION_MS);
    if (skip) return () => clearTimeout(timer);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [finish]);

  if (gone) return null;
  const n = faces.length;
  return (
    <div className="intro" onClick={finish} data-testid="intro">
      <div className="intro-stage" aria-hidden>
        <span className="intro-flash" />
        {Array.from({ length: 16 }, (_, i) => {
          const f = flight(i * 3 + 1, 48);
          return <span key={`s${i}`} className="intro-spark" style={{ "--dx": `${f.dx * 1.25}vw`, "--dy": `${f.dy * 1.25}vh`, "--i": i } as CSSProperties} />;
        })}
        {faces.map((face, i) => {
          const f = flight(i, n);
          return (
            <span
              key={face.src}
              className="intro-ball"
              style={{ "--dx": `${f.dx}vw`, "--dy": `${f.dy}vh`, "--i": i, "--sz": `${7.2 + (i % 4) * 1.5}vmin` } as CSSProperties}
            >
              <img src={face.src} alt="" width={88} height={88} decoding="async" />
            </span>
          );
        })}
        <div className="intro-board">
          <div className="intro-arm" />
          <div className="intro-arm-base" />
          <div className="intro-slate">
            <span>
              <i>Prod.</i> Tollywood Analysis
            </span>
            <span>
              <i>Scene</i> Tolly Index
            </span>
            <span className="intro-slate-row">
              <span>
                <i>Take</i> 1
              </span>
              <span>
                <i>Cast</i> {n > 0 ? "Every hero" : "—"}
              </span>
            </span>
          </div>
        </div>
      </div>
      <p className="intro-title">
        <span className="intro-title-name">
          Tollywood Analysis<span>.</span>
        </span>
        <span className="intro-title-tag">Lights. Camera. Numbers.</span>
      </p>
      <button type="button" className="intro-skip" onClick={finish}>
        Skip intro
      </button>
    </div>
  );
}
