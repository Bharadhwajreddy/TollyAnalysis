import type { Industry, PersonStatus } from "@/lib/domain/types";

export interface RosterCandidate {
  slug: string;
  name: string;
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
}

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
  status: "active",
  demoStartYear,
  wiki: Array.isArray(wiki) ? wiki : [wiki],
  ...extra,
});

/**
 * Master hero registry candidates, subject to lead-credit and title verification.
 * Actors from other industries qualify only through titles released in Telugu.
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
  h("siddharth", "Siddharth", "tamil", 2003, "Siddharth (actor)"),
  h("navdeep", "Navdeep", "telugu", 2004, "Navdeep"),
  h("ram-pothineni", "Ram Pothineni", "telugu", 2006, "Ram Pothineni"),
  h("varun-sandesh", "Varun Sandesh", "telugu", 2007, "Varun Sandesh"),
  h("nikhil-siddhartha", "Nikhil Siddhartha", "telugu", 2007, "Nikhil Siddhartha"),
  h("sushanth", "Sushanth", "telugu", 2008, "Sushanth (actor)"),
  h("nani", "Nani", "telugu", 2008, "Nani (actor)"),
  h("naga-chaitanya", "Naga Chaitanya", "telugu", 2009, "Naga Chaitanya"),
  h("nara-rohit", "Nara Rohit", "telugu", 2009, "Nara Rohit"),
  h("rana-daggubati", "Rana Daggubati", "telugu", 2010, "Rana Daggubati"),
  h("adivi-sesh", "Adivi Sesh", "telugu", 2010, "Adivi Sesh"),
  h("sundeep-kishan", "Sundeep Kishan", "telugu", 2010, "Sundeep Kishan"),
  h("naga-shaurya", "Naga Shaurya", "telugu", 2011, "Naga Shaurya"),
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
  h("karthikeya", "Karthikeya Gummakonda", "telugu", 2017, "Karthikeya Gummakonda"),
  h("kalyaan-dhev", "Kalyaan Dhev", "telugu", 2018, "Kalyaan Dhev"),
  h("kiran-abbavaram", "Kiran Abbavaram", "telugu", 2019, "Kiran Abbavaram"),
  h("teja-sajja", "Teja Sajja", "telugu", 2019, "Teja Sajja"),
  h("naveen-polishetty", "Naveen Polishetty", "telugu", 2019, "Naveen Polishetty"),
  h("anand-deverakonda", "Anand Deverakonda", "telugu", 2019, "Anand Deverakonda"),
  h("priyadarshi", "Priyadarshi", "telugu", 2019, ["Priyadarshi Pulikonda", "Priyadarshi (actor)"]),
  h("sri-simha", "Sri Simha Koduri", "telugu", 2019, "Sri Simha Koduri"),
  h("suhas", "Suhas", "telugu", 2020, ["Suhas (actor)", "Suhas (Telugu actor)"]),
  h("thiruveer", "Thiruveer", "telugu", 2021, "Thiruveer"),
  h("bellamkonda-ganesh", "Bellamkonda Ganesh", "telugu", 2022, "Bellamkonda Ganesh"),
  h("mouli-tanuj-prasanth", "Mouli Tanuj Prasanth", "telugu", 2025, "Mouli Tanuj Prasanth", { status: "review", demoFilmCount: 1 }),

  // Tamil — through Telugu-dubbed / bilingual releases
  h("rajinikanth", "Rajinikanth", "tamil", 2002, "Rajinikanth", { status: "living_legacy" }),
  h("kamal-haasan", "Kamal Haasan", "tamil", 2000, "Kamal Haasan", { status: "living_legacy" }),
  h("vijay", "Vijay", "tamil", 2004, "Vijay (actor)"),
  h("ajith-kumar", "Ajith Kumar", "tamil", 2004, "Ajith Kumar"),
  h("vikram", "Vikram", "tamil", 2003, "Vikram (actor)"),
  h("suriya", "Suriya", "tamil", 2003, "Suriya"),
  h("karthi", "Karthi", "tamil", 2007, "Karthi"),
  h("vishal", "Vishal", "tamil", 2005, "Vishal (actor)"),
  h("dhanush", "Dhanush", "tamil", 2010, "Dhanush"),
  h("arya", "Arya", "tamil", 2009, "Arya (actor)"),
  h("vijay-sethupathi", "Vijay Sethupathi", "tamil", 2016, "Vijay Sethupathi"),
  h("sivakarthikeyan", "Sivakarthikeyan", "tamil", 2013, "Sivakarthikeyan"),

  // Malayalam
  h("mohanlal", "Mohanlal", "malayalam", 2008, "Mohanlal", { status: "living_legacy" }),
  h("mammootty", "Mammootty", "malayalam", 2008, "Mammootty", { status: "living_legacy" }),
  h("dulquer-salmaan", "Dulquer Salmaan", "malayalam", 2012, "Dulquer Salmaan"),
  h("prithviraj", "Prithviraj Sukumaran", "malayalam", 2012, "Prithviraj Sukumaran"),
  h("fahadh-faasil", "Fahadh Faasil", "malayalam", 2017, "Fahadh Faasil"),

  // Kannada
  h("sudeep", "Kichcha Sudeep", "kannada", 2012, ["Sudeep", "Kichcha Sudeep"]),
  h("upendra", "Upendra", "kannada", 2002, "Upendra (actor)"),
  h("yash", "Yash", "kannada", 2018, "Yash (actor)"),
  h("rishab-shetty", "Rishab Shetty", "kannada", 2022, "Rishab Shetty"),

  // Hindi
  h("shah-rukh-khan", "Shah Rukh Khan", "hindi", 2013, "Shah Rukh Khan"),
  h("hrithik-roshan", "Hrithik Roshan", "hindi", 2006, "Hrithik Roshan"),
  h("ranbir-kapoor", "Ranbir Kapoor", "hindi", 2016, "Ranbir Kapoor"),
];

/** Names that must never appear in the seed roster without a new editorial decision. */
export const EDITORIALLY_EXCLUDED_NAMES = ["Panja Vaisshnav Tej"];
