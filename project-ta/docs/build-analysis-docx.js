const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  LevelFormat, convertInchesToTwip, Footer, PageNumber, TabStopType,
} = require("docx");
const fs = require("fs");

/* A4 is 11906 DXA wide; 2cm (1134) margins leave 9638 for content. */
const W = 9638;
const GREEN = "0F5132";
const GREEN_MID = "157347";
const GREEN_PALE = "EAF3EE";
const INK = "1B2721";
const MUTED = "5C6B63";
const RULE = "CFDED6";

const FONT = "Calibri";

/* ------------------------------------------------------------------ helpers */

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: opts.after ?? 140, line: 276 },
    alignment: opts.align,
    indent: opts.indent,
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italics,
        size: opts.size ?? 21, // half-points: 21 = 10.5pt
        color: opts.color ?? INK,
        font: FONT,
      }),
    ],
    ...(opts.border ? { border: opts.border } : {}),
  });

/** A paragraph built from [text, {bold}] fragments, so a lead-in can be bold. */
const rich = (parts, opts = {}) =>
  new Paragraph({
    spacing: { after: opts.after ?? 140, line: 276 },
    indent: opts.indent,
    children: parts.map(
      ([text, o = {}]) =>
        new TextRun({
          text,
          bold: o.bold,
          italics: o.italics,
          size: o.size ?? opts.size ?? 21,
          color: o.color ?? opts.color ?? INK,
          font: FONT,
        }),
    ),
  });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 380, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 6 } },
    children: [new TextRun({ text, bold: true, size: 26, color: GREEN, font: FONT })],
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 100 },
    children: [new TextRun({ text, bold: true, size: 23, color: INK, font: FONT })],
  });

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 70 },
    children: [new TextRun({ text, bold: true, size: 21, color: GREEN_MID, font: FONT })],
  });

const bullet = (parts) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 90, line: 276 },
    children: (Array.isArray(parts) ? parts : [[parts]]).map(
      ([text, o = {}]) =>
        new TextRun({ text, bold: o.bold, italics: o.italics, size: 21, color: INK, font: FONT }),
    ),
  });

const numbered = (parts, ref = "nums") =>
  new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 90, line: 276 },
    children: (Array.isArray(parts) ? parts : [[parts]]).map(
      ([text, o = {}]) =>
        new TextRun({ text, bold: o.bold, italics: o.italics, size: 21, color: INK, font: FONT }),
    ),
  });

const cell = (text, widthDxa, opts = {}) =>
  new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    shading: opts.shade
      ? { type: ShadingType.CLEAR, fill: opts.shade, color: "auto" }
      : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [
      new Paragraph({
        spacing: { after: 0, line: 240 },
        alignment: opts.align,
        children: [
          new TextRun({
            text,
            bold: opts.bold,
            size: opts.size ?? 19,
            color: opts.color ?? INK,
            font: FONT,
          }),
        ],
      }),
    ],
  });

/** rows: array of arrays of strings. First row is the header. */
const table = (widths, rows, opts = {}) =>
  new Table({
    columnWidths: widths,
    width: { size: W, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: rows.map((cells, r) =>
      new TableRow({
        tableHeader: r === 0,
        children: cells.map((text, c) =>
          cell(text, widths[c], {
            bold: r === 0 || (opts.boldRows ?? []).includes(r),
            color: r === 0 ? "FFFFFF" : undefined,
            shade:
              r === 0
                ? GREEN
                : (opts.highlightRows ?? []).includes(r)
                  ? GREEN_PALE
                  : undefined,
            size: opts.size,
            align: c > 0 && opts.alignRight ? AlignmentType.RIGHT : undefined,
          }),
        ),
      }),
    ),
  });

/**
 * A callout box. Implemented as a single-cell table rather than a bordered
 * paragraph: docx-js emits <w:pBdr> edges in an order the OOXML schema rejects,
 * whereas table borders are written out in the order they are given.
 */
const callout = (runs, { fill, accent, edge }) =>
  new Table({
    columnWidths: [W],
    width: { size: W, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: edge },
      left: { style: BorderStyle.SINGLE, size: 18, color: accent },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: edge },
      right: { style: BorderStyle.SINGLE, size: 4, color: edge },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: W, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill, color: "auto" },
            margins: { top: 140, bottom: 140, left: 180, right: 180 },
            children: [new Paragraph({ spacing: { after: 0, line: 276 }, children: runs })],
          }),
        ],
      }),
    ],
  });

const spacer = (h = 120) => new Paragraph({ spacing: { after: h }, children: [] });

/* --------------------------------------------------------------- the paper */

const children = [];

// Masthead
children.push(
  new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: "PROJECT TA", bold: true, size: 20, color: GREEN_MID, font: FONT,
        characterSpacing: 60 }),
    ],
  }),
  new Paragraph({
    spacing: { after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: GREEN, space: 8 } },
    children: [
      new TextRun({ text: "Market and Competitor Analysis", bold: true, size: 44, color: INK, font: FONT }),
    ],
  }),
  spacer(200),
);

// Metadata
children.push(
  table(
    [2600, 7038],
    [
      ["Date", "28 August 2026"],
      ["Prepared by", "Ismail Mansur"],
      ["Classification", "Internal — commercial in confidence"],
      ["Decision sought", "Approval to proceed to a funded pilot"],
    ].map(([k, v]) => [k, v]),
  ),
);
// The metadata block has no real header row, so rebuild it without one.
children.pop();
children.push(
  new Table({
    columnWidths: [2600, 7038],
    width: { size: W, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: [
      ["Date", "28 August 2026"],
      ["Prepared by", "Ismail Mansur"],
      ["Classification", "Internal — commercial in confidence"],
      ["Decision sought", "Approval to proceed to a funded pilot"],
    ].map(([k, v]) =>
      new TableRow({
        children: [
          cell(k, 2600, { bold: true, color: MUTED }),
          cell(v, 7038),
        ],
      }),
    ),
  }),
  spacer(200),
);

// Currency note
children.push(
  callout(
    [
      new TextRun({ text: "A note on currency. ", bold: true, size: 20, color: INK, font: FONT }),
      new TextRun({
        text:
          "This is a UK business serving UK students, so every figure in this paper is stated in " +
          "pounds sterling. Where a source reported in another currency, the figure has been " +
          "converted at \u00A31 \u2248 $1.27 and is marked as approximate. Original figures are " +
          "available on request.",
        size: 20, color: MUTED, font: FONT,
      }),
    ],
    { fill: "F5F9F7", accent: GREEN_MID, edge: RULE },
  ),
  spacer(200),
);

/* 1 */
children.push(h1("1. Purpose"));
children.push(p(
  "This paper sets out the market Project TA proposes to enter, assesses the competitive field, " +
  "and makes five recommendations that materially change the product as originally conceived. " +
  "It is intended to support a decision on whether to proceed to a funded pilot."));

/* 2 */
children.push(h1("2. Executive summary"));
children.push(p(
  "The proposition — a student submits a question and pays for a fixed block of tutoring time; " +
  "every qualified tutor is notified with the fee, the topic and the duration; the first to " +
  "accept delivers the session over chat and a shared whiteboard — is not novel. It has been " +
  "executed at scale, and several well-capitalised attempts have since failed. That history is " +
  "instructive rather than disqualifying."));

const findings = [
  ["Finding 1 — The mechanic is proven",
   "Snapask reached approximately 3.2 million students and 350,000 tutors across eight Asian markets on precisely this model."],
  ["Finding 2 — The economics, not the mechanic, are what fail",
   "Yup operated an almost identical product, raised approximately £18.5m, and ceased operations in February 2025. The most frequently cited cause is tutor remuneration of roughly £8 per hour, a rate that cannot retain numerate graduates."],
  ["Finding 3 — The market for answers has been destroyed",
   "Chegg's market capitalisation fell from approximately £11.6bn in February 2021 to approximately £90m, with a 31% year-on-year subscriber decline and a 45% headcount reduction in October 2025. Any proposition whose value is the answer itself now competes with a free substitute."],
  ["Finding 4 — The defensible product is a verified human who will not simply provide the answer",
   "This is the single capability a general-purpose AI assistant cannot offer, and the one Chegg lost."],
  ["Finding 5 — In the UK, safeguarding is the barrier to entry and the differentiator",
   "UK GDPR, the ICO Age Appropriate Design Code and the Online Safety Act 2023 impose substantial obligations on a service that puts adults and children in direct conversation. This is a genuine cost. It is also a barrier a small competitor cannot trivially replicate, and it is what parents actually purchase."],
];
for (const [head, bodyText] of findings) {
  children.push(new Paragraph({
    spacing: { before: 180, after: 50, line: 276 },
    indent: { left: 200 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: GREEN_MID, space: 10 } },
    children: [new TextRun({ text: head, bold: true, size: 21, color: GREEN, font: FONT })],
  }));
  children.push(new Paragraph({
    spacing: { after: 60, line: 276 },
    indent: { left: 200 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: GREEN_MID, space: 10 } },
    children: [new TextRun({ text: bodyText, size: 21, color: INK, font: FONT })],
  }));
}

children.push(spacer(160));
children.push(
  callout(
    [
      new TextRun({ text: "Principal commercial risk. ", bold: true, size: 21, color: "6B4708", font: FONT }),
      new TextRun({
        text:
          "The model as originally conceived charges a flat fee for fifteen minutes of an " +
          "undergraduate's time, in a market where the answer is available at no cost, to an " +
          "audience that largely does not control a payment instrument. Sections 7 and 8 " +
          "address each element of that risk.",
        size: 21, color: "6B4708", font: FONT,
      }),
    ],
    { fill: "FDF6E9", accent: "C98A1B", edge: "E6D3AC" },
  ),
);

/* 3 */
children.push(h1("3. Market context"));
children.push(table([6000, 3638], [
  ["Metric", "Figure"],
  ["UK K-12 online tutoring market growth, 2025–2030", "approx. +£12.6bn, 17.2% CAGR"],
  ["Global edtech venture funding, 2021", "approx. £4.6bn"],
  ["Global edtech venture funding, 2023", "approx. £560m (−87%)"],
  ["Chegg market capitalisation, February 2021", "approx. £11.6bn"],
  ["Chegg market capitalisation, 2026", "approx. £90m"],
  ["Chegg subscribers, Q1 2025", "3.2m, −31% YoY; revenue −30% to approx. £95m"],
]));
children.push(spacer(60));
children.push(rich([
  ["Interpretation. ", { bold: true }],
  ["UK demand is growing quickly and is well evidenced. The funding environment is not what it " +
   "was in 2021, so a venture-scale raise on the strength of the concept alone should not be " +
   "assumed. The business should be structured to reach profitability at small scale before it " +
   "seeks growth capital."],
]));

/* 4 */
children.push(h1("4. The UK competitive field"));
children.push(h2("4.1 Scheduled marketplaces — the incumbent UK model"));
children.push(rich([
  ["Sherpa", { bold: true }],
  [" is the most directly relevant UK competitor: GCSE and A-level focus, over 350,000 " +
   "one-to-one lessons delivered, a 4.8-star rating from more than 40,000 parents, lessons from "],
  ["£20 per hour", { bold: true }],
  [", and native iOS and Android applications already shipped. It claims an average improvement " +
   "of 2.2 grades. Its model is booking-based rather than on-demand, which is where Project TA " +
   "differs."],
]));
children.push(rich([
  ["MyTutor", { bold: true }],
  [" operates the supply model Project TA proposes: over 5,000 undergraduate tutors from 60 " +
   "leading universities. "],
  ["DBS checks are mandatory.", { bold: true }],
  [" Its published safeguarding and online-safety policies are a useful structural reference."],
]));
children.push(rich([
  ["Tutorful", { bold: true }], [" and "], ["GoStudent", { bold: true }],
  [" also require DBS checks. "],
  ["Superprof, First Tutors and TutorExtra", { bold: true }],
  [" recommend but do not require them — the low-trust segment of the UK market, and the " +
   "segment against which our safeguarding position is most persuasive."],
]));
children.push(rich([
  ["Third Space Learning", { bold: true }],
  [" is the UK's largest schools-facing online maths tutoring provider, selling flat annual " +
   "school licences of approximately "],
  ["£3,900–11,800", { bold: true }],
  [" depending on school size. This is the proven UK route should direct-to-consumer " +
   "acquisition prove difficult."],
]));

children.push(h2("4.2 International precedents in the on-demand category"));
children.push(p(
  "Included because they are the only operators to have run this exact model at scale. Pricing " +
  "converted to sterling."));
children.push(rich([
  ["Snapask (Hong Kong)", { bold: true }],
  [" — the closest proven precedent. A student photographs a question; the platform alerts " +
   "qualified tutors; the fastest to respond, frequently within five seconds, is assigned the " +
   "session. Approximately 3.2m students and 350,000 tutors on approximately £44.7m raised, " +
   "including a £27.5m round in 2020. Monetised by "],
  ["subscription", { bold: true }],
  [", not by single session. Reported to have ceased active operation around 2022."],
]));
children.push(rich([
  ["Yup (US)", { bold: true }],
  [" — on-demand, chat-based, whiteboard-driven maths tutoring, no video. Raised approximately " +
   "£18.5m. "],
  ["Ceased operations by February 2025", { bold: true }],
  [", with tutor pay of approximately £8 per hour the most commonly cited cause."],
]));
children.push(rich([
  ["UPchieve (US)", { bold: true }],
  [" — free, 24/7, chat and whiteboard, for eligible lower-income secondary students. Volunteer " +
   "tutors, funded by school partnership fees of approximately "],
  ["£7,900 per school per year", { bold: true }],
  [". Validates both the interface for this age group and the institutional funding route."],
]));
children.push(p(
  "Tutor.com approximately £23–31 per hour · TutorMe (Pearson) from approximately £20 · Skooli " +
  "per-minute at approximately £0.65 (about £39 per hour) · Wyzant £20–47, 25% flat commission · " +
  "Preply £8–31, 18–33% tiered · Tutorpeers free to approximately £20 per 30 minutes."));
children.push(rich([
  ["Varsity Tutors", { bold: true }],
  [" is commercially notable: students billed approximately "],
  ["£51–75 per hour", { bold: true }],
  [" while tutors earn approximately "],
  ["£9–16", { bold: true }],
  [", implying a platform take approaching "],
  ["70%", { bold: true }],
  ["."],
]));

children.push(h2("4.3 AI-first products"));
children.push(p(
  "Photomath, Gauth, Brainly, Khanmigo and general-purpose assistants are free or near-free, " +
  "instantaneous, and available without waiting for a human."));
children.push(rich([
  ["Assessment. ", { bold: true }],
  ["For “what is the answer to question 7”, Project TA cannot compete and should not " +
   "try. For “I have a mock on Thursday, I do not understand why we integrate by parts " +
   "here, and I have spent forty minutes on it”, a person who sat the same specification " +
   "recently holds a decisive advantage. The product should be positioned exclusively at the " +
   "second case."],
]));

/* 5 */
children.push(h1("5. Feature comparison"));
const fw = [2398, 905, 905, 905, 905, 905, 905, 905, 905];
children.push(table(fw, [
  ["Feature", "Snapask", "Yup", "UPchieve", "Tutor.com", "MyTutor", "Sherpa", "Wyzant", "Project TA"],
  ["Instant match, no booking", "✓", "✓", "✓", "✓", "–", "–", "–", "✓"],
  ["Shared whiteboard", "~", "✓", "✓", "✓", "✓", "✓", "✓", "✓"],
  ["Video required", "–", "–", "–", "–", "✓", "✓", "✓", "– (by design)"],
  ["Fee disclosed before acceptance", "✓", "~", "n/a", "–", "–", "–", "–", "✓ unique"],
  ["Undergraduate supply model", "✓", "~", "✓", "–", "✓", "~", "~", "✓"],
  ["Mandatory DBS", "n/a", "n/a", "US", "US", "✓", "✓", "–", "✓"],
  ["Transcript retained", "~", "~", "✓", "✓", "✓", "✓", "–", "✓"],
  ["Exam-board routing", "–", "–", "–", "–", "–", "–", "–", "✓ unique"],
], { size: 16 }));
children.push(p("✓ present  ·  ~ partial or undisclosed  ·  – absent",
  { size: 17, color: MUTED, after: 60 }));

/* 6 */
children.push(h1("6. Pricing and platform economics"));
children.push(table([2600, 2400, 2400, 2238], [
  ["Platform", "Student pays", "Tutor receives", "Platform take"],
  ["Varsity Tutors", "£51–75/hr", "£9–16/hr", "approx. 70%"],
  ["Preply", "£8–31/hr", "67–82% of rate", "18–33%, tiered"],
  ["Wyzant", "£20–47/hr", "75% of rate", "25% flat"],
  ["Skooli", "approx. £39/hr", "undisclosed", "—"],
  ["Tutor.com", "£23–31/hr", "approx. £9–12/hr", "high"],
  ["Sherpa (UK)", "from £20/hr", "undisclosed", "—"],
  ["MyTutor (UK)", "£25–60/hr", "undisclosed", "—"],
  ["Yup (ceased trading)", "subscription", "approx. £8/hr", "terminal"],
  ["Project TA (proposed)", "£6 per 15 min (£24/hr)", "£4 per 15 min (£16/hr)", "33%"],
], { highlightRows: [9], boldRows: [9] }));
children.push(spacer(60));
children.push(rich([
  ["Rationale. ", { bold: true }],
  ["£16 per hour to the tutor exceeds a UK undergraduate's realistic alternative — retail or " +
   "hospitality at approximately £11–12 — without eliminating platform margin, directly " +
   "addressing the failure mode that ended Yup. £6 for fifteen minutes sits below the threshold " +
   "at which a student must seek parental approval, and is materially cheaper per hour than " +
   "every UK comparator identified. A 33% take sits between Wyzant's 25% and Preply's opening " +
   "33%; it is defensible and can be published, which no comparator does."],
]));

/* 7 */
children.push(h1("7. Unit economics"));
children.push(table([6638, 3000], [
  ["Line", "Per session"],
  ["Student pays", "£6.00"],
  ["Tutor payment", "(£4.00)"],
  ["Card processing (approx. 1.5% + 20p)", "(£0.29)"],
  ["Payout fee, amortised", "(£0.10)"],
  ["Contribution", "approx. £1.61"],
], { highlightRows: [5], boldRows: [5], alignRight: true }));
children.push(spacer(60));
children.push(rich([
  ["A £2,000 monthly cost base therefore requires approximately "],
  ["1,250 sessions per month, or 42 per day", { bold: true }],
  [". Attainable, but only with retention: a customer who purchases once will not repay an " +
   "acquisition cost that, in UK edtech, typically runs to £15–40 per paying user."],
]));
children.push(p("Three recommended mitigations, in order of impact:", { bold: true, after: 100 }));
children.push(numbered([
  ["Sell credit packs rather than single sessions. ", { bold: true }],
  ["£25 for five, £45 for ten. Takes cash in advance and raises lifetime value; Snapask, " +
   "Tutor.com and Skooli each converged on this structure."],
]));
children.push(numbered([
  ["Make the parent the paying customer. ", { bold: true }],
  ["Under-18s rarely hold a payment card. A first-class parent account resolves the payment " +
   "problem and a substantial part of the safeguarding problem simultaneously."],
]));
children.push(numbered([
  ["Develop an institutional channel. ", { bold: true }],
  ["A single school contract is equivalent to several hundred consumer sessions at a fraction " +
   "of the support burden."],
]));

/* 8 */
children.push(h1("8. Regulatory considerations"));
children.push(rich([
  ["DBS checks. ", { bold: true }],
  ["Private one-to-one tutoring is not automatically regulated activity under the Safeguarding " +
   "Vulnerable Groups Act 2006. However, the Act does require platforms to carry out enhanced " +
   "DBS and barred-list checks on tutors working "],
  ["unsupervised with under-18s", { bold: true }],
  [", which describes our service precisely. Expect approximately "],
  ["£40–60 and two to eight weeks per tutor", { bold: true }],
  [". "],
  ["This is the principal reason the original proposal to admit “anyone” as a tutor " +
   "cannot proceed.", { italics: true }],
]));
children.push(rich([
  ["ICO Age Appropriate Design Code. ", { bold: true }],
  ["A Data Protection Impact Assessment is required before launch, alongside data minimisation, " +
   "high-privacy defaults and proportionate age assurance. The ICO updated its children's data " +
   "guidance on 15 May 2026."],
]));
children.push(rich([
  ["Online Safety Act 2023. ", { bold: true }],
  ["A service on which users message one another is a user-to-user service. Ofcom and the ICO " +
   "issued a joint statement on age assurance on 25 March 2026."],
]));
children.push(p(
  "This should be treated as a build requirement rather than a compliance overhead: roughly 20% " +
  "of engineering effort, and effectively all of the business's credibility with parents and " +
  "schools."));

/* 9 */
children.push(h1("9. Proposed launch plan"));
children.push(p(
  "The marketplace cold-start problem, rather than the technology, is the principal execution risk."));
children.push(bullet([
  ["Weeks 1–4 — secure supply first, one university, one subject. ", { bold: true }],
  ["Recruit 20–30 undergraduate tutors and pay a guaranteed hourly retainer for online " +
   "availability, 7pm to 10pm Sunday to Thursday, irrespective of volume. A deliberate cost, " +
   "incurred to purchase a matching-time guarantee."],
]));
children.push(bullet([
  ["Weeks 3–8 — generate demand, narrowly. ", { bold: true }],
  ["One or two local secondary schools' parent groups and sixth forms, timed to the run-up to " +
   "November mocks and to summer examinations."],
]));
children.push(bullet([
  ["Measure two indicators only: ", { bold: true }],
  ["median time to match, and repeat purchase within fourteen days. Above three minutes to " +
   "match, purchase more supply. Below 25% repeat purchase, the product requires revision and " +
   "no marketing spend will compensate."],
]));

/* 10 */
children.push(h1("10. Risk register"));
children.push(table([3000, 1400, 5238], [
  ["Risk", "Severity", "Mitigation"],
  ["Free AI absorbs the quick-question use case", "High", "Position on comprehension; exam-board specificity; human accountability"],
  ["Tutor attrition at £16 per hour", "High", "Guaranteed availability payments at launch; fee transparency; prompt payment"],
  ["Insufficient coverage outside peak hours", "High", "Fixed evening windows; automatic refund if unmatched within 60 seconds"],
  ["DBS cost and lead time constrain onboarding", "Medium", "Recruit before the product is complete; fund checks centrally"],
  ["Safeguarding incident", "Critical", "Transcript retention, contact-detail blocking, in-session reporting, named DSL, completed DPIA"],
  ["Disintermediation of the platform", "Medium", "Contact-detail blocking; repeat-tutor feature; a fair, published take rate"],
]));

/* 11 */
children.push(h1("11. Recommendation"));
children.push(p(
  "It is recommended that the business proceed to a funded pilot on the model described, " +
  "subject to five changes to the original proposal:"));
const recs = [
  [["Tutors are to be ", {}], ["vetted undergraduates holding enhanced DBS checks", { bold: true }], [", not open registration."]],
  [["Parents are to be the paying customer", { bold: true }], [" and are to have transcript access; students spend a balance."]],
  [["Credit packs are the commercial model", { bold: true }], ["; the single £6 session is a trial mechanism, not the business."]],
  [["Launch is to be confined to ", {}], ["Maths, Physics, Chemistry and Biology, at GCSE and A-level, routed by examination board", { bold: true }], [", in one city, within one evening coverage window."]],
  [["Safeguarding and fee transparency are to be the principal marketing positions", { bold: true }], [", being the two areas in which every identified incumbent is either weak or deliberately opaque."]],
];
for (const r of recs) children.push(numbered(r, "recs"));
children.push(spacer(60));
children.push(p(
  "The mechanic is proven. The failures in this category have overwhelmingly been failures of " +
  "unit economics rather than of product. Securing the economics is the precondition; the " +
  "technology is comparatively straightforward."));

/* 12 */
children.push(h1("12. Prototype status"));
children.push(p(
  "A working prototype has been built and is available in the project repository, comprising a " +
  "web application of 21 pages and a mobile application operating against the same backend. " +
  "Matching, the tutor notification board, chat, the shared whiteboard, session timing and paid " +
  "extensions, credit holds with automatic refunds, and the safeguarding filter are all " +
  "functional. The full statutory content — privacy policy, terms, cookie policy, safeguarding " +
  "statement, complaints procedure and FAQs — is in place."));
children.push(rich([
  ["Payments are deliberately mocked. ", { bold: true }],
  ["No card details are collected, transmitted or stored at any point. Authentication is a " +
   "demonstration mechanism and requires replacement before any live use."],
]));

/* 13 */
children.push(h1("13. Matters for decision"));
const decisions = [
  [["Is the parent or the student the customer? ", { bold: true }], ["This paper assumes the parent. It is the safer and more saleable position, but it changes the acquisition funnel materially."]],
  [["Who funds the DBS checks? ", { bold: true }], ["£40–60 and two to eight weeks per tutor, incurred before any revenue. Funding them centrally removes the single largest barrier to supply."]],
  [["Is 33% the correct take rate? ", { bold: true }], ["Defensible against comparators, but contribution per single session is thin. Credit packs address this; a higher take rate would not."]],
  [["One university or several? ", { bold: true }], ["Concentration purchases tutor density in one subject at one time of evening. Dispersion purchases nothing at this stage."]],
  [["Direct-to-consumer, or straight to schools? ", { bold: true }], ["The institutional route carries a materially lower support burden."]],
];
for (const d of decisions) children.push(numbered(d, "decisions"));

/* ------------------------------------------------------------------ assemble */

const numberingConfig = (ref) => ({
  reference: ref,
  levels: [{
    level: 0,
    format: LevelFormat.DECIMAL,
    text: "%1.",
    alignment: AlignmentType.START,
    style: { paragraph: { indent: { left: 460, hanging: 300 } },
             run: { bold: true, color: GREEN, font: FONT, size: 21 } },
  }],
});

const doc = new Document({
  creator: "Ismail Mansur",
  title: "Project TA — Market and Competitor Analysis",
  description: "Market and competitor analysis supporting a decision to proceed to a funded pilot.",
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 400, hanging: 240 } },
                   run: { color: GREEN_MID, font: FONT } },
        }],
      },
      numberingConfig("nums"),
      numberingConfig("recs"),
      numberingConfig("decisions"),
    ],
  },
  styles: {
    default: {
      document: { run: { font: FONT, size: 21, color: INK } },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: W }],
          children: [
            new TextRun({ text: "Project TA — Market and Competitor Analysis · Internal, commercial in confidence",
              size: 15, color: MUTED, font: FONT }),
            new TextRun({ text: "\t", size: 15 }),
            new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
              size: 15, color: MUTED, font: FONT }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(process.argv[2], buf);
  console.log("wrote", process.argv[2], buf.length, "bytes");
});
