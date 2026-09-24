// ============================================================================
// SHARED — platform-agnostic. Imported by BOTH the web app (app/) and the
// React Native app (native/). Contains NO JSX and no platform APIs.
// Content moved VERBATIM from app/prep-a-constable.jsx — never retyped.
// ============================================================================

const KEY_CASES = [
  { name: "Neal v Gribble (1978)", topic: "Section 12 Theft Act 1968 — Definition of conveyance", summary: "A horse, even saddled and bridled, is NOT a 'conveyance' under Section 12 because it has not been 'constructed' for the carriage of a person. Taking a horse with intent to permanently deprive = theft (Section 1), not TWOC." },
  { name: "R v Robinson [1977]", topic: "Section 8 Theft Act 1968 — Robbery requires complete theft", summary: "Defendant genuinely believed he had a legal right to the property. Dishonesty couldn't be proved, so theft wasn't made out — and without theft there could be no robbery, even though force was used." },
  { name: "R v Vinall [2011]", topic: "Section 8 Theft Act 1968 — Intent to permanently deprive", summary: "Robbery conviction overturned on appeal. The court found defendants did not have the intention to permanently deprive at the time they abandoned the property. Without ITPD, no theft — therefore no robbery." },
  { name: "R v Badham", topic: "Section 18 Police and Criminal Evidence Act 1984 — Application of search powers", summary: "Listed in PCEP training as further reading on the proper application of Section 18 powers (search after arrest of premises occupied or controlled by the arrestee)." },
];

// ============================================================
// LESSONS — sub-lessons per topic
// ============================================================
// Block types:
//   intro     - lead paragraph in larger type
//   para      - normal paragraph
//   heading   - small section heading inside a lesson
//   list      - bullet list (items: string[])
//   callout   - highlighted study-guide note
//   key       - "KEY TAKEAWAY" emphasis box
//   warning   - red-tinted warning box
//   mnemonic  - mnemonic call-out with letter rows
//   case      - case law summary box

export { KEY_CASES };
