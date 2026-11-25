/**
 * Editorial overrides applied on top of the automatic lead-role check.
 * Each entry is a film (Wikipedia article title) that must NOT count for that hero,
 * with the reason shown on his page. Keep this list small and explain every entry.
 *
 * The automatic check counts a hero billed #2–3 straight after another roster hero as a
 * co-lead. That is right for two-hero films (RRR, F2, Seethamma Vakitlo Sirimalle Chettu)
 * but wrong for supporting, antagonist and extended-cameo parts, listed here.
 */
export const EXCLUDED_CREDITS: Record<string, { film: string; reason: string }[]> = {
  sharwanand: [{ film: "unlinked:Kanam|2022", reason: "Tamil version of Oke Oka Jeevitham, which already counts" }],
  "rana-daggubati": [
    { film: "The Ghazi Attack", reason: "Hindi version of Ghazi, which already counts" },
    { film: "Baahubali: The Beginning", reason: "antagonist role, not a co-lead" },
    { film: "Baahubali 2: The Conclusion", reason: "antagonist role, not a co-lead" },
    { film: "N.T.R: Mahanayakudu", reason: "supporting role (N. Chandrababu Naidu)" },
  ],
  "allari-naresh": [
    { film: "Maharshi (2019 film)", reason: "supporting role in a Mahesh Babu film" },
    { film: "Naa Saami Ranga", reason: "supporting role in a Nagarjuna film" },
  ],
  "raj-tarun": [{ film: "Naa Saami Ranga", reason: "supporting role in a Nagarjuna film" }],
  "mohan-babu": [
    { film: "Yamadonga", reason: "supporting role (Yama) in a Jr NTR film" },
    { film: "Bujjigadu", reason: "supporting role in a Prabhas film" },
    { film: "The Paradise (2026 Indian film)", reason: "supporting role in a Nani film" },
  ],
  nagarjuna: [{ film: "Adhipathi", reason: "extended special appearance in a Mohan Babu film" }],
  rajasekhar: [{ film: "Biker (film)", reason: "supporting role in a Sharwanand film" }],
  "ravi-teja": [{ film: "Waltair Veerayya", reason: "extended supporting role in a Chiranjeevi film" }],
  gopichand: [{ film: "Varsham (2004 film)", reason: "antagonist role in a Prabhas film" }],
  "vishnu-manchu": [{ film: "Gayatri (2018 film)", reason: "extended cameo in a Mohan Babu film" }],
  "manchu-manoj": [{ film: "Mirai (2025 film)", reason: "antagonist role in a Teja Sajja film" }],
  satyadev: [
    { film: "ISmart Shankar", reason: "supporting role in a Ram Pothineni film" },
    { film: "Kingdom (2025 film)", reason: "supporting role in a Vijay Deverakonda film" },
  ],
  "taraka-ratna": [{ film: "Raja Cheyyi Vesthe", reason: "antagonist role in a Nara Rohit film" }],
  // Heroes from other industries (added November 2026).
  "kamal-haasan": [
    { film: "Mumbai Xpress (2005 Hindi film)", reason: "Hindi version of Mumbai Xpress, which already counts" },
    { film: "unlinked:Vishwaroop|2013", reason: "Hindi version of Vishwaroopam, which already counts" },
    { film: "unlinked:Vishwaroop II|2018", reason: "Hindi version of Vishwaroopam II, which already counts" },
  ],
  "vijay-sethupathi": [
    { film: "Sye Raa Narasimha Reddy", reason: "supporting role in a Chiranjeevi film" },
    { film: "Master (2021 film)", reason: "antagonist role in a Vijay film" },
    { film: "Vikram (2022 film)", reason: "antagonist role in a Kamal Haasan film" },
    { film: "Michael (2023 film)", reason: "supporting role in a Sundeep Kishan film" },
  ],
  sudeep: [{ film: "Sye Raa Narasimha Reddy", reason: "supporting role in a Chiranjeevi film" }],
  siddharth: [{ film: "Indian 2", reason: "supporting role in a Kamal Haasan film" }],
  mohanlal: [{ film: "Kaappaan", reason: "supporting role in a Suriya film" }],
  "fahadh-faasil": [{ film: "Vettaiyan", reason: "supporting role in a Rajinikanth film" }],
  "prithviraj-sukumaran": [{ film: "L2: Empuraan", reason: "supporting role in a Mohanlal film (he directed it)" }],
};

/**
 * Editorial includes: films where the hero IS the lead although the billing order says otherwise
 * (a heroine or a senior star is billed first, or the infobox lists many names). Each entry is a
 * film (Wikipedia article title) that must count for that hero. Keep this list small and explain
 * every entry; it is applied after the automatic check and before the editorial exclusions above
 * are reported on a hero's page.
 */
export const INCLUDED_CREDITS: Record<string, { film: string; reason: string; alsoReleasedIn?: string }[]> = {
  "jr-ntr": [
    { film: "Janatha Garage", reason: "the title lead; Mohanlal is billed first as a senior star" },
    { film: "War 2 (film)", reason: "co-lead of a Hindi film with Hrithik Roshan, who is billed first" },
  ],
  prabhas: [{ film: "Kalki 2898 AD", reason: "the lead; Amitabh Bachchan and Kamal Haasan are billed first as senior stars" }],
  nani: [
    { film: "Jersey (2019 film)", reason: "the lead (the filmography notes that he also dubbed for another film)" },
    { film: "Devadas (2018 film)", reason: "co-lead with Nagarjuna" },
  ],
  "anand-deverakonda": [{ film: "Baby (2023 film)", reason: "the male lead; the heroine is billed first" }],
  "naveen-polishetty": [{ film: "Miss Shetty Mr Polishetty", reason: "the male lead; the heroine is billed first" }],
  "rana-daggubati": [{ film: "Virata Parvam", reason: "the male lead; the heroine is billed first" }],
  "vishnu-manchu": [{ film: "Kannappa (film)", reason: "the title lead of a large ensemble" }],
  "akhil-akkineni": [{ film: "Agent (film)", reason: "the lead; Mammootty is billed first as a senior star" }],
  nithiin: [
    { film: "Maestro (2021 film)", reason: "the male lead; the heroine is billed first" },
    { film: "Sri Anjaneyam", reason: "the lead; Arjun Sarja is billed first as a senior star" },
  ],
  balakrishna: [{ film: "Sri Rama Rajyam", reason: "plays Rama, the lead; Akkineni Nageswara Rao is billed first as a senior star" }],
  nagarjuna: [
    { film: "Sri Ramadasu", reason: "the title lead; Akkineni Nageswara Rao is billed first as a senior star" },
    { film: "Manam (film)", reason: "a lead of the three-generation Akkineni film" },
  ],
  "mahesh-babu": [{ film: "Vamsi (film)", reason: "the lead; Krishna is billed first as a senior star" }],
  "naveen-chandra": [{ film: "Lacchimdeviki O Lekkundi", reason: "the male lead; the heroine is billed first" }],
  "raj-tarun": [{ film: "Uyyala Jampala", reason: "the male lead; the heroine is billed first" }],
  suhas: [
    { film: "Uppu Kappurambu", reason: "the male lead; the heroine is billed first" },
    { film: "Mandaadi", reason: "a lead of a Tamil film that was also released in Telugu", alsoReleasedIn: "Telugu" },
  ],
  thiruveer: [{ film: "Masooda", reason: "the male lead; the heroine is billed first" }],
  "uday-kiran": [{ film: "Neeku Nenu Naaku Nuvvu", reason: "the lead; Krishnam Raju is billed first as a senior star" }],
  "sundeep-kishan": [{ film: "Next Enti?", reason: "the male lead; the heroine is billed first" }],
  priyadarshi: [
    { film: "Mithai (film)", reason: "co-lead" },
    { film: "Rama Chakkani Seetha", reason: "co-lead" },
  ],
  "adivi-sesh": [{ film: "Dongaata (2015 film)", reason: "co-lead with Lakshmi Manchu" }],
};

/** Marks the editorial includes as lead credits (pure: used by the importer and by scripts/fix-credits.mts). */
export function applyIncludedCredits(
  credits: { hero: string; film: string; include: boolean; scope: string; excludeReason: string | null; billing?: string; role?: string }[],
  films?: Map<string, { languages: string[] }>,
): number {
  let n = 0;
  for (const [hero, list] of Object.entries(INCLUDED_CREDITS)) {
    for (const entry of list) {
      const rows = credits.filter((c) => c.hero === hero && c.film.replace(/_/g, " ") === entry.film);
      if (!rows.length || rows.some((c) => c.include)) continue;
      // Several rows for one film: the first one that names a real role carries the credit.
      const row = rows.find((c) => !/^(adult|young|child)\b/i.test(c.role ?? "")) ?? rows[0];
      row.include = true;
      row.scope = "lead";
      row.excludeReason = null;
      row.billing = `Editorial: ${entry.reason}`;
      // A film in another language that was also released in Telugu: record the Telugu release.
      const f = entry.alsoReleasedIn ? films?.get(row.film) : undefined;
      if (f && entry.alsoReleasedIn && !f.languages.some((l) => l.toLowerCase().includes(entry.alsoReleasedIn!.toLowerCase()))) f.languages.push(entry.alsoReleasedIn);
      n++;
    }
  }
  return n;
}
