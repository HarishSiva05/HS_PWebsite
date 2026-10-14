// All site content lives here. Source of truth: the October 2026 résumé.

export const SUBJECT = {
  name: "Harish Sivaram",
  fileNo: "HS-0519",
  title: "Cybersecurity & Software Engineer",
  location: "Markham, Ontario",
  coords: "N 43°51′22″ · W 79°20′13″",
  email: "harish.portfolio05@gmail.com",
  github: "https://github.com/HarishSiva05",
  linkedin: "https://www.linkedin.com/in/harish-sivaram-a5a27b213/",
  resume: "/Harish-Sivaram-Resume.pdf",
  site: "https://harishsivaram.netlify.app",
}

export type Section = {
  id: string
  no: string
  /** The plain word a recruiter scans for. Used in the nav, menu and rail. */
  label: string
  /** Fuller plain label for the section's header row, when the nav word undersells it. */
  heading?: string
  /** The in-world dossier name, kept as secondary flavour. */
  dossier?: string
  page: number
}

export const SECTIONS: Section[] = [
  { id: "cover", no: "00", label: "Home", page: 1 },
  { id: "summary", no: "01", label: "Summary", page: 2 },
  { id: "capabilities", no: "02", label: "Skills", dossier: "Evidence board", page: 3 },
  { id: "cases", no: "03", label: "Projects", dossier: "Case files", page: 4 },
  { id: "record", no: "04", label: "Experience", heading: "Experience & education", page: 5 },
  { id: "honours", no: "05", label: "Certifications", heading: "Certifications & awards", page: 6 },
  { id: "contact", no: "06", label: "Contact", page: 7 },
]

export const PAGE_COUNT = SECTIONS.length

export const sectionById = (id: string) => SECTIONS.find((s) => s.id === id) ?? SECTIONS[0]

/** Full plain name of a section, for its header row and landmark label. */
export const sectionName = (id: string) => {
  const s = sectionById(id)
  return s.heading ?? s.label
}

export const FIELDS = [
  { k: "Role", v: "Cybersecurity & Software Engineer" },
  { k: "Specialty", v: "Threat intelligence · AI & LLM security · Anomaly detection" },
  { k: "Also", v: "Ships iOS apps, ML pipelines and enterprise automation" },
  { k: "Based", v: "Markham, Ontario — Canada" },
]

export const TAPE = [
  "Threat Intelligence",
  "AI & LLM Security",
  "Malware Analysis",
  "Anomaly Detection",
  "Threat Modeling",
  "iOS Engineering",
  "Machine Learning",
  "Enterprise Automation",
]

export const EXHIBITS = [
  { id: "A", value: 95.1, suffix: "%", label: "Accuracy attributing malware to its APT group" },
  { id: "B", value: 4, suffix: "+", label: "Years shipping software into enterprise production" },
  { id: "C", value: 140, suffix: "+", label: "Automated tests guarding Pico on iOS" },
  { id: "D", value: 43, suffix: "", label: "APT groups in the malware dataset" },
]

export const AFFILIATIONS = [
  "eSentire",
  "Doqpros",
  "GreenECM Technologies",
  "University of Guelph",
  "TryHackMe",
  "Antisyphon Training",
]

export const FIELD_NOTES = [
  {
    head: "AI security",
    body: "At eSentire, mapped MCP vulnerabilities and the OWASP Top 10 for LLMs as attack surfaces in AI agent deployments, and threat-modelled AI architectures with STRIDE.",
  },
  {
    head: "Threat attribution",
    body: "Classified malware across 43 APT groups from Ghidra-extracted opcode sequences, and built an anomaly-detection prototype that flags unauthorised access and code tampering.",
  },
  {
    head: "Engineering",
    body: "Python, C#, Swift and SQL in production: RAG assistants, audit-logging automation, live SSL/TLS remediation, and a privacy-first iPhone app with 140+ automated tests.",
  },
]

// ============ EVIDENCE ============
// Techniques in the matrix point at evidence: case files or service-record entries.

export type EvidenceRef = { kind: "case" | "record"; id: string }

const c = (id: string): EvidenceRef => ({ kind: "case", id })
const r = (id: string): EvidenceRef => ({ kind: "record", id })

export type Technique = { name: string; note?: string; evidence: EvidenceRef[] }
export type Tactic = { id: string; name: string; techniques: Technique[] }

export const MATRIX: Tactic[] = [
  {
    id: "TA01",
    name: "Threat Intelligence",
    techniques: [
      { name: "MITRE ATT&CK mapping", evidence: [c("apt")] },
      { name: "Adversary TTP analysis", evidence: [c("apt")] },
      { name: "APT attribution", evidence: [c("apt")] },
      { name: "Malware analysis", evidence: [c("apt")] },
      { name: "Threat hunting", evidence: [r("thm")] },
      { name: "Threat modeling (STRIDE)", evidence: [r("esentire")] },
    ],
  },
  {
    id: "TA02",
    name: "AI & LLM Security",
    techniques: [
      { name: "OWASP Top 10 for LLMs", evidence: [r("esentire")] },
      { name: "MCP security", evidence: [r("esentire"), r("homelab")] },
      { name: "Agent orchestration", evidence: [r("esentire")] },
      { name: "RAG & LLM apps", evidence: [r("doqpros")] },
      { name: "Anomaly detection", evidence: [c("chatbot")] },
      { name: "ML classification", evidence: [c("apt")] },
    ],
  },
  {
    id: "TA03",
    name: "Detection & Tooling",
    techniques: [
      { name: "Splunk (SIEM)", evidence: [r("thm")] },
      { name: "Suricata (IDS)", evidence: [] },
      { name: "Cisco XDR", evidence: [r("certs")] },
      { name: "Ghidra", evidence: [c("apt")] },
      { name: "Wireshark", evidence: [r("thm")] },
      { name: "nmap", evidence: [r("homelab")] },
      { name: "Kali Linux", evidence: [r("homelab")] },
      { name: "Burp Suite · Metasploit", evidence: [] },
    ],
  },
  {
    id: "TA04",
    name: "Software Engineering",
    techniques: [
      { name: "Python", evidence: [c("apt"), c("chatbot")] },
      { name: "C#", evidence: [r("doqpros")] },
      { name: "Swift · iOS", evidence: [c("pico"), c("metawipe")] },
      { name: "SQL", evidence: [] },
      { name: "Solidity", evidence: [c("ethchat"), c("energy")] },
      { name: "JavaScript", evidence: [c("ethchat")] },
      { name: "PowerShell · Bash", evidence: [r("doqpros")] },
    ],
  },
  {
    id: "TA05",
    name: "Infrastructure",
    techniques: [
      { name: "Azure", evidence: [r("doqpros")] },
      { name: "Docker", evidence: [r("doqpros")] },
      { name: "Terraform", evidence: [r("esentire")] },
      { name: "CI/CD · Git", evidence: [r("esentire"), r("doqpros")] },
      { name: "n8n automation", evidence: [r("esentire")] },
      { name: "SSL/TLS · DNS · TCP/IP", evidence: [r("doqpros")] },
      { name: "Linux · Windows · macOS", evidence: [r("homelab")] },
      { name: "Kubernetes", note: "familiar", evidence: [] },
    ],
  },
]

// ============ CASE FILES ============

export type CaseFile = {
  id: string
  no: string
  title: string
  class: string
  year: string
  status: string
  filters: ("security" | "engineering" | "web3")[]
  abstract: string
  brief: string
  actions: string[]
  outcome: string
  stack: string[]
  links: { label: string; href: string }[]
  featured?: boolean
  note?: string
  metrics?: { v: string; l: string }[]
  /** What the case's exhibit shows, labelled honestly: real data or footage vs. an illustration. */
  exhibit: { kind: "Real data" | "Real footage" | "Simulation" | "Illustration"; caption: string }
}

export const CASES: CaseFile[] = [
  {
    id: "apt",
    no: "01",
    title: "APT Malware Classification",
    class: "Threat Intelligence",
    year: "2024",
    status: "Attributed",
    filters: ["security"],
    featured: true,
    metrics: [
      { v: "95.1%", l: "Accuracy, Random Forest" },
      { v: "43", l: "APT groups sampled" },
    ],
    exhibit: {
      kind: "Real data",
      caption: "Random Forest confusion matrix: 293 of 308 held-out samples attributed correctly",
    },
    abstract:
      "Static analysis of malware from 43 APT groups. Opcode sequences pulled out with Ghidra train models that attribute a sample to the group behind it, with 95.1% accuracy on held-out samples.",
    brief:
      "Attribute compiled malware to the threat group that produced it, using static analysis of the binaries.",
    actions: [
      "Disassembled malware samples spanning 43 Advanced Persistent Threat groups in Ghidra",
      "Extracted opcode sequences from the compiled binaries as classification features",
      "Trained machine learning models to attribute each sample to its origin group",
      "Compared four tuned classifiers: Random Forest led at 95.1% accuracy (F1 0.953), ahead of SVM (94.5%), KNN (94.2%) and a decision tree (93.2%)",
    ],
    outcome:
      "95.1% accuracy attributing held-out malware to the APT group behind it, from static analysis alone.",
    stack: ["Ghidra", "Python", "scikit-learn", "Reverse engineering"],
    links: [{ label: "Source on GitHub", href: "https://github.com/HarishSiva05/APT-Malware-Classification" }],
  },
  {
    id: "pico",
    no: "02",
    title: "Pico",
    class: "iOS · Privacy-first FinTech",
    year: "2026",
    status: "In Review",
    filters: ["engineering"],
    featured: true,
    note: "almost live!",
    metrics: [
      { v: "140+", l: "Automated tests" },
      { v: "11", l: "TestFlight builds" },
    ],
    exhibit: {
      kind: "Real footage",
      caption: "From Pico's ad, cut from the real app recorded in the iOS Simulator",
    },
    abstract:
      "A privacy-first iPhone budgeting app with iCloud sync, Siri and Apple Pay capture. Designed, tested and shipped end to end, now in App Store review.",
    brief:
      "Ship a budgeting app people can trust with their money data: private by default, synced across devices, and fast to log a purchase.",
    actions: [
      "Designed, tested and shipped an iOS app with iCloud sync, Siri and Apple Pay capture, using AI-assisted development (Claude Code) and 140+ automated tests",
      "Traced silent iCloud sync failures to a Production schema mismatch, fixed it, and added a test and release checklist to prevent a repeat",
      "Ran a TestFlight beta across 11 builds, triaging tester bug reports from a public Canny feedback board and shipping fixes build by build",
    ],
    outcome: "Submitted for App Store review after 11 TestFlight builds.",
    stack: ["Swift", "iOS", "iCloud sync", "Siri", "Apple Pay", "XCTest"],
    links: [{ label: "nixe.in/pico", href: "https://nixe.in/pico" }],
  },
  {
    id: "chatbot",
    no: "03",
    title: "AI-Driven Security Chatbot",
    class: "Defensive AI",
    year: "2024",
    status: "Prototype",
    filters: ["security"],
    featured: true,
    exhibit: {
      kind: "Simulation",
      caption: "A reconstruction of what the prototype does. The real demo is on YouTube.",
    },
    abstract:
      "Detects anomalous repository activity, including unauthorised access and code tampering, and raises real-time alerts with recommended next steps.",
    brief:
      "Give DevOps teams a conversational first responder that notices when a repository is being tampered with.",
    actions: [
      "Built a prototype that detects anomalous repository activity, flagging unauthorised access and code tampering",
      "Sends real-time alerts with recommended next steps for remediation",
      "Lets responders query security events through a natural-language interface",
    ],
    outcome: "A working prototype, recorded as a public demo.",
    stack: ["Python", "TensorFlow", "NLP", "Flask"],
    links: [{ label: "Watch the demo", href: "https://youtu.be/zY5ZpLVGGFg" }],
  },
  {
    id: "metawipe",
    no: "04",
    title: "MetaWipe",
    class: "iOS · Privacy",
    year: "2025",
    status: "Built",
    filters: ["security", "engineering"],
    featured: true,
    exhibit: { kind: "Illustration", caption: "How MetaWipe strips a photo before it is shared" },
    abstract:
      "A fully offline engine that strips 14+ metadata types, such as GPS and device identifiers, from photos before they're shared.",
    brief: "Stop photos from leaking where and on what device they were taken.",
    actions: [
      "Built a fully offline engine that strips 14+ metadata types, such as GPS and device identifiers, from photos",
      "Zero-trust architecture: nothing leaves the device, so there is nothing to intercept",
    ],
    outcome: "Protects against passive tracking and data leakage on every share.",
    stack: ["Swift", "iOS", "Image pipeline", "Zero-trust"],
    links: [],
  },
  {
    id: "ethchat",
    no: "05",
    title: "EthChat",
    class: "Encrypted Messaging",
    year: "2023",
    status: "Open Source",
    filters: ["web3", "security"],
    exhibit: {
      kind: "Illustration",
      caption: "Based on the ChatWei contract: registered users, per-user inboxes, messages on-chain",
    },
    abstract:
      "Censorship-resistant messaging on Ethereum: a Solidity contract keeps every user's inbox on-chain, and messages are encrypted before they're sent.",
    brief: "Messaging with no intermediary to trust, subpoena or switch off.",
    actions: [
      "Wrote the ChatWei Solidity contract: user registration, per-user inboxes and on-chain messages",
      "Developed the message encryption for the app",
      "Built the browser front end with web3.js and MetaMask, so people send from their own wallet",
    ],
    outcome: "A censorship-resistant, Ethereum-based messaging app.",
    stack: ["Solidity", "Truffle", "web3.js", "MetaMask"],
    links: [{ label: "Source on GitHub", href: "https://github.com/HarishSiva05/Blockchain-Chat" }],
  },
  {
    id: "energy",
    no: "06",
    title: "Peer-to-Peer Energy Trading",
    class: "Blockchain Platform",
    year: "2022",
    status: "Archived",
    filters: ["web3"],
    exhibit: { kind: "Illustration", caption: "Households trading surplus solar through smart contracts" },
    abstract:
      "A secure transaction framework and automated trading logic letting households trade rooftop solar surplus directly with neighbours.",
    brief: "Cut out the middleman between a household with surplus solar and the one next door.",
    actions: [
      "Designed the secure transaction framework for direct household-to-household energy trades",
      "Built the automated trading logic that executes trades without an intermediary",
    ],
    outcome: "A platform that helps residential consumers cut costs and use more renewable energy.",
    stack: ["Ethereum", "Smart contracts", "IoT", "React"],
    links: [],
  },
  {
    id: "agrimate",
    no: "07",
    title: "Agrimate",
    class: "Mobile FinTech",
    year: "2020",
    status: "Winner",
    filters: ["engineering"],
    abstract:
      "A native Android finance app improving farmers' financial literacy, with secure payments and financial tracking. Won the Yugam 2020 48-hour hackathon.",
    brief: "Give smallholder farmers the financial tools banks never built for them.",
    exhibit: { kind: "Illustration", caption: "The farmer and investor flows of the Android app" },
    actions: [
      "Built secure backend features for payments and financial tracking",
      "Built the native Android app: OTP sign-in and separate farmer and investor flows",
    ],
    outcome: "Winner of the Yugam 2020 48-hour hackathon.",
    stack: ["Android", "Java", "AndroidX"],
    links: [{ label: "Source on GitHub", href: "https://github.com/HarishSiva05/Agrimate-YUGAM" }],
  },
]

// ============ SERVICE RECORD ============

export type RecordEntry = {
  id: string
  role: string
  org: string
  period: string
  meta: string
  points: string[]
  live?: boolean
}

export const EXPERIENCE: RecordEntry[] = [
  {
    id: "esentire",
    role: "Research Associate",
    org: "eSentire",
    period: "Oct 2025 — Feb 2026",
    meta: "Internship · Waterloo, Ontario",
    points: [
      "Researched Model Context Protocol (MCP) vulnerabilities and the OWASP Top 10 for LLMs as attack surfaces in AI agent deployments",
      "Performed STRIDE threat modeling of internal AI architectures, mapping data flows, trust boundaries and API paths, and reported vulnerabilities with mitigations to engineering teams",
      "Authored a research paper communicating security findings, risks and remediation guidance",
      "Built and documented n8n workflow automation and AI agent orchestration for internal security pipelines, reducing manual effort in repetitive triage, and contributed Terraform and CI/CD updates",
    ],
  },
  {
    id: "doqpros",
    role: "Developer",
    org: "Doqpros",
    period: "Apr 2022 — Sep 2024",
    meta: "Full time · Omaha, Nebraska (Remote)",
    points: [
      "Built a Retrieval-Augmented Generation (RAG) assistant over product documentation",
      "Developed C# automation for metadata extraction, validation and audit logging",
      "Diagnosed and remediated SSL/TLS certificate and service configuration failures on live client systems, including binding certificates to Laserfiche XML utility endpoints",
      "Wrote PowerShell scripts to automate routine Windows administration",
      "Supported Laserfiche solutions in client production environments through a ticketing system, and managed Docker, CI/CD and Azure storage",
    ],
  },
  {
    id: "greenecm",
    role: "Developer",
    org: "GreenECM Technologies",
    period: "Apr 2020 — Sep 2021",
    meta: "Full time · Tamil Nadu, India",
    points: ["Installed, configured and maintained IBM FileNet P8 systems in enterprise environments"],
  },
]

export const TRAINING: RecordEntry[] = [
  {
    id: "antisyphon",
    role: "SOC Core Skills in the Age of AI",
    org: "Antisyphon Training",
    period: "Oct 2026",
    meta: "Instructor-led",
    points: [],
    live: true,
  },
  {
    id: "homelab",
    role: "Security Home Lab",
    org: "Self-directed",
    period: "Aug 2026 — Present",
    meta: "In progress",
    points: [
      "Running Kali Linux tooling such as nmap against an isolated lab network, driven through an MCP server that connects an AI chat client to the command line, with every action reviewed before it runs",
    ],
    live: true,
  },
  {
    id: "thm",
    role: "SOC Level 1 Pathway",
    org: "TryHackMe",
    period: "Mar 2026 — Present",
    meta: "Self-directed",
    points: [
      "Cyber defense frameworks, threat intelligence, network traffic analysis, endpoint monitoring, SIEM and DFIR, with practice in alert triage, investigation and escalation",
    ],
    live: true,
  },
]

export const EDUCATION = [
  {
    degree: "M.Sc. Cybersecurity & Threat Intelligence",
    school: "University of Guelph",
    period: "Sep 2024 — Aug 2025",
    grade: "GPA 85.71",
    detail: "Cybersecurity & Defense · Threat Intelligence · Threat Hunting · Penetration Testing · Digital Forensics · Privacy & Compliance (GDPR)",
  },
  {
    degree: "B.E. Computer Science & Engineering",
    school: "Sri Krishna College of Engineering & Technology",
    period: "Aug 2019 — May 2023",
    grade: "GPA 9.11 / 10",
    detail: "Tamil Nadu, India",
  },
]

// ============ COMMENDATIONS ============

export const CERTIFICATIONS = [
  { title: "Rapid Incident Response with Cisco XDR", issuer: "Cisco", year: "2024", ring: "CISCO · RAPID INCIDENT RESPONSE · XDR · " },
  { title: "Cybersecurity Essentials", issuer: "Cisco", year: "2022", ring: "CISCO · CYBERSECURITY ESSENTIALS · " },
  { title: "Laserfiche Platinum 10", issuer: "Laserfiche", year: "2023", ring: "LASERFICHE · PLATINUM CERTIFIED · 10 · " },
  { title: "Laserfiche Gold 10", issuer: "Laserfiche", year: "2022", ring: "LASERFICHE · GOLD CERTIFIED · 10 · " },
]

export const AWARDS = [
  { rank: "Winner", title: "Yugam 2020 — 48-hour hackathon", detail: "Agrimate, mobile finance for farmers", featured: true },
  { rank: "3rd place", title: "Steganography Treasure Hunt", detail: "AnokaFest" },
  { rank: "Participant", title: "HackHarvard · HackAlphaX · MLH", detail: "International hackathons" },
]

// Lookup helpers for evidence labels
export function evidenceLabel(ref: EvidenceRef): { tag: string; title: string } {
  if (ref.kind === "case") {
    const k = CASES.find((x) => x.id === ref.id)
    return { tag: `Case ${k?.no ?? "??"}`, title: k?.title ?? ref.id }
  }
  if (ref.id === "certs") return { tag: "Certified", title: "Rapid Incident Response with Cisco XDR" }
  const job = EXPERIENCE.find((x) => x.id === ref.id)
  if (job) return { tag: "Work", title: `${job.role}, ${job.org}` }
  // a course or lab is training, never dressed up as a job
  const t = TRAINING.find((x) => x.id === ref.id)
  return { tag: "Training", title: t ? `${t.role}, ${t.org}` : ref.id }
}
