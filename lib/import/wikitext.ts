/**
 * Small wikitext helpers for importing Wikipedia filmographies and film infoboxes.
 * Only structured facts are extracted (years, titles, notes, budgets, grosses),
 * always with the source article recorded.
 */

/** Split on `sep` only at the top level (not inside [[ ]], {{ }} or <ref>…</ref>). */
export function splitTop(text: string, sep: string): string[] {
  const out: string[] = [];
  let depthSq = 0;
  let depthCurly = 0;
  let inRef = false;
  let cur = "";
  for (let i = 0; i < text.length; i++) {
    if (text.startsWith("<ref", i) && !text.startsWith("<references", i)) inRef = !/^<ref[^>]*\/>/.test(text.slice(i, i + 200)) || inRef;
    if (text.startsWith("</ref>", i)) inRef = false;
    if (text.startsWith("[[", i)) depthSq++;
    if (text.startsWith("]]", i)) depthSq = Math.max(0, depthSq - 1);
    if (text.startsWith("{{", i)) depthCurly++;
    if (text.startsWith("}}", i)) depthCurly = Math.max(0, depthCurly - 1);
    if (!inRef && depthSq === 0 && depthCurly === 0 && text.startsWith(sep, i)) {
      out.push(cur);
      cur = "";
      i += sep.length - 1;
      continue;
    }
    cur += text[i];
  }
  out.push(cur);
  return out;
}

export interface Cell {
  text: string;
  rowspan: number;
  colspan: number;
  header: boolean;
}

function parseCell(raw: string, header: boolean): Cell {
  const parts = splitTop(raw, "|");
  let attrs = "";
  let text = raw;
  if (parts.length > 1 && /^\s*(?:[a-z-]+\s*=\s*("[^"]*"|'[^']*'|[^\s|]+)\s*)+$/i.test(parts[0])) {
    attrs = parts[0];
    text = parts.slice(1).join("|");
  }
  const rs = /rowspan\s*=\s*"?(\d+)/i.exec(attrs);
  const cs = /colspan\s*=\s*"?(\d+)/i.exec(attrs);
  return { text: text.trim(), rowspan: rs ? Number(rs[1]) : 1, colspan: cs ? Number(cs[1]) : 1, header };
}

/** Parses every {| … |} table into a grid of cell texts with rowspans/colspans expanded. */
export function parseWikitables(wikitext: string): { headers: string[]; rows: string[][]; offset: number }[] {
  const tables: { headers: string[]; rows: string[][]; offset: number }[] = [];
  const re = /^\{\|/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(wikitext))) {
    // Find matching |} honouring nested tables.
    let depth = 0;
    let end = -1;
    const lines = wikitext.slice(m.index).split("\n");
    let consumed = 0;
    for (const line of lines) {
      consumed += line.length + 1;
      if (/^\s*\{\|/.test(line)) depth++;
      if (/^\s*\|\}/.test(line)) {
        depth--;
        if (depth === 0) {
          end = m.index + consumed;
          break;
        }
      }
    }
    if (end < 0) break;
    const body = wikitext.slice(m.index, end);
    re.lastIndex = end;

    const rawRows: Cell[][] = [];
    let current: Cell[] = [];
    for (const line of body.split("\n").slice(1)) {
      const l = line.trim();
      if (l.startsWith("|}")) break;
      if (l.startsWith("|+")) continue;
      if (l.startsWith("|-")) {
        if (current.length) rawRows.push(current);
        current = [];
        continue;
      }
      if (l.startsWith("!")) {
        for (const c of splitTop(l.slice(1), "!!")) current.push(parseCell(c, true));
      } else if (l.startsWith("|")) {
        for (const c of splitTop(l.slice(1), "||")) current.push(parseCell(c, false));
      } else if (current.length) {
        current[current.length - 1].text += "\n" + line;
      }
    }
    if (current.length) rawRows.push(current);
    if (!rawRows.length) continue;

    // Expand rowspan/colspan.
    const grid: string[][] = [];
    const pending: { text: string; left: number }[] = [];
    for (const row of rawRows) {
      const out: string[] = [];
      let col = 0;
      const queue = [...row];
      while (queue.length || pending.some((p, i) => i >= col && p && p.left > 0)) {
        if (pending[col] && pending[col].left > 0) {
          out.push(pending[col].text);
          pending[col].left--;
          col++;
          continue;
        }
        const cell = queue.shift();
        if (!cell) break;
        for (let k = 0; k < cell.colspan; k++) {
          out.push(cell.text);
          if (cell.rowspan > 1) pending[col] = { text: cell.text, left: cell.rowspan - 1 };
          col++;
        }
      }
      grid.push(out);
    }
    const headerIdx = rawRows.findIndex((r) => r.every((c) => c.header));
    const headers = headerIdx >= 0 ? grid[headerIdx].map((h) => plainText(h).toLowerCase()) : [];
    tables.push({ headers, rows: grid.slice(headerIdx + 1), offset: m.index });
  }
  return tables;
}

/** Strips templates, links, refs and markup down to readable text. */
export function plainText(s: string): string {
  let t = s
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, " ");
  // Common templates with a meaningful argument.
  t = t.replace(/\{\{\s*(?:sort|sortname)\s*\|[^|}]*\|([^}]*)\}\}/gi, "$1");
  t = t.replace(/\{\{\s*(?:nowrap|small|nobr|abbr)\s*\|([^|}]*)(?:\|[^}]*)?\}\}/gi, "$1");
  t = t.replace(/\{\{\s*(?:dagger|†)\s*\}\}/gi, "†");
  t = t.replace(/\{\{\s*(?:pending film|Pending film|unreleased)[^}]*\}\}/gi, "†");
  for (let i = 0; i < 4; i++) t = t.replace(/\{\{[^{}]*\}\}/g, "");
  t = t
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

/** First wiki link target in a cell, e.g. "Baahubali: The Beginning". */
export function firstLink(s: string): { target: string; text: string } | null {
  const m = /\[\[([^|\]#]+)(?:#[^|\]]*)?(?:\|([^\]]+))?\]\]/.exec(s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, ""));
  if (!m) return null;
  const target = m[1].trim().replace(/_/g, " ");
  if (/^(file|image|category):/i.test(target)) return null;
  return { target: target.charAt(0).toUpperCase() + target.slice(1), text: plainText(m[2] ?? m[1]) };
}

/** Value of an infobox parameter (raw wikitext), e.g. infoboxField(raw, "budget"). */
export function infoboxField(wikitext: string, field: string): string | null {
  const start = wikitext.search(/\{\{\s*Infobox\s+film/i);
  if (start < 0) return null;
  // Take the infobox body up to its matching }}.
  let depth = 0;
  let end = start;
  for (let i = start; i < wikitext.length - 1; i++) {
    if (wikitext.startsWith("{{", i)) {
      depth++;
      i++;
    } else if (wikitext.startsWith("}}", i)) {
      depth--;
      i++;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  const box = wikitext.slice(start + 2, end - 2);
  for (const part of splitTop(box, "|")) {
    const m = new RegExp(`^\\s*${field}\\s*=([\\s\\S]*)$`, "i").exec(part);
    if (m) return m[1].trim() || null;
  }
  return null;
}
