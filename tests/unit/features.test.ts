import { describe, expect, it } from "vitest";
import { paretoFrontier } from "@/components/charts/pareto-chart";
import { tally } from "@/lib/repositories/user-rankings";

describe("fan ranking tally", () => {
  it("gives 3/2/1 points and breaks ties by first-place votes", () => {
    const r = tally([
      ["a", "b", "c"],
      ["b", "a", "d"],
      ["a", "c", "b"],
    ]);
    expect(r.voters).toBe(3);
    expect(r.results.map((x) => [x.slug, x.points])).toEqual([
      ["a", 8],
      ["b", 6],
      ["c", 3],
      ["d", 1],
    ]);
    expect(r.results[0].first).toBe(2);
  });
});

describe("Pareto frontier", () => {
  const pts = [
    { id: "a", x: 10, y: 50 },
    { id: "b", x: 20, y: 40 },
    { id: "c", x: 15, y: 30 }, // dominated by b
    { id: "d", x: 5, y: 60 },
    { id: "e", x: 5, y: 55 }, // dominated by d
  ];
  it("keeps only points nobody beats on both axes", () => {
    expect(paretoFrontier(pts, true, true).map((p) => p.id)).toEqual(["d", "a", "b"]);
  });
  it("respects lower-is-better axes", () => {
    // lower x is better, higher y is better → d (5,60) dominates everything else
    expect(paretoFrontier(pts, false, true).map((p) => p.id)).toEqual(["d"]);
  });
});
