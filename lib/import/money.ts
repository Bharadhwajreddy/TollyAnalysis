/**
 * Parses Indian box-office amounts from Wikipedia infobox wikitext into crores (₹).
 * Handles {{INR}}, {{INR|x}}, {{Indian Rupee}}, {{INRConvert|x|c}}, dash templates, lakh /
 * crore / billion units on either side of a range ("₹60 lakh–₹1.2 crore"), and
 * "distributors' share" figures (flagged, since a share is not a gross).
 * Non-rupee amounts return null. Values above ₹3,000 crore are rejected as parse errors.
 */
export interface Amount {
  low: number; // crore
  high: number; // crore
  text: string;
  /** true when the figure is a distributors' share rather than a gross. */
  isShare?: boolean;
}

const MAX_CRORE = 3000;

/** Removes a template (and everything nested inside it) by name, e.g. efn / refn / sfn. */
function stripTemplates(t: string, names: RegExp): string {
  let out = t;
  for (let guard = 0; guard < 20; guard++) {
    const m = new RegExp(`\\{\\{\\s*(?:${names.source})\\b`, "i").exec(out);
    if (!m) break;
    let depth = 0;
    let end = out.length;
    for (let i = m.index; i < out.length - 1; i++) {
      if (out.startsWith("{{", i)) {
        depth++;
        i++;
      } else if (out.startsWith("}}", i)) {
        depth--;
        i++;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    out = out.slice(0, m.index) + out.slice(end);
  }
  return out;
}

function unitFactor(unit: string | undefined): number | null {
  if (!unit) return null;
  const u = unit.toLowerCase();
  if (u.startsWith("cr")) return 1;
  if (u.startsWith("lakh") || u.startsWith("lac")) return 0.01;
  if (u.startsWith("billion") || u === "bn") return 100;
  if (u.startsWith("million")) return 0.1;
  return null;
}

export function parseCrore(raw: string | null): Amount | null {
  if (!raw) return null;
  let t = raw
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  t = stripTemplates(t, /efn|refn|sfn|efn-lr|notetag|cite/);
  t = t
    .replace(/\{\{\s*(?:n|en|e|end|em)?[- ]?dash\s*\}\}/gi, "–")
    .replace(/\{\{\s*(?:snd|spaced ndash|spaced en dash|–|-)\s*\}\}/gi, "–")
    .replace(/&ndash;|&#8211;|&mdash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\{\{\s*(?:estimation|est\.?|approx|circa|citation needed|cn|when)[^}]*\}\}/gi, "");
  // {{INRConvert|150|c}} / {{INRConvert|150|180|c}}
  t = t.replace(/\{\{\s*INRConvert\s*\|\s*([\d.,]+)\s*(?:\|\s*([\d.,]+)\s*)?\|\s*(c|l|b|crore|lakh|billion)[^}]*\}\}/gi, (_m, a, b, u) => {
    const unit = /^c/i.test(u) ? "crore" : /^l/i.test(u) ? "lakh" : "billion";
    return `₹${a}${b ? `–${b}` : ""} ${unit}`;
  });
  t = t
    .replace(/\{\{\s*(?:INR|Indian Rupee)\s*\|\s*(?:link\s*=[^|}]*\|?)?\s*([^{}]*?)\s*(?:\|[^{}]*)?\}\}/gi, (_m, inner) =>
      /^\s*link\s*=/.test(inner) || !inner.trim() ? "₹" : `₹${inner}`,
    )
    .replace(/\{\{\s*(?:INR|Indian Rupee)[^{}]*\}\}/gi, "₹")
    .replace(/\bRs\.?\s*/g, "₹");
  const text = t.replace(/\{\{[^{}]*\}\}/g, "").replace(/\s+/g, " ").trim();
  const start = text.indexOf("₹");
  if (start < 0) return null;
  const seg = text.slice(start, start + 90);
  const N = String.raw`(\d[\d,]*(?:\.\d+)?)`;
  const U = String.raw`(crores?|cr\b|lakhs?|lacs?|billion|bn\b|million)?`;
  const re = new RegExp(`₹\\s*${N}\\s*${U}\\s*(?:(?:[–-]|to)\\s*(?:₹\\s*)?${N}\\s*${U})?`, "i");
  const m = re.exec(seg);
  if (!m) return null;
  const f1 = unitFactor(m[2]);
  const f2 = unitFactor(m[4]);
  const fa = f1 ?? f2;
  const fb = f2 ?? f1;
  if (fa === null || fb === null) return null;
  const a = Number(m[1].replace(/,/g, "")) * fa;
  const b = m[3] ? Number(m[3].replace(/,/g, "")) * fb : a;
  if (!Number.isFinite(a) || a <= 0) return null;
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  if (high > MAX_CRORE) return null;
  const isShare = /\bshare\b/i.test(text.slice(start, start + 120));
  return { low: Math.round(low * 100) / 100, high: Math.round(high * 100) / 100, text: text.slice(start, start + 120), ...(isShare ? { isShare } : {}) };
}

/** Crore → paise (integer minor units as string) for the evidence store. */
export function croreToMinor(crore: number): string {
  // 1 crore = 10,000,000 rupees = 1,000,000,000 paise; keep two decimals of crore.
  return String(BigInt(Math.round(crore * 100)) * BigInt(10_000_000));
}
