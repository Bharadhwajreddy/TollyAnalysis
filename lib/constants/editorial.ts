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
  "rana-daggubati": [
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
};
