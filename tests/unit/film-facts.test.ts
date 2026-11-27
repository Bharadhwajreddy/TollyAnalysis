import { describe, expect, it } from "vitest";
import { cleanGenres, getFilmFacts, moneyText } from "@/lib/film-facts";
import { getLedger } from "@/lib/ledger";

describe("film facts", () => {
  it("keeps a reported range and formats single values", () => {
    expect(moneyText("₹25–35 crore", 30)).toBe("₹25–35 cr");
    expect(moneyText("₹1,042-1,100 crore", 1042)).toBe("₹1,042–1,100 cr");
    expect(moneyText("₹250 crore", 250)).toBe("₹250 cr");
    expect(moneyText("₹28 crore distributors' share", 28)).toBe("₹28 cr");
    expect(moneyText(null, null)).toBe("—");
  });

  it("turns Wikidata genres into short labels", () => {
    expect(cleanGenres(["drama film", "fantasy film", "action film"])).toEqual(["Fantasy", "Action"]);
    expect(cleanGenres(["drama film"])).toEqual(["Drama"]);
    expect(cleanGenres(["soundtrack", "romantic comedy film", "action film", "war film", "spy film"])).toHaveLength(3);
  });

  it("gives the film page its pillars as 0–100 scores, never a raw rating", async () => {
    const ledger = await getLedger();
    const f = ledger.films.find((x) => x.title === "Baahubali 2: The Conclusion");
    expect(f).toBeDefined();
    const facts = await getFilmFacts(f!);
    expect(facts.pillars).not.toBeNull();
    for (const v of Object.values(facts.pillars!)) {
      if (v === null) continue;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(Object.keys(facts)).not.toContain("rating");
    expect(facts.multiple).toBeGreaterThan(7);
  });
});
