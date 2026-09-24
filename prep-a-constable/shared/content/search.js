// ============================================================================
// SHARED — platform-agnostic. Imported by BOTH the web app (app/) and the
// React Native app (native/). Contains NO JSX and no platform APIs.
// Content moved VERBATIM from app/prep-a-constable.jsx — never retyped.
// ============================================================================

// Abbreviation / synonym map. When the officer types a common police abbreviation,
// we also search for the spelled-out terms — because the cards themselves use full
// titles (e.g. "anti-social behaviour", not "ASB"). Each key maps to a list of
// extra terms that the query is treated as matching.
const SEARCH_SYNONYMS = {
  "asb": ["anti-social behaviour", "antisocial behaviour", "dispersal", "anti-social behaviour, crime and policing act 2014", "community protection", "public spaces protection", "criminal behaviour order"],
  "rtc": ["road traffic collision", "road traffic act 1988", "collision", "accident", "fail to stop", "fail to report", "section 170", "driving", "vehicle"],
  "rta": ["road traffic act 1988", "driving", "vehicle", "collision"],
  "esd": ["electronic screening device", "breath test", "breathalyser", "breathalyzer", "roadside breath", "drink drive", "preliminary test", "specimen for analysis"],
  "twoc": ["taking without consent", "taking a conveyance", "section 12 theft act 1968", "conveyance"],
  "gbh": ["grievous bodily harm", "section 18", "section 20", "wounding", "offences against the person act 1861"],
  "abh": ["actual bodily harm", "section 47", "assault occasioning", "offences against the person act 1861"],
  "pwits": ["possession with intent to supply", "section 5(3)", "misuse of drugs act 1971", "supply"],
  "pace": ["police and criminal evidence act 1984"],
  "moda": ["misuse of drugs act 1971", "drugs"],
  "poca": ["prevention of crime act 1953", "offensive weapon"],
  "cja": ["criminal justice act 1988", "bladed", "pointed article"],
  "owa": ["offensive weapons act 2019", "corrosive", "flick knife", "zombie knife"],
  "poa": ["public order act 1986", "affray", "violent disorder", "riot", "harassment alarm distress"],
  "soa": ["sexual offences act 2003", "rape", "sexual assault", "consent"],
  "da": ["domestic abuse", "domestic violence", "dvpn", "dvpo", "coercive control"],
  "dvpn": ["domestic violence protection notice"],
  "dvpo": ["domestic violence protection order"],
  "cse": ["child sexual exploitation", "safeguard"],
  "fgm": ["female genital mutilation"],
  "hba": ["honour based abuse", "honour-based abuse", "forced marriage"],
  "nrm": ["national referral mechanism", "modern slavery", "trafficking"],
  "mha": ["mental health act 1983", "section 136", "section 135", "place of safety"],
  "mca": ["mental capacity act 2005", "capacity"],
  "misper": ["missing person", "missing persons"],
  "bop": ["breach of the peace"],
  "fpn": ["fixed penalty notice", "penalty"],
  "cbo": ["criminal behaviour order"],
  "cpn": ["community protection notice"],
  "pspo": ["public spaces protection order"],
  "vps": ["victim personal statement"],
  "mg11": ["witness statement"],
  "tic": ["taken into consideration", "offences taken into consideration"],
  "cd": ["criminal damage act 1971", "criminal damage", "arson"],
  "ndm": ["national decision model"],
  "csi": ["crime scene", "evidence"],
  "anpr": ["automatic number plate", "vehicle"],
  "s17": ["section 17"], "s18": ["section 18"], "s19": ["section 19"],
  "s24": ["section 24"], "s32": ["section 32"], "s136": ["section 136"],
  "s170": ["section 170"], "s5": ["section 5"], "s4": ["section 4"],
};

export { SEARCH_SYNONYMS };
