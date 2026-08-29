/**
 * Safeguarding filter.
 *
 * Our students are mostly under 18, so a tutor and a student must never be able to
 * move the conversation off-platform. Every UK platform that takes safeguarding
 * seriously (MyTutor, Tutorful, GoStudent) blocks contact-detail exchange, and the
 * Online Safety Act 2023 treats an app where users message each other as a
 * user-to-user service with content duties. This runs on every message, on the
 * server, before anything is stored.
 *
 * It is deliberately blunt. A false positive costs a student one retyped message.
 * A false negative is a child safety incident.
 */

const REDACTION = "[removed — contact details can't be shared on Project TA]";

interface Pattern {
  name: string;
  re: RegExp;
}

const PATTERNS: Pattern[] = [
  // UK mobile and landline numbers, including spaced and +44 forms.
  { name: "phone", re: /(?:\+?44|0)\s*(?:\d[\s-]*){9,12}/g },
  // Any run of 9+ digits that looks like a number being passed along. School maths
  // does not produce nine-digit runs, so this needs no exemption for notation.
  { name: "digits", re: /\b(?:\d[\s.-]*){9,}\b/g },
  { name: "email", re: /[\w.+-]+\s*(?:@|\(at\)|\[at\])\s*[\w-]+\s*(?:\.|\(dot\)|\[dot\])\s*\w{2,}/gi },
  // Spelled-out obfuscation, e.g. "priya dot shah at gmail dot com".
  { name: "email-spelled", re: /\b\w+(?:\s+dot\s+\w+)*\s+at\s+\w+(?:\s+dot\s+\w+)+/gi },
  { name: "domain-spelled", re: /\b\w+\s+dot\s+(?:com|net|org|io|me|co\s+dot\s+uk)\b/gi },
  // Social handles and platform names used to move the chat elsewhere.
  {
    name: "social",
    re: /\b(?:snap(?:chat)?|insta(?:gram)?|whats\s*app|telegram|discord|tiktok|facebook|messenger|signal|skype)\b(?:\s*(?:is|:|-|—)?\s*@?[\w.]{2,})?/gi,
  },
  { name: "handle", re: /(?<![\w])@[A-Za-z][\w.]{2,}/g },
  // Meeting links and any bare URL or bare domain.
  { name: "link", re: /\b(?:https?:\/\/|www\.)\S+/gi },
  { name: "meeting", re: /\b(?:zoom\.us|meet\.google|teams\.microsoft|calendly)\S*/gi },
  { name: "domain", re: /\b[\w-]+\.(?:com|co\.uk|net|org|io|me|app|link)\b\S*/gi },
  // Payment-off-platform attempts.
  {
    name: "offplatform-pay",
    re: /\b(?:paypal|revolut|monzo|venmo|cash\s*app|bank\s*transfer|sort\s*code|iban)\b/gi,
  },
];

export interface FilterResult {
  clean: string;
  redacted: boolean;
  reasons: string[];
}

export function filterMessage(input: string): FilterResult {
  let clean = input;
  const reasons: string[] = [];

  for (const { name, re } of PATTERNS) {
    // Reset lastIndex — these are module-level regexes with /g.
    re.lastIndex = 0;
    if (re.test(clean)) {
      reasons.push(name);
      re.lastIndex = 0;
      clean = clean.replace(re, REDACTION);
    }
  }

  if (reasons.length) {
    // Collapse repeated redactions so a message full of digits stays readable, and
    // put the spacing back — the patterns often swallow the whitespace around a match.
    clean = clean
      .replace(new RegExp(`(?:${escapeRegex(REDACTION)}[\\s,]*){2,}`, "g"), `${REDACTION} `)
      .replace(new RegExp(escapeRegex(REDACTION), "g"), ` ${REDACTION} `)
      .replace(/[ \t]{2,}/g, " ");
  }

  return { clean: clean.trim(), redacted: reasons.length > 0, reasons };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Is this short enough, and mathematical enough, to be working rather than prose?
 *
 * Nothing in the filter depends on this any more — an earlier version used it to
 * relax the number rules and that turned out to be a hole, because a phone number
 * hidden behind "dy/dx =" sailed straight through. It is kept because the session
 * UI uses it to decide whether to offer maths formatting, and because the tests
 * pin down that it never treats an address or a link as notation.
 */
export function isLikelyMaths(input: string): boolean {
  if (/@|https?:|www\.|\.(?:com|co\.uk|net|org|io|me)\b/i.test(input)) return false;

  const mathish = /[=^√∫∑π]|\b(?:sin|cos|tan|log|ln|dx|dy|sqrt)\b|\d\s*[+\-*/]\s*\d/i.test(input);
  const words = input.split(/\s+/).filter(Boolean).length;
  const letters = (input.match(/[a-z]/gi) ?? []).length;

  // Real working is short and light on prose.
  return mathish && words <= 12 && letters <= 40;
}

/** How long we keep session transcripts, for the privacy policy and the DPIA. */
export const TRANSCRIPT_RETENTION_MONTHS = 24;
