import { describe, expect, it } from "vitest";
import { releaseCounts, releasesAsOf, releasesOf } from "@/lib/releases";

describe("Telugu releases by year", () => {
  const counts = releaseCounts();

  it("covers every year from 2000 to the data date, and the parts add up", () => {
    expect(counts[0].year).toBe(2000);
    expect(counts[counts.length - 1].year).toBe(Number(releasesAsOf.slice(0, 4)));
    expect(counts[counts.length - 1].partial).toBe(true);
    for (const c of counts) {
      expect(c.total).toBe(c.theatrical + c.ott + c.dubbed);
      expect(c.total).toBe(c.wikipedia + c.extra + c.dubbed);
      expect(c.total).toBeGreaterThan(40);
    }
  });

  it("lists each year's films without duplicates, released ones up to the data date", () => {
    for (const y of [2005, 2017, 2023, 2024]) {
      const { released } = releasesOf(y);
      const keys = released.map((r) => r.title.toLowerCase().replace(/[^a-z0-9]/g, ""));
      expect(new Set(keys).size).toBe(keys.length);
      expect(released.every((r) => !r.date || r.date <= releasesAsOf)).toBe(true);
    }
    const t2023 = releasesOf(2023).released.map((r) => r.title);
    expect(t2023.filter((t) => t === "Virupaksha")).toHaveLength(1);
  });

  it("includes direct-to-OTT and dubbed films", () => {
    const y2020 = releasesOf(2020).released;
    expect(y2020.find((r) => r.title === "V")?.kind).toBe("ott");
    const y2026 = releasesOf(2026).released;
    expect(y2026.find((r) => r.title === "Aakasamlo Oka Tara")?.kind).toBe("theatrical");
    expect(y2026.find((r) => r.title.startsWith("OM"))).toMatchObject({ kind: "dubbed", language: "Tamil" });
  });
});
