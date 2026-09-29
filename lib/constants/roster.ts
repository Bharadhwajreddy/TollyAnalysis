import type { Industry, PersonStatus } from "@/lib/domain/types";

export type FilmFamily = "mega" | "nandamuri" | "akkineni" | "daggubati" | "ghattamaneni" | "manchu" | "other";

export interface RosterCandidate {
  slug: string;
  name: string;
  /** Tollywood film family, used to colour bars (like model makers on benchmark sites). */
  family: FilmFamily;
  /** Industry of the actor's primary work; drives chart colour only. */
  industry: Industry;
  status: PersonStatus;
  /** English Wikipedia article titles tried, in order, for the free-licensed Commons portrait. */
  wiki: string[];
  /**
   * Demo-only shape parameters: years in which the synthetic generator places films.
   * They are not factual claims about the actor's career.
   */
  demoStartYear: number;
  demoEndYear?: number;
  /** Demo-only: exact number of synthetic films (used for emerging candidates). */
  demoFilmCount?: number;
  /**
   * Editorial: this actor now mostly plays supporting / villain roles, so a film only
   * counts when he is billed first (never as "second hero").
   */
  strictBilling?: boolean;
}

/** Actors who moved into character roles; see `strictBilling`. */
const STRICT_BILLING = new Set(["jagapathi-babu", "srikanth", "sivaji", "srihari", "sunil", "naveen-chandra", "priyadarshi", "srinivas-avasarala", "rajendra-prasad"]);

const FAMILY: Record<string, FilmFamily> = {
  chiranjeevi: "mega",
  "pawan-kalyan": "mega",
  "ram-charan": "mega",
  "allu-arjun": "mega",
  "allu-sirish": "mega",
  "varun-tej": "mega",
  "sai-durgha-tej": "mega",
  "kalyaan-dhev": "mega",
  balakrishna: "nandamuri",
  "jr-ntr": "nandamuri",
  "kalyan-ram": "nandamuri",
  "taraka-ratna": "nandamuri",
  nagarjuna: "akkineni",
  "naga-chaitanya": "akkineni",
  "akhil-akkineni": "akkineni",
  sumanth: "akkineni",
  sushanth: "akkineni",
  venkatesh: "daggubati",
  "rana-daggubati": "daggubati",
  "mahesh-babu": "ghattamaneni",
  "sudheer-babu": "ghattamaneni",
  "mohan-babu": "manchu",
  "vishnu-manchu": "manchu",
  "manchu-manoj": "manchu",
};

const h = (
  slug: string,
  name: string,
  industry: Industry,
  demoStartYear: number,
  wiki: string | string[],
  extra: Partial<RosterCandidate> = {},
): RosterCandidate => ({
  slug,
  name,
  industry,
  family: FAMILY[slug] ?? "other",
  strictBilling: STRICT_BILLING.has(slug),
  status: "active",
  demoStartYear,
  wiki: Array.isArray(wiki) ? wiki : [wiki],
  ...extra,
});

/**
 * Master hero registry: Telugu film heroes, subject to lead-credit verification.
 * Panja Vaisshnav Tej is deliberately excluded by editorial decision and must
 * not be added without a new editorial decision recorded in the change log.
 */
export const INITIAL_ROSTER: RosterCandidate[] = [
  // Telugu — established
  h("chiranjeevi", "Chiranjeevi", "telugu", 2000, "Chiranjeevi", { status: "living_legacy" }),
  h("mohan-babu", "Mohan Babu", "telugu", 2000, "Mohan Babu", { status: "living_legacy" }),
  h("balakrishna", "Balakrishna", "telugu", 2000, "Nandamuri Balakrishna"),
  h("nagarjuna", "Nagarjuna", "telugu", 2000, "Nagarjuna (actor)"),
  h("venkatesh", "Venkatesh", "telugu", 2000, "Venkatesh (actor)"),
  h("rajasekhar", "Rajasekhar", "telugu", 2000, "Rajasekhar (actor)"),
  h("jagapathi-babu", "Jagapathi Babu", "telugu", 2000, "Jagapathi Babu"),
  h("srikanth", "Srikanth", "telugu", 2000, ["Srikanth (Telugu actor)", "Meka Srikanth", "Srikanth (actor)"]),
  h("rajendra-prasad", "Rajendra Prasad", "telugu", 2000, "Rajendra Prasad (actor)"),
  h("pawan-kalyan", "Pawan Kalyan", "telugu", 2000, "Pawan Kalyan"),
  h("mahesh-babu", "Mahesh Babu", "telugu", 2000, "Mahesh Babu"),
  h("prabhas", "Prabhas", "telugu", 2002, "Prabhas"),
  h("jr-ntr", "Jr NTR", "telugu", 2001, "N. T. Rama Rao Jr."),
  h("allu-arjun", "Allu Arjun", "telugu", 2003, "Allu Arjun"),
  h("ram-charan", "Ram Charan", "telugu", 2007, "Ram Charan"),
  h("ravi-teja", "Ravi Teja", "telugu", 2000, "Ravi Teja"),
  h("gopichand", "Gopichand", "telugu", 2001, "Gopichand (actor)"),
  h("sumanth", "Sumanth", "telugu", 2000, "Sumanth (actor)"),
  h("allari-naresh", "Allari Naresh", "telugu", 2002, "Allari Naresh"),
  h("kalyan-ram", "Kalyan Ram", "telugu", 2003, "Nandamuri Kalyan Ram"),
  h("vishnu-manchu", "Vishnu Manchu", "telugu", 2003, "Vishnu Manchu"),
  h("manchu-manoj", "Manchu Manoj", "telugu", 2004, "Manchu Manoj"),
  h("tarun", "Tarun", "telugu", 2000, ["Tarun (actor)", "Tarun Kumar"], { demoEndYear: 2018 }),
  h("uday-kiran", "Uday Kiran", "telugu", 2000, "Uday Kiran", { status: "review", demoEndYear: 2014 }),
  h("venu-thottempudi", "Venu Thottempudi", "telugu", 2000, "Venu Thottempudi", { demoEndYear: 2013 }),
  h("sivaji", "Sivaji", "telugu", 2000, ["Sivaji (Telugu actor)", "Sivaji (actor)"], { demoEndYear: 2016 }),
  h("sunil", "Sunil", "telugu", 2010, ["Sunil (actor)", "Sunil (Telugu actor)"]),
  h("sharwanand", "Sharwanand", "telugu", 2004, "Sharwanand"),
  h("nithiin", "Nithiin", "telugu", 2002, "Nithiin"),
  h("navdeep", "Navdeep", "telugu", 2004, "Navdeep"),
  h("ram-pothineni", "Ram Pothineni", "telugu", 2006, "Ram Pothineni"),
  h("varun-sandesh", "Varun Sandesh", "telugu", 2007, "Varun Sandesh"),
  h("nikhil-siddhartha", "Nikhil Siddhartha", "telugu", 2007, "Nikhil Siddhartha"),
  h("sushanth", "Sushanth", "telugu", 2008, ["Sushanth", "Sushanth (actor)"]),
  h("nani", "Nani", "telugu", 2008, "Nani (actor)"),
  h("naga-chaitanya", "Naga Chaitanya", "telugu", 2009, "Naga Chaitanya"),
  h("nara-rohit", "Nara Rohit", "telugu", 2009, "Nara Rohit"),
  h("rana-daggubati", "Rana Daggubati", "telugu", 2010, "Rana Daggubati"),
  h("adivi-sesh", "Adivi Sesh", "telugu", 2010, "Adivi Sesh"),
  h("sundeep-kishan", "Sundeep Kishan", "telugu", 2010, "Sundeep Kishan"),
  h("naga-shaurya", "Naga Shaurya", "telugu", 2011, ["Naga Shaurya", "Naga Shourya"]),
  h("aadi-saikumar", "Aadi Saikumar", "telugu", 2011, ["Aadi Saikumar", "Aadi (Telugu actor)", "Aadi (actor)"]),
  h("naveen-chandra", "Naveen Chandra", "telugu", 2011, "Naveen Chandra"),
  h("siddhu-jonnalagadda", "Siddhu Jonnalagadda", "telugu", 2011, "Siddhu Jonnalagadda"),
  h("satyadev", "Satyadev", "telugu", 2011, ["Satyadev (actor)", "Satyadev", "Satya Dev", "Satyadev Kancharana"]),
  h("sudheer-babu", "Sudheer Babu", "telugu", 2012, "Sudheer Babu"),
  h("sumanth-ashwin", "Sumanth Ashwin", "telugu", 2012, "Sumanth Ashwin"),
  h("sree-vishnu", "Sree Vishnu", "telugu", 2013, "Sree Vishnu"),
  h("raj-tarun", "Raj Tarun", "telugu", 2013, "Raj Tarun"),
  h("varun-tej", "Varun Tej", "telugu", 2014, "Varun Tej"),
  h("sai-durgha-tej", "Sai Durgha Tej", "telugu", 2014, ["Sai Durgha Tej", "Sai Dharam Tej"]),
  h("bellamkonda-sreenivas", "Bellamkonda Sreenivas", "telugu", 2014, ["Bellamkonda Sreenivas", "Bellamkonda Sai Sreenivas"]),
  h("srinivas-avasarala", "Srinivas Avasarala", "telugu", 2014, "Srinivas Avasarala"),
  h("sampoornesh-babu", "Sampoornesh Babu", "telugu", 2014, "Sampoornesh Babu"),
  h("vijay-deverakonda", "Vijay Deverakonda", "telugu", 2015, "Vijay Deverakonda"),
  h("akhil-akkineni", "Akhil Akkineni", "telugu", 2015, "Akhil Akkineni"),
  h("santosh-sobhan", "Santosh Sobhan", "telugu", 2015, "Santosh Sobhan"),
  h("vishwak-sen", "Vishwak Sen", "telugu", 2017, "Vishwak Sen"),
  h("karthikeya", "Kartikeya Gummakonda", "telugu", 2017, ["Kartikeya Gummakonda", "Karthikeya Gummakonda", "Kartikeya (actor)"]),
  h("kalyaan-dhev", "Kalyaan Dhev", "telugu", 2018, "Kalyaan Dhev"),
  h("kiran-abbavaram", "Kiran Abbavaram", "telugu", 2019, "Kiran Abbavaram"),
  h("teja-sajja", "Teja Sajja", "telugu", 2019, "Teja Sajja"),
  h("naveen-polishetty", "Naveen Polishetty", "telugu", 2019, "Naveen Polishetty"),
  h("anand-deverakonda", "Anand Deverakonda", "telugu", 2019, "Anand Deverakonda"),
  h("priyadarshi", "Priyadarshi", "telugu", 2019, ["Priyadarshi Pulikonda", "Priyadarshi (actor)"]),
  h("sri-simha", "Sri Simha Koduri", "telugu", 2019, "Sri Simha Koduri"),
  h("suhas", "Suhas", "telugu", 2020, ["Suhas (actor)", "Suhas (Telugu actor)"]),
  h("thiruveer", "Thiruveer", "telugu", 2021, "Thiruveer"),
  h("bellamkonda-ganesh", "Bellamkonda Ganesh", "telugu", 2022, ["Bellamkonda Ganesh", "Ganesh Bellamkonda"]),
  h("allu-sirish", "Allu Sirish", "telugu", 2013, "Allu Sirish"),
  h("taraka-ratna", "Taraka Ratna", "telugu", 2002, ["Taraka Ratna", "Nandamuri Taraka Ratna"], { status: "review", demoEndYear: 2022 }),
  h("srihari", "Srihari", "telugu", 2000, ["Srihari (actor)", "Srihari"], { status: "review", demoEndYear: 2013 }),
  h("aadi-pinisetty", "Aadi Pinisetty", "telugu", 2006, "Aadi Pinisetty"),
  h("mouli-tanuj-prasanth", "Mouli Tanuj Prasanth", "telugu", 2025, "Mouli Tanuj Prasanth", { status: "review", demoFilmCount: 1 }),
];

/** Names that must never appear in the seed roster without a new editorial decision. */
export const EDITORIALLY_EXCLUDED_NAMES = ["Panja Vaisshnav Tej"];
