import { describe, expect, it } from "vitest";
import { normaliseTradeVerdict, parseTradePage } from "@/lib/import/trade-blog";
import { articleVerdict, classifySentence, heroProseVerdicts, teluguVerdict } from "@/lib/import/verdict";

describe("sentence verdicts", () => {
  const cases: [string, string | null][] = [
    ["The film was a commercial success at the box office.", "hit"],
    ["The film was declared a blockbuster and grossed ₹100 crore.", "blockbuster"],
    ["It was a box-office bomb.", "disaster"],
    ["The film failed at the box office.", "flop"],
    ["It was a super hit.", "super_hit"],
    ["The film was an above-average grosser.", "above_average"],
    ["The film was declared an average grosser.", "average"],
    // Negation flips a success into a flop; a negated flop says nothing.
    ["However, the film was not commercially successful.", "flop"],
    ["Anji struggled to achieve commercial success due to its high budget.", "flop"],
    ["We made a profit and Nijam was not a flop.", null],
    // The month "May" is not speculation.
    ["Allari was released on 10 May 2002 and was a box office success.", "hit"],
    // Other films, songs, remakes, critics and speculation are ignored.
    ["The song became a chartbuster hit.", null],
    ["It's a remake of Tamil blockbuster Kaadhal Kondein.", null],
    ["Critics praised the performances.", null],
    ["It might prove a hit for Chiranjeevi.", null],
    ["Kithakithalu sneaked through with success as the other major summer releases bombed at cinemas.", "hit"],
    ["Being his biggest outing after two flops with Sakthi and Dammu, expectations were high.", null],
    ["The film was later remade in Hindi as Ready, which was a blockbuster.", null],
    ["The Hindi-dubbed version had not achieved equivalent commercial success.", null],
    ["The film performed well in the US on its first day.", null],
    ["It emerged as a box office bomb, though it became the second-highest grossing Telugu film of 2023.", "disaster"],
  ];
  for (const [s, v] of cases) it(s.slice(0, 60), () => expect(classifySentence(s)).toBe(v));

  it("reads 100-day runs only when nothing explicit is said", () => {
    expect(classifySentence("It completed 50 days in 92 centres and 100 days in 60 centres.", "days")).toBe("hit");
    expect(classifySentence("The film completed a 50-day run in 300 centres.", "days")).toBeNull();
    expect(classifySentence("The shooting was completed in 110 days.", "days")).toBeNull();
  });
});

describe("article verdicts", () => {
  it("prefers the box-office section and skips plot and awards", () => {
    const wt = `{{Infobox film | name = X }}
'''X''' is a 2010 film. It was a success.
== Plot ==
A bomb explodes and the hero is a flop at his job.
== Box office ==
The film was a box-office failure.
== Accolades ==
* "Blockbuster" – Nominated`;
    expect(articleVerdict(wt)?.verdict).toBe("flop");
  });
  it("keeps sentences separated by multi-line citations", () => {
    const wt = `Intro.<ref>{{cite web
* |title=x}}</ref>

The film was successful at the box office, collecting a share of ₹21 crore.`;
    expect(articleVerdict(wt)?.verdict).toBe("hit");
  });
});

describe("hero-article prose", () => {
  const films = [
    { key: "a", article: "Kithakithalu", title: "Kithakithalu", year: 2006 },
    { key: "b", article: "Gamyam", title: "Gamyam", year: 2008 },
    { key: "c", article: null, title: "Rambabu Gadi Pellam", year: 2010 },
    { key: "d", article: null, title: "Betting Bangaraju", year: 2010 },
    { key: "e", article: "Pandaga Chesko", title: "Pandaga Chesko", year: 2015 },
    { key: "f", article: "Shivam (2015 Telugu film)", title: "Shivam", year: 2015 },
    { key: "g", article: "Happy Days (2007 film)", title: "Happy Days", year: 2007 },
    { key: "h", article: "Kurradu", title: "Kurradu", year: 2009 },
  ];
  const text = `== Career ==
He established himself with commercial successes such as ''[[Kithakithalu]]'' (2006) and ''[[Gamyam]]'' (2008).
While ''Rambabu Gadi Pellam'' was a flop at the box office, ''Betting Bangaraju'' was a super hit at the box office.
While ''Pandaga Chesko'' directed by [[Gopichand Malineni]], was a commercial success, [[Shivam (2015 Telugu film)|''Shivam'']] ended up as one of the biggest failures of his career.
He made his debut with the coming-of-age blockbuster drama ''[[Happy Days (2007 film)|Happy Days]]'' (2007), and went on to star in films such as ''[[Kurradu]]'' (2009).`;
  const v = heroProseVerdicts(text, films);
  it("applies list verdicts to every listed film", () => {
    expect(v.get("a")?.verdict).toBe("hit");
    expect(v.get("b")?.verdict).toBe("hit");
  });
  it("reads contrasting clauses separately", () => {
    expect(v.get("c")?.verdict).toBe("flop");
    expect(v.get("d")?.verdict).toBe("super_hit");
    expect(v.get("e")?.verdict).toBe("hit");
    expect(v.get("f")?.verdict).toBe("disaster");
  });
  it("does not spread an adjective to other films in the sentence", () => {
    expect(v.get("g")?.verdict).toBe("blockbuster");
    expect(v.has("h")).toBe(false);
  });
});

describe("Telugu Wikipedia", () => {
  it("reads success and negated success", () => {
    expect(teluguVerdict("ఈ చిత్రం బాక్సాఫీస్ వద్ద విజయవంతమైంది.")?.verdict).toBe("hit");
    expect(teluguVerdict("ఈ చిత్రం బాక్సాఫీస్ వద్ద విజయం సాధించలేదు.")?.verdict).toBe("flop");
    expect(teluguVerdict("ఇది బాక్సాఫీస్ వద్ద ఒక మాదిరి విజయాన్ని సాధించింది.")?.verdict).toBe("average");
    // About another film: ignored.
    expect(teluguVerdict("వర్షం చిత్రం విజయవంతం అయిన వెంటనే ప్రభాస్ తదుపరి నటించిన చిత్రం ఇది.")).toBeNull();
  });
});

describe("trade blog lists", () => {
  it("normalises the blog's wording", () => {
    expect(normaliseTradeVerdict("ALL TIME INDUSTRY HIT")).toBe("blockbuster");
    expect(normaliseTradeVerdict("SUPER HITT")).toBe("super_hit");
    expect(normaliseTradeVerdict("Semi Hit")).toBe("above_average");
    expect(normaliseTradeVerdict("AVERGE")).toBe("average");
    expect(normaliseTradeVerdict("UTTER FLOP")).toBe("disaster");
    expect(normaliseTradeVerdict("Upcoming Release")).toBeNull();
    expect(normaliseTradeVerdict("OTT Release")).toBeNull();
  });
  it("parses list items and verdict tables", () => {
    const html = `<ul><li>POKIRI : ALL TIME INDUSTRY HIT</li><li>KITHAKITHALU : SUPER HIT</li></ul>
<table><tr><th>S. No.</th><th>Movie</th><th>Release Year</th><th>Languages</th><th>Verdict (Hit or Flop)</th></tr>
<tr><td>61</td><td>Krack</td><td>9-Jan-21</td><td>Telugu</td><td>Blockbuster</td></tr>
<tr><td>62</td><td>Khiladi</td><td>11-Feb-22</td><td>Telugu</td><td>Flop</td></tr></table>`;
    const rows = parseTradePage(html, 2006);
    expect(rows).toContainEqual(expect.objectContaining({ title: "KITHAKITHALU", year: 2006, verdict: "super_hit" }));
    expect(rows).toContainEqual(expect.objectContaining({ title: "Krack", year: 2021, verdict: "blockbuster" }));
    expect(rows).toContainEqual(expect.objectContaining({ title: "Khiladi", year: 2022, verdict: "flop" }));
  });
});
