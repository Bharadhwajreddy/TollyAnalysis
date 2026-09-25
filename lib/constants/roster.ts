import type { Industry, PersonStatus } from "@/lib/domain/types";

export interface RosterCandidate {
  slug: string;
  name: string;
  /** Industry of the actor's primary work; drives chart colour only. */
  industry: Industry;
  status: PersonStatus;
  /**
   * Demo-only shape parameter: first year the synthetic generator places films.
   * It is not a factual claim about the actor's career.
   */
  demoStartYear: number;
  /** Demo-only: exact number of synthetic films (used for emerging candidates). */
  demoFilmCount?: number;
}

/**
 * Curated initial roster, subject to lead-credit and title verification.
 * Panja Vaisshnav Tej is deliberately excluded by editorial decision and must
 * not be added without a new editorial decision recorded in the change log.
 */
export const INITIAL_ROSTER: RosterCandidate[] = [
  { slug: "chiranjeevi", name: "Chiranjeevi", industry: "telugu", status: "living_legacy", demoStartYear: 2000 },
  { slug: "mohan-babu", name: "Mohan Babu", industry: "telugu", status: "living_legacy", demoStartYear: 2000 },
  { slug: "balakrishna", name: "Balakrishna", industry: "telugu", status: "active", demoStartYear: 2000 },
  { slug: "nagarjuna", name: "Nagarjuna", industry: "telugu", status: "active", demoStartYear: 2000 },
  { slug: "venkatesh", name: "Venkatesh", industry: "telugu", status: "active", demoStartYear: 2000 },
  { slug: "rajasekhar", name: "Rajasekhar", industry: "telugu", status: "active", demoStartYear: 2000 },
  { slug: "pawan-kalyan", name: "Pawan Kalyan", industry: "telugu", status: "active", demoStartYear: 2000 },
  { slug: "mahesh-babu", name: "Mahesh Babu", industry: "telugu", status: "active", demoStartYear: 2000 },
  { slug: "prabhas", name: "Prabhas", industry: "telugu", status: "active", demoStartYear: 2002 },
  { slug: "jr-ntr", name: "Jr NTR", industry: "telugu", status: "active", demoStartYear: 2001 },
  { slug: "allu-arjun", name: "Allu Arjun", industry: "telugu", status: "active", demoStartYear: 2003 },
  { slug: "ram-charan", name: "Ram Charan", industry: "telugu", status: "active", demoStartYear: 2007 },
  { slug: "ravi-teja", name: "Ravi Teja", industry: "telugu", status: "active", demoStartYear: 2000 },
  { slug: "nani", name: "Nani", industry: "telugu", status: "active", demoStartYear: 2008 },
  { slug: "rana-daggubati", name: "Rana Daggubati", industry: "telugu", status: "active", demoStartYear: 2010 },
  { slug: "vijay-deverakonda", name: "Vijay Deverakonda", industry: "telugu", status: "active", demoStartYear: 2015 },
  { slug: "ram-pothineni", name: "Ram Pothineni", industry: "telugu", status: "active", demoStartYear: 2006 },
  { slug: "nithiin", name: "Nithiin", industry: "telugu", status: "active", demoStartYear: 2002 },
  { slug: "naga-chaitanya", name: "Naga Chaitanya", industry: "telugu", status: "active", demoStartYear: 2009 },
  { slug: "akhil-akkineni", name: "Akhil Akkineni", industry: "telugu", status: "active", demoStartYear: 2015 },
  { slug: "varun-tej", name: "Varun Tej", industry: "telugu", status: "active", demoStartYear: 2014 },
  { slug: "sai-durgha-tej", name: "Sai Durgha Tej", industry: "telugu", status: "active", demoStartYear: 2014 },
  { slug: "gopichand", name: "Gopichand", industry: "telugu", status: "active", demoStartYear: 2001 },
  { slug: "nikhil-siddhartha", name: "Nikhil Siddhartha", industry: "telugu", status: "active", demoStartYear: 2007 },
  { slug: "adivi-sesh", name: "Adivi Sesh", industry: "telugu", status: "active", demoStartYear: 2010 },
  { slug: "sree-vishnu", name: "Sree Vishnu", industry: "telugu", status: "active", demoStartYear: 2013 },
  { slug: "siddhu-jonnalagadda", name: "Siddhu Jonnalagadda", industry: "telugu", status: "active", demoStartYear: 2011 },
  { slug: "vishwak-sen", name: "Vishwak Sen", industry: "telugu", status: "active", demoStartYear: 2017 },
  { slug: "kiran-abbavaram", name: "Kiran Abbavaram", industry: "telugu", status: "active", demoStartYear: 2019 },
  { slug: "teja-sajja", name: "Teja Sajja", industry: "telugu", status: "active", demoStartYear: 2019 },
  { slug: "naveen-polishetty", name: "Naveen Polishetty", industry: "telugu", status: "active", demoStartYear: 2019 },
  { slug: "bellamkonda-sreenivas", name: "Bellamkonda Sreenivas", industry: "telugu", status: "active", demoStartYear: 2014 },
  { slug: "sumanth", name: "Sumanth", industry: "telugu", status: "active", demoStartYear: 2000 },
  { slug: "allari-naresh", name: "Allari Naresh", industry: "telugu", status: "active", demoStartYear: 2002 },
  { slug: "dulquer-salmaan", name: "Dulquer Salmaan", industry: "malayalam", status: "active", demoStartYear: 2012 },
  { slug: "suriya", name: "Suriya", industry: "tamil", status: "active", demoStartYear: 2003 },
  { slug: "karthi", name: "Karthi", industry: "tamil", status: "active", demoStartYear: 2007 },
  { slug: "rajinikanth", name: "Rajinikanth", industry: "tamil", status: "living_legacy", demoStartYear: 2002 },
  { slug: "sivakarthikeyan", name: "Sivakarthikeyan", industry: "tamil", status: "active", demoStartYear: 2013 },
  {
    slug: "mouli-tanuj-prasanth",
    name: "Mouli Tanuj Prasanth",
    industry: "telugu",
    status: "review",
    demoStartYear: 2025,
    demoFilmCount: 1,
  },
];

/** Names that must never appear in the seed roster without a new editorial decision. */
export const EDITORIALLY_EXCLUDED_NAMES = ["Panja Vaisshnav Tej"];
