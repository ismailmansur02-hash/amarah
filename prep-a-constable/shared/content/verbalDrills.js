// ============================================================================
// SHARED — platform-agnostic. Imported by BOTH the web app (app/) and the
// React Native app (native/). Contains NO JSX and no platform APIs.
// Content moved VERBATIM from app/prep-a-constable.jsx — never retyped.
// ============================================================================

const VERBAL_DRILLS = [
  {
    id: "caution",
    title: "The Caution",
    sub: "Police and Criminal Evidence Act 1984 Code C",
    // The exact words to be matched, in order.
    script: "You do not have to say anything but it may harm your defence if you do not mention when questioned something which you later rely on in court anything you do say may be given in evidence",
    // How it's shown back to the user (with punctuation/capitalisation).
    display: "You do not have to say anything, but it may harm your defence if you do not mention when questioned something which you later rely on in Court. Anything you do say may be given in evidence.",
    note: "Must be given word-for-word. If the person doesn't understand, explain in plain terms then re-administer.",
  },
  {
    id: "gowisely",
    title: "GOWISELY",
    sub: "Stop & search — what you must communicate",
    // GOWISELY is a CHECKLIST, not a fixed sentence. Each component is credited if
    // the officer covers it in ANY reasonable words (synonyms accepted), so the
    // drill rewards communicating the element rather than reciting an exact token.
    componentMode: true,
    components: [
      { label: "Grounds", accept: ["grounds", "reason for the search", "reason i am searching", "reason im searching", "why i am searching", "why im searching", "because i", "reasonable grounds"] },
      { label: "Object", accept: ["object", "object of the search", "what i am looking for", "what im looking for", "looking for", "searching for", "search you for"] },
      { label: "Warrant card", accept: ["warrant card", "warrant", "identification card", "my card", "id card", "police id", "show you my id"] },
      { label: "Identity", accept: ["identity", "my name is", "name is", "i am pc", "im pc", "i am police constable", "constable", "my name"] },
      { label: "Station", accept: ["station", "based at", "attached to", "from the", "nick", "i work at", "posted at"] },
      { label: "Entitlement to a record", accept: ["entitlement", "entitled", "copy of the record", "copy of the form", "a record of the search", "you can have a copy", "record of this search", "receipt"] },
      { label: "Legal power", accept: ["legal power", "power", "under section", "section", "the law", "authority", "police and criminal evidence", "pace", "misuse of drugs", "under the"] },
      { label: "You are detained", accept: ["detained", "detain you", "you are being detained", "detained for the purpose", "detained for the search", "not free to leave"] },
    ],
    display: "Grounds · Object of the search · Warrant card · Identity of the officer · Station · Entitlement to a record · Legal power used · You are detained for the search",
    note: "GOWISELY is a checklist of components you must cover — say each element clearly. Different wording is fine; the drill accepts reasonable synonyms.",
  },
  {
    id: "esd-arrest",
    title: "ESD Arrest Wording",
    sub: "Roadside breath test — arrest on FAIL result",
    script: "I am arresting you because the breath test is positive and because I suspect you of driving having had too much to drink",
    display: "\"I am arresting you because the breath test is positive and because I suspect you of driving (or attempting to drive or being in charge of ........) having had too much to drink.\"",
    note: "Then give the CAUTION and record any response and the time of arrest.",
  },
];

// Normalise spoken text: lowercase, strip punctuation, collapse spaces, expand common
// speech-to-text quirks (e.g. recogniser returns digits or contractions).

export { VERBAL_DRILLS };
