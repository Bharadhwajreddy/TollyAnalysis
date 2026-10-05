import { describe, expect, it } from "vitest";
import { classifyRole, looksUnreleased } from "@/lib/import/classify";
import { croreToMinor, parseCrore } from "@/lib/import/money";
import { firstLink, infoboxField, parseWikitables, plainText } from "@/lib/import/wikitext";

describe("parseCrore", () => {
  const cases: [string, number | null, number | null][] = [
    ["{{INR|170}} crore<ref>x</ref>", 170, 170],
    ["{{INR|600{{ndash}}650}} crore{{efn|''[[Box Office India]]'', ₹999 crore.}}", 600, 650],
    ["{{Estimation}}{{INR}}125{{endash}}130&nbsp;crore{{efn|estimates ₹125&nbsp;crore}}", 125, 130],
    ["{{INR}}500{{en-dash}}700 [[crore]]{{efn|name=x | between {{INR}}500}}", 500, 700],
    ["{{INR|60 [[lakh]]}}–{{INR|1.2 [[crore]]}}", 0.6, 1.2],
    ["{{Indian Rupee|link=Indian rupee}}26{{endash}}40&nbsp;crore", 26, 40],
    ["{{INRConvert|150|c}}", 150, 150],
    ["₹1,810.60 crore", 1810.6, 1810.6],
    ["₹42 lakh", 0.42, 0.42],
    ["US$20 million", null, null],
    ["₹139145 crore", null, null],
  ];
  for (const [raw, low, high] of cases) {
    it(raw.slice(0, 50), () => {
      const r = parseCrore(raw);
      if (low === null) expect(r).toBeNull();
      else {
        expect(r?.low).toBeCloseTo(low, 2);
        expect(r?.high).toBeCloseTo(high as number, 2);
      }
    });
  }
  it("flags distributors' share", () => {
    expect(parseCrore("₹20 crore distributors' share")?.isShare).toBe(true);
  });
  it("converts crore to paise exactly", () => {
    expect(croreToMinor(1.25)).toBe("1250000000");
  });
});

describe("filmography parsing", () => {
  const wt = `== Film ==
{| class="wikitable"
! Year !! Title !! Role !! Notes
|-
| rowspan="2" | 2004 || ''[[Varsham (2004 film)|Varsham]]'' || Venkat ||
|-
| ''[[Adavi Ramudu (2004 film)|Adavi Ramudu]]'' || Ramudu || Also producer
|-
| 2014 || ''[[Action Jackson (2014 film)|Action Jackson]]'' || Himself || Hindi film; Cameo appearance
|-
! scope="row" | 2026
| ''[[Fauzi (film)|Fauzi]]'' {{dagger}} || TBA || Filming
|}`;
  const [t] = parseWikitables(wt);
  it("expands rowspans and reads headers", () => {
    expect(t.headers).toEqual(["year", "title", "role", "notes"]);
    expect(plainText(t.rows[1][0])).toBe("2004");
    expect(firstLink(t.rows[1][1])?.target).toBe("Adavi Ramudu (2004 film)");
  });
  it("classifies roles from notes", () => {
    expect(classifyRole("Himself", "Hindi film; Cameo appearance")).toBe("cameo");
    expect(classifyRole("Raju / Joker (cameo)", "")).toBe("lead");
    expect(classifyRole("Narrator", "")).toBe("cameo");
    expect(classifyRole("Venkat", "Also producer")).toBe("lead");
  });
  it("detects unreleased films", () => {
    expect(looksUnreleased(t.rows[3][1], plainText(t.rows[3][3]))).toBe(true);
  });
  it("reads infobox fields with nested templates", () => {
    const box = "{{Infobox film\n| name = X\n| budget = {{INR|170}} crore<ref>{{cite web|url=a|title=b}}</ref>\n| gross = ₹600 crore\n}}";
    expect(infoboxField(box, "budget")).toContain("{{INR|170}} crore");
    expect(infoboxField(box, "gross")).toBe("₹600 crore");
  });
});
