import type { TradeVerdict } from "@/lib/domain/types";
import { plainText } from "./wikitext";

/**
 * Reads box-office verdicts from Wikipedia prose.
 *
 *  • articleVerdict(wikitext)          — a film's own English article (all sections except plot,
 *                                        cast, music and production), box-office section first.
 *  • heroProseVerdicts(wikitext, films) — sentences in a hero's article that name his films, e.g.
 *                                        "commercial successes such as Kithakithalu (2006), Gamyam (2008)…".
 *  • teluguVerdict(wikitext)           — a film's Telugu Wikipedia article (విజయం, ఫ్లాప్, …).
 *
 * Every result carries the sentence it was read from so the call can be checked.
 */

export interface VerdictHit {
  verdict: TradeVerdict;
  sentence: string;
}

const WORD = String.raw`(?:\w+[- ]){0,2}`;

/** Explicit verdict words, strongest first. */
const STRONG: [RegExp, TradeVerdict][] = [
  [/\b(all[- ]time blockbuster|industry hit|blockbuster|biggest hit of (?:the year|his career|\d{4})|(?:the |(?:second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|[2-9]th|10th|2nd|3rd) )highest[- ]grossing (?:telugu |indian )?films? (?:of all time|ever))\b/i, "blockbuster"],
  [
    new RegExp(
      String.raw`\b(super[- ]?hits?|(?:huge|massive|major|big|tremendous|resounding|smashing|phenomenal|runaway|roaring|grand|blockbuster|great|enormous|record[- ]breaking) (?:commercial |box[- ]office |financial )?(?:success|hit)|silver jubilee|golden jubilee)\b`,
      "i",
    ),
    "super_hit",
  ],
  [/\b(disasters?|box[- ]office bombs?|bombed|commercial bomb|was a bomb|debacle|wash-?out|major (?:commercial |box[- ]office )?failure|huge loss(?:es)?|heavy loss(?:es)?|biggest (?:flops?|failures?))\b/i, "disaster"],
  [
    new RegExp(
      String.raw`\b(flop(?:ped|s)?|commercial(?:ly)? (?:failure|unsuccessful|flop)|box[- ]office (?:failure|flop|dud)|critical and commercial failure|commercial and critical failure|failure (?:both )?(?:critically and )?commercially|failed (?:commercially|at the box[- ]office|to (?:do well|perform|recover|make (?:an|any) impact|succeed|attract|click|work))|unsuccessful (?:at the box[- ]office|commercially)|under-?performed|failure at the box[- ]office|loss(?:es)? (?:to|for) (?:the )?(?:distributors|producers?|buyers)|poor(?:ly)? (?:performance|collections?|response|run|opening)(?: at the box[- ]office)?|(?:did not|didn't|did n't) (?:do|perform|fare|run) (?:well|good)|fared poorly|performed poorly|tanked|sank at the box[- ]office|met with failure|a dud|commercial dud)\b`,
      "i",
    ),
    "flop",
  ],
  [/\b(below[- ]average|mixed (?:response|result|performance|run) at the box[- ]office|lukewarm (?:response|performance|run|collections?) at the box[- ]office|average to below)\b/i, "below_average"],
  [/\b(above[- ]average|decent (?:success|hit|run|collections?|grosser|business|returns)|semi[- ]hit)\b/i, "above_average"],
  [
    /\b(average (?:grosser|hit|run|success|business|result|fare at the box[- ]office|at the box[- ]office)|(?:was|an|as an|as) average (?:grosser|film commercially|commercially)|moderate (?:commercial |box[- ]office |financial )?success|moderately successful|modest (?:commercial |box[- ]office )?success|reasonably successful|(?:just|only|barely|merely) (?:managed to )?(?:break[- ]?even|broke even|recover(?:ed)? (?:its|the) (?:investment|budget|costs?))|average (?:fare|film) commercially)\b/i,
    "average",
  ],
  [
    new RegExp(
      String.raw`\b(commercial(?:ly)? (?:success(?:ful)?|hit)|critical and commercial success|commercial and critical success|box[- ]office (?:success|hit)|(?:was|became|become|emerged as|emerging as|turned out (?:to )?be|proved (?:to be )?|declared|declared as|went on to become|ended up as|ended up being) (?:a |an )?${WORD}(?:hit|success)|successful (?:at|in) the box[- ]office|success at the box[- ]office|profitable|sleeper hit|hit at the box[- ]office|(?:performed|did|fared|ran) (?:very |quite |reasonably |extremely )?well(?: at the box[- ]office| commercially| in theatres)?|good (?:business|collections?|run|returns)|money[- ]spinner|successful venture|sneaked through with success|financial success|success(?:es)? such as|hits? such as)\b`,
      "i",
    ),
    "hit",
  ],
];

/** Weaker signals, used only when no explicit verdict was found anywhere in the text. */
const WEAK: [RegExp, TradeVerdict][] = [
  [/\b(highest[- ]grossing (?:telugu )?films? (?:of|in) (?:the year|\d{4})|(?:second|third|fourth|fifth|\d+(?:st|nd|rd|th))[- ]highest[- ]grossing|one of the highest[- ]grossing|highest[- ]grossing (?:film|movie) (?:in|of) (?:his|her|the actor's) career)\b/i, "hit"],
];

/** "completed 100 days in 60 centres" → hit; 175+ days → super hit; 50 days → average. */
function dayRunVerdict(s: string): TradeVerdict | null {
  if (!/\b(centres|centers|theatres|theaters|screens|venues|days?[- ]run|ran for|theatrical run|run of)\b/i.test(s)) return null;
  if (/\b(shoot|shooting|filming|filmed|schedule|production)\b/i.test(s)) return null;
  let max = 0;
  for (const m of s.matchAll(/\b(\d{2,3}|fifty|hundred|a hundred)[- ](?:days?|day)\b/gi)) {
    const n = /fifty/i.test(m[1]) ? 50 : /hundred/i.test(m[1]) ? 100 : Number(m[1]);
    if (n > max) max = n;
  }
  if (/more than (?:a )?hundred days|over (?:a )?hundred days/i.test(s)) max = Math.max(max, 100);
  if (max >= 175) return "super_hit";
  if (max >= 100) return "hit";
  // A 50-day run says little on its own (big films run 50 days in hundreds of centres).
  return null;
}

const POSITIVE = new Set<TradeVerdict>(["blockbuster", "super_hit", "hit", "above_average"]);

/** Removes text that talks about another film or speculates. */
function scrub(s: string): string {
  return (
    s
      // Quotations are opinions, not results.
      .replace(/"[^"]{25,}"/g, " ")
      .replace(/“[^”]{25,}”/g, " ")
      // An unterminated quotation runs to the end of the sentence.
      .replace(/["“][^"”]{12,}$/g, " ")
      // "after the success of X", "his previous hit", "the Tamil blockbuster"
      .replace(/\b(?:after|following|on the heels of|riding (?:high )?on|buoyed by|on the back of|given|because of|due to|inspired by|impressed (?:by|with)) (?:the )?(?:\w+ ){0,3}(?:success|hit|failure|flop|blockbuster)s? of [^,.;]*/gi, " ")
      .replace(/\b(?:his|her|their|the director's|the producer's|the actor's|its) (?:\w+ )?(?:previous|last|earlier|prior|next|first|consecutive) (?:\w+ ){0,2}(?:hits?|films?|success(?:es)?|flops?|blockbusters?|failures?)\b[^,.;]*/gi, " ")
      .replace(/\b(?:tamil|hindi|kannada|malayalam|bollywood|bengali|marathi|original) (?:\w+ )?(?:hit|blockbuster|film|success|flop)\b/gi, " ")
      .replace(/\b(?:the )?success of (?:the )?(?:\w+ ){0,3}(?:film|movie|franchise|series|predecessor|first part|original)\b/gi, " ")
      .replace(/\bafter (?:\w+ ){0,3}(?:flops?|hits?|failures?|successes|disasters?|blockbusters?)\b[^,.;]*/gi, " ")
      // "…as the other summer releases bombed", "unlike his previous films": other films' results.
      .replace(/\b(?:as |while |when |since )?(?:the |all )?other (?:\w+ ){0,4}(?:releases|films|movies|pictures) (?:\w+ ){0,2}(?:bombed|flopped|failed|tanked|sank|were|did|performed|fared)\b[^,.;]*/gi, " ")
      .replace(/\b(?:unlike|compared (?:to|with)) (?:\w+ ){0,4}(?:films?|releases?|movies?)\b[^,.;]*/gi, " ")
      // "…was later remade in Hindi as X, which was a hit": the rest is about the remake.
      .replace(/\b(?:was |were )?(?:later |also )?remade (?:in|into|as)\b.*$/i, " ")
      // "Despite X, Y": only Y is the result.
      .replace(/^\s*despite [^,]*,/i, " ")
  );
}

// Case-sensitive so the month "May" is not read as speculation.
const SPECULATIVE = /\b(may|might|could|would|should|sure to|likely to|expected to|hopes?|hoping|predicted|bound to|set to|aims? to|wish(?:ed|es)?|if|needed to|has to|have to)\b/;
const NOT_ABOUT_FILM = /\b(songs?|soundtrack|album|audio|music|trailer|teaser|first look|satellite|ott rights|television premiere|trp|tv premiere|re-?release|dubbed version|hindi version|tamil version|youtube|views)\b/i;

/** Classifies one sentence; null when it states no verdict. */
type Pass = "strong" | "days" | "weak";

/** Classifies one sentence; null when it states no verdict. */
export function classifySentence(raw: string, pass: Pass | boolean = "strong"): TradeVerdict | null {
  return findVerdict(raw, pass === true ? "weak" : pass === false ? "strong" : pass)?.verdict ?? null;
}

/** Like classifySentence, but also says where the verdict phrase sits in the scrubbed text. */
interface Match {
  verdict: TradeVerdict;
  index: number;
  end: number;
  prio: number;
}

/** Scrubs a sentence and returns every accepted verdict phrase in it, or null if the sentence is off-topic. */
function verdictMatches(raw: string, pass: Pass): { text: string; matches: Match[] } | null {
  const s = scrub(raw);
  if (NOT_ABOUT_FILM.test(s) && !/box[- ]office|commercial|collections?|gross/i.test(s)) return null;
  if (pass === "days") {
    const v = dayRunVerdict(s);
    return { text: s, matches: v ? [{ verdict: v, index: 0, end: s.length, prio: 0 }] : [] };
  }
  // "a remake of the Tamil hit X" talks about another film; "was later remade in Hindi" does not.
  if (/\bremake of|remade from\b/i.test(s)) return null;
  // Another version or market of the film, not its own result.
  if (/\b(dubbed|hindi version|tamil version|kannada version|malayalam version|re-?release[ds]?|in china|in japan|in the north)\b/i.test(s)) return null;
  // Reviews describe quality, not results, unless they talk about the box office.
  if (/\b(wrote|writes|opined|reviewer|critics?|review|called it|calling it|praised|rated)\b/i.test(s) && !/box[- ]office|commercial|collect|gross|distributor/i.test(s)) return null;
  const rules = pass === "weak" ? WEAK : STRONG;
  const matches: Match[] = [];
  rules.forEach(([re, verdict], prio) => {
    for (const m of s.matchAll(new RegExp(re.source, "gi"))) {
      const index = m.index!;
      const before = s.slice(Math.max(0, index - 40), index);
      if (SPECULATIVE.test(before)) continue;
      // "a critical success" says nothing about the box office.
      if (/critical(?:ly)?/i.test(m[0]) && !/commercial|box/i.test(m[0])) continue;
      if (/\bcritical(?:ly)? (?:\w+ )?$/i.test(before) && !/commercial|box/i.test(m[0] + before)) continue;
      // Opening-day or overseas-only performance is not the film's result.
      if (/\bwell\b/i.test(m[0]) && /first day|opening|first weekend|in the (?:us|usa|united states|uk|overseas)|overseas|premiere/i.test(s)) continue;
      const negated = /(?:\b(?:not|never|no|hardly|neither|nor)\s+|n't\s+|\b(?:failed|struggled|unable|could not|couldn't) to\s+)(?:\w+\s+){0,3}$/i.test(before);
      // "was not a success" → flop; "not a flop" → no verdict.
      if (negated && !POSITIVE.has(verdict)) continue;
      matches.push({ verdict: negated ? "flop" : verdict, index, end: index + m[0].length, prio });
    }
  });
  return { text: s, matches };
}

/** Like classifySentence, but also says where the verdict phrase sits in the scrubbed text. */
export function findVerdict(raw: string, pass: Pass = "strong"): { verdict: TradeVerdict; index: number; end: number; text: string } | null {
  const r = verdictMatches(raw, pass);
  if (!r?.matches.length) return null;
  // Strongest wording wins; ties go to the earliest phrase.
  const best = [...r.matches].sort((x, y) => x.prio - y.prio || x.index - y.index)[0];
  return { verdict: best.verdict, index: best.index, end: best.end, text: r.text };
}

/** Every verdict phrase in a sentence, left to right, overlaps resolved toward the stronger wording. */
export function findAllVerdicts(raw: string): { text: string; matches: Match[] } | null {
  const r = verdictMatches(raw, "strong");
  if (!r) return null;
  const kept: Match[] = [];
  for (const m of [...r.matches].sort((x, y) => x.prio - y.prio || x.index - y.index)) {
    if (!kept.some((k) => m.index < k.end && k.index < m.end)) kept.push(m);
  }
  return { text: r.text, matches: kept.sort((x, y) => x.index - y.index) };
}

function sentencesOf(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z"“'(§])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

const SKIP_SECTION = /accolades|awards|nominations|plot|synopsis|story|premise|cast|crew|soundtrack|music|songs|track ?list|production|development|casting|filming|pre-production|post-production|themes|influences|references|external links|see also|notes|further reading|bibliography|trivia|controvers|legal|marketing|promotion|in other languages|remakes?|sequel/i;
const BOX_SECTION = /box[- ]office|commercial|collection|business|performance|verdict|theatrical run|financial/i;

/** Splits an article into [heading, body] pairs; the lead has heading "". */
function sections(wikitext: string): [string, string][] {
  const out: [string, string][] = [];
  const re = /^(={2,4})\s*([^=\n]+?)\s*\1\s*$/gm;
  let last = 0;
  let heading = "";
  const path: string[] = [];
  for (const m of wikitext.matchAll(re)) {
    out.push([heading, wikitext.slice(last, m.index)]);
    const level = m[1].length;
    path.length = Math.max(0, level - 2);
    path[level - 2] = m[2];
    heading = path.filter(Boolean).join(" > ");
    last = m.index! + m[0].length;
  }
  out.push([heading, wikitext.slice(last)]);
  return out;
}

const stripRefs = (t: string) =>
  t
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");

const stripInfobox = (t: string) => {
  const start = t.search(/\{\{\s*Infobox/i);
  if (start < 0) return t;
  let depth = 0;
  for (let i = start; i < t.length - 1; i++) {
    if (t.startsWith("{{", i)) {
      depth++;
      i++;
    } else if (t.startsWith("}}", i)) {
      depth--;
      i++;
      if (depth === 0) return t.slice(0, start) + t.slice(i + 1);
    }
  }
  return t;
};

/** Verdict from a film's own English article. Box-office sections win over the lead, the lead over the rest. */
export function articleVerdict(wikitext: string): VerdictHit | null {
  const tiers: string[][] = [[], [], []];
  for (const [heading, body] of sections(stripRefs(stripInfobox(wikitext)))) {
    if (heading && SKIP_SECTION.test(heading) && !BOX_SECTION.test(heading)) continue;
    const tier = heading === "" ? 1 : BOX_SECTION.test(heading) ? 0 : 2;
    // Tables (box-office breakdowns, accolades) carry no sentences.
    const prose = body
      .split("\n")
      .filter((l) => !/^\s*[{|}!*#]/.test(l))
      .join("\n");
    tiers[tier].push(...sentencesOf(plainText(prose)));
  }
  for (const pass of ["strong", "days", "weak"] as const) {
    for (const tier of tiers) {
      for (const s of tier) {
        const v = classifySentence(s, pass);
        if (v) return { verdict: v, sentence: s.slice(0, 280) };
      }
    }
  }
  return null;
}

/* ───────────────────────── hero-article prose ───────────────────────── */

export interface HeroFilmRef {
  key: string;
  /** English article title, if any. */
  article: string | null;
  title: string;
  year: number;
}

const normTitle = (t: string) =>
  t
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Finds sentences in a hero's article (or filmography page) that give a verdict for his films.
 * Lists ("commercial successes such as A, B and C") give every listed film that verdict;
 * contrasting clauses ("A was a hit, while B flopped") are read separately.
 */
export function heroProseVerdicts(wikitext: string, films: HeroFilmRef[]): Map<string, VerdictHit> {
  const byArticle = new Map(films.filter((f) => f.article).map((f) => [f.article!.toLowerCase(), f]));
  const byTitle = new Map<string, HeroFilmRef[]>();
  for (const f of films) byTitle.set(normTitle(f.title), [...(byTitle.get(normTitle(f.title)) ?? []), f]);
  const out = new Map<string, VerdictHit>();
  /** Films whose current verdict came from a multi-film list. */
  const listed = new Set<string>();

  const body = stripRefs(stripInfobox(wikitext));
  for (const [heading, text] of sections(body)) {
    if (/filmography|awards|references|external|personal|see also|notes|television|discography/i.test(heading)) continue;
    // Protect film links and italic titles from sentence splitting.
    const refs: { film: HeroFilmRef | null; label: string }[] = [];
    const year = (s: string) => Number(/\((\d{4})\)/.exec(s)?.[1] ?? 0);
    let t = text
      .split("\n")
      .filter((l) => !/^\s*[{|}!*#:]/.test(l))
      .join(" ")
      .replace(/''\[\[([^|\]#]+)(?:#[^|\]]*)?(?:\|([^\]]+))?\]\]''(\s*\(\d{4}\))?/g, (_m, target: string, label: string | undefined, yr: string | undefined) => {
        const key = target.trim().replace(/_/g, " ");
        let film = byArticle.get(key.toLowerCase()) ?? null;
        if (!film) {
          const cands = byTitle.get(normTitle(label ?? key)) ?? [];
          film = cands.length === 1 ? cands[0] : (cands.find((c) => c.year === year(yr ?? "")) ?? null);
        }
        refs.push({ film, label: plainText(label ?? key) });
        return ` §${refs.length - 1}§${yr ?? ""} `;
      })
      .replace(/''([^'[\]{}]{2,60})''(\s*\(\d{4}\))?/g, (_m, label: string, yr: string | undefined) => {
        const cands = byTitle.get(normTitle(label)) ?? [];
        const film = cands.length === 1 ? cands[0] : (cands.find((c) => c.year === year(yr ?? "")) ?? null);
        refs.push({ film, label });
        return ` §${refs.length - 1}§${yr ?? ""} `;
      });
    t = plainText(t);
    for (const sentence of sentencesOf(t)) {
      if (!/§\d+§/.test(sentence)) continue;
      const readable = sentence.replace(/§(\d+)§/g, (_m, i) => refs[+i].label);
      if (/\bremake of|remade from\b/i.test(sentence)) continue;
      // Contrasting clauses are read on their own.
      const clauses = sentence.split(/\b(?:while|whereas|where as|but|however|though|although|followed by|and then|after which|before)\b|;/i);
      for (const clause of clauses) {
        if (!/§\d+§/.test(clause)) continue;
        const all = findAllVerdicts(clause);
        if (!all?.matches.length) continue;
        const t = all.text;
        const tokens = [...t.matchAll(/§(\d+)§/g)].map((m) => ({ at: m.index!, film: refs[+m[1]].film }));
        all.matches.forEach((hit, i) => {
          // Each phrase only reaches films between its neighbouring phrases.
          const lo = i > 0 ? all.matches[i - 1].end : 0;
          const hi = i < all.matches.length - 1 ? all.matches[i + 1].index : t.length;
          const before = tokens.filter((x) => x.at >= lo && x.at < hit.index);
          const after = tokens.filter((x) => x.at >= hit.end && x.at < hi);
          let chosen: typeof tokens = [];
          const gapAfter = after.length ? t.slice(hit.end, after[0].at) : "";
          // The phrase itself may carry the verb ("was a commercial success").
          const phrase = t.slice(hit.index, hit.end);
          const gapBefore = before.length ? t.slice(before[before.length - 1].at, hit.index) + phrase.split(" ")[0] : "";
          const predicative = /^(was|were|became|become|emerged|turned|proved|declared|went|ended|performed|did|fared|ran)\b/i.test(phrase);
          const listIntro = /\b(such as|including|like)$/i.test(phrase) || /^[^§]{0,45}\b(such as|including|like|namely|in the form of|with)\b[^§]{0,20}$/i.test(gapAfter);
          if (after.length && listIntro) {
            // "commercial successes such as A, B and C"
            chosen = after;
          } else if (before.length && gapBefore.length < 90 && /\b(were|all|both|each|films)\b/i.test(gapBefore)) {
            // "A, B and C were commercially successful"
            chosen = before;
          } else if (before.length && gapBefore.length < 90 && /\b(which|that|was|became|proved|turned|emerged|went|is|ended|met|a)\b/i.test(gapBefore)) {
            // "A (2003), which was a box office failure"
            chosen = [before[before.length - 1]];
          } else if (!predicative && after.length && gapAfter.length < 30 && !/\b(was|were|is|became|and|with|after|before)\b/i.test(gapAfter)) {
            // "the blockbuster A", "the commercially successful A"
            chosen = [after[0]];
          }
          // A sentence about one film beats a general list ("commercial successes such as …").
          const fromList = chosen.length > 1;
          for (const { film } of chosen) {
            if (!film) continue;
            const prev = out.get(film.key);
            if (!prev || (fromList === false && listed.has(film.key))) {
              out.set(film.key, { verdict: hit.verdict, sentence: readable.slice(0, 280) });
              if (fromList) listed.add(film.key);
              else listed.delete(film.key);
            }
          }
        });
      }
    }
  }
  return out;
}

/* ───────────────────────── Telugu Wikipedia ───────────────────────── */

const TE_RULES: [RegExp, TradeVerdict][] = [
  [/యావరేజ్|సగటు\s?విజయ|ఓ\s?మోస్తరు|మోస్తరు\s?విజయ|ఒక\s?మాదిరి\s?విజయ|మాదిరి\s?విజయ|పర్వాలేదనిపించ/, "average"],
  [/బ్లాక్\s?‌?బస్టర్|ఇండస్ట్రీ\s?హిట్/, "blockbuster"],
  [/సూపర్\s?‌?హిట్|ఘన\s?విజయ|అఖండ\s?విజయ|భారీ\s?విజయ|సంచలన\s?విజయ|రజతోత్సవ|175\s?రోజుల/, "super_hit"],
  [/డిజాస్టర్|ఘోర\s?పరాజయ|భారీ\s?నష్ట/, "disaster"],
  [/ఫ్లాప్|పరాజయ|అపజయ|విఫలమై|విఫలం|నష్టాల/, "flop"],
  [/విజయం\s?సాధించ|విజయవంత|హిట్|శతదినోత్సవ|100\s?రోజుల|వంద\s?రోజుల|విజయాన్ని\s?(?:సాధించ|అందుకుం)|మంచి\s?వసూళ్ల/, "hit"],
];
const TE_NEG = /(లేదు|లేకపోయ|కాలేదు|కాలేక|లేక|పోయింది)/;
const TE_CONTEXT = /చిత్రం|సినిమా|బాక్సాఫీస్|బాక్స్\s?ఆఫీస్|వసూళ్ల|వసూలు|ప్రేక్షకుల|విడుదల/;
const TE_SKIP = /పాట|సంగీత|ఆడియో|రీమేక్|పునర్నిర్మాణ|డబ్బింగ్|తమిళ|హిందీ|కన్నడ|మలయాళ|ముందు|తరువాత|తర్వాత|వెంటనే|అంచనా|కావాలనే|కోరుకొం|తో\s?విజయం\s?సాధించిన|పూర్తి\s?చేసుకొని|"/;
// The sentence must be about this film ("ఈ చిత్రం", "ఈ సినిమా", "ఇది") or its box office.
const TE_SUBJECT = /ఈ\s?(?:చిత్రం|చిత్రము|సినిమా)|^ఇది|\sఇది\s|బాక్సాఫీస|బాక్స్\s?ఆఫీస|కేంద్రాల/;

/** Verdict from a Telugu Wikipedia film article (negations such as విజయం సాధించలేదు read as flop). */
export function teluguVerdict(wikitext: string): VerdictHit | null {
  const text = plainText(
    sections(stripRefs(stripInfobox(wikitext)))
      .filter(([h]) => !/కథ|తారాగణం|నటీనటులు|పాటలు|సంగీతం|సాంకేతిక|మూలాలు|బయటి|plot|cast|songs|music|crew|references/i.test(h))
      .map(([, b]) => b)
      .join("\n"),
  );
  const sentences = text.split(/(?<=[.!?।])\s+/).filter((s) => s.length > 8 && TE_CONTEXT.test(s) && TE_SUBJECT.test(s) && !TE_SKIP.test(s));
  for (const [re, verdict] of TE_RULES) {
    for (const s of sentences) {
      const m = re.exec(s);
      if (!m) continue;
      const after = s.slice(m.index, m.index + m[0].length + 24);
      if (TE_NEG.test(after) && POSITIVE.has(verdict)) return { verdict: "flop", sentence: s.slice(0, 280) };
      if (TE_NEG.test(after)) continue;
      return { verdict, sentence: s.slice(0, 280) };
    }
  }
  return null;
}
