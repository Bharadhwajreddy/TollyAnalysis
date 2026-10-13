import { describe, expect, it } from "vitest";
import { soundKey, titleKey, titlesLooselyMatch, titlesMatch } from "@/lib/tolly/match";

describe("title matching", () => {
  it("drops qualifiers and punctuation", () => {
    expect(titleKey("Kushi (2001 film)")).toBe("kushi");
    expect(titleKey("Bhanumathi & Ramakrishna")).toBe("bhanumathiandramakrishna");
  });

  it("folds Telugu romanisation variants", () => {
    expect(titlesMatch("Kithakithalu", "Kitakitalu")).toBe(true);
    expect(titlesMatch("Chatrapathi", "Chhatrapati")).toBe(true);
    expect(titlesMatch("Seema Tapakai", "Seema Thapakai")).toBe(true);
    expect(titlesMatch("Aadavari Matalaku Ardhalu Verule", "Adavari Maatalaku Arthaalu Verule")).toBe(true);
    expect(soundKey("Aadavari")).toBe(soundKey("Adavari"));
  });

  it("does not match different short titles", () => {
    expect(titlesMatch("Hit", "Hero")).toBe(false);
    expect(titlesMatch("Party", "Party 2")).toBe(false);
    expect(titlesMatch("Okkadu", "Okka Magaadu")).toBe(false);
  });
});

describe("loose title matching (same hero, same year only)", () => {
  it("accepts subtitles and small slips in long titles", () => {
    expect(titlesLooselyMatch("Bhairava", "Bhairava IPS")).toBe(true);
    expect(titlesLooselyMatch("Epic", "Epic - First Semester")).toBe(true);
    expect(titlesLooselyMatch("Amaravathi", "Amavarathi")).toBe(true);
  });

  it("still rejects a different word that merely shares a prefix", () => {
    expect(titlesLooselyMatch("Raja", "Rajakumarudu")).toBe(false);
    expect(titlesLooselyMatch("Hero", "Heroine")).toBe(false);
  });
});
