// ============================================================================
// Legal document tests.
//
// These exist because the two documents in shared/content/legal.js are the
// app's compliance surface, and two specific things have already gone wrong
// once each:
//
//  1. The published policy carried a visible note saying it was "a template
//     provided with the prototype" that still needed a business name. A
//     privacy notice that tells the user it is unfinished is not a privacy
//     notice.
//  2. It stated that speech never leaves the device, while the speech module
//     defaults to sending audio over the network for transcription.
//
// The placeholder test is a RELEASE GATE: it fails while any "[YOUR ..."
// remains, so the app cannot be shipped with them showing.
// ============================================================================

import { LEGAL_DOCS } from '../../shared/content/legal.js';

const flat = (key) =>
  LEGAL_DOCS[key].body.map(([, text]) => text).join('\n');

const bothDocs = `${flat('privacy')}\n${flat('terms')}`;

describe('legal documents — release gate', () => {
  it('contains no unfilled placeholders', () => {
    // Fill CONTROLLER_NAME, CONTROLLER_EMAIL and CONTROLLER_ADDRESS in
    // shared/content/legal.js before release. Identity and contact details of
    // the controller are required by Article 13(1)(a)-(b) UK GDPR.
    //
    // THIS TEST IS MEANT TO FAIL until they are filled in. It is the release
    // gate, not a broken test — do not delete it, fill the values in.
    const left = [...new Set(bothDocs.match(/\[YOUR[^\]]*\]/g) || [])];
    if (left.length) {
      throw new Error(
        'RELEASE GATE: the legal documents still contain placeholders that would ' +
        'be shown to users.\n\n  Unfilled: ' + left.join(', ') +
        '\n\n  Fix: set CONTROLLER_NAME, CONTROLLER_EMAIL and CONTROLLER_ADDRESS ' +
        'at the top of shared/content/legal.js.\n  Why: UK GDPR Article 13(1)(a)-(b) ' +
        'requires the controller\'s identity and contact details to be given to users.\n'
      );
    }
    expect(left).toEqual([]);
  });

  it('never tells the user the documents are a draft or template', () => {
    expect(bothDocs).not.toMatch(/template|prototype|placeholder|to be confirmed|TBC/i);
  });
});

describe('privacy notice — UK GDPR Article 13 content', () => {
  const p = flat('privacy');

  it('identifies the controller and gives contact details', () => {
    expect(LEGAL_DOCS.privacy.body.some(([, t]) => /data controller is/i.test(t))).toBe(true);
  });

  it('states a lawful basis for each purpose', () => {
    // Article 13(1)(c). Contract for the account and study data, consent for
    // the microphone.
    expect(p).toMatch(/Lawful basis: performance of a contract/);
    expect(p).toMatch(/Lawful basis: your consent/);
  });

  it('gives retention periods rather than vague assurances', () => {
    expect(p).toMatch(/kept until you delete your account/i);
    expect(p).toMatch(/24 months/);
  });

  it('names the recipients of personal data', () => {
    expect(p).toMatch(/Supabase/);
    expect(p).toMatch(/processor/i);
  });

  it('covers international transfers', () => {
    expect(p).toMatch(/European Economic Area/);
    expect(p).toMatch(/adequacy regulations/i);
  });

  it('lists every individual right, not just three', () => {
    [/right to be informed/i, /copy of the personal information/i, /corrected/i,
     /erased/i, /restrict/i, /object/i, /portable/i, /withdraw it at any time/i]
      .forEach((re) => expect(p).toMatch(re));
  });

  it('tells the user they can complain to the Information Commissioner', () => {
    // Article 13(2)(d).
    expect(p).toMatch(/Information Commissioner's Office/);
    expect(p).toMatch(/ico\.org\.uk/);
  });

  it('offers a complaint route to us, with the 30-day acknowledgement', () => {
    // Section 164A Data Protection Act 2018, inserted by section 103 Data (Use
    // and Access) Act 2025, in force for complaints received on or after
    // 19 June 2026. The controller must give people a way to complain directly,
    // acknowledge receipt within 30 days, respond without undue delay and tell
    // the complainant the outcome. Complaining to the ICO first is still the
    // user's choice — 164A does not make us a compulsory first step.
    expect(p).toMatch(/right to complain to us/i);
    expect(p).toMatch(/acknowledge your complaint within 30 days/i);
    expect(p).toMatch(/tell you the outcome/i);
    expect(p).toMatch(/You do not have to come to us first/i);
  });

  it('states the one-month response time, not an invented one', () => {
    // Article 12(3) is "without undue delay and in any event within one month".
    // "30 days" is the commonest wrong paraphrase of it and is a shorter period
    // than the law gives, so it must not appear as the RIGHTS deadline.
    //
    // 30 days is nevertheless correct for one thing — acknowledging a complaint
    // under section 164A DPA 2018 — so this checks the sentence about rights
    // requests specifically rather than banning the phrase from the document.
    expect(p).toMatch(/within one month/);
    const rights = LEGAL_DOCS.privacy.body
      .filter(([, t]) => /We will respond/.test(t)).map(([, t]) => t).join('\n');
    expect(rights).not.toMatch(/30 days/);
  });
});

describe('privacy notice — matches what the app actually does', () => {
  const p = flat('privacy');

  it('does not claim speech never leaves the device', () => {
    // It only stays on the device where the device supports offline
    // transcription; otherwise it goes to Apple or Google. Claiming otherwise
    // is a transparency failure, and a false App Store privacy answer.
    expect(p).toMatch(/sent to Apple or Google/);
    expect(p).toMatch(/where your device can transcribe speech offline/i);
  });

  it('does not advertise sign-in methods the app does not offer', () => {
    // Email magic link is the only provider wired up.
    expect(p).not.toMatch(/sign-in provider \(Apple, Google, or email\)/);
    expect(p).toMatch(/one-time sign-in link/);
  });

  it('states there is no analytics, advertising or tracking', () => {
    expect(p).toMatch(/no analytics, no advertising and no third-party tracking/i);
  });

  it('states no marketing is sent', () => {
    expect(p).toMatch(/We do not send marketing/);
  });

  it('describes the app as a one-off purchase, not a subscription', () => {
    expect(flat('terms')).toMatch(/one-off purchase of £6\.99/);
    expect(flat('terms')).toMatch(/no subscription/i);
  });
});

describe('effectiveness statistics — the new purpose is disclosed', () => {
  const p = flat('privacy');

  it('states the purpose, the lawful basis and the objection route', () => {
    // Added a purpose (does the app work?) that is NOT necessary for the
    // contract, so it runs on legitimate interests and must say so, and must
    // tell people how to object — Article 13(1)(c)-(d) and Article 21.
    expect(p).toMatch(/Whether the app is working/);
    expect(p).toMatch(/Lawful basis: our legitimate interests/);
    expect(p).toMatch(/You can object at any time/);
    expect(p).toMatch(/Help improve the app/);
  });

  it('promises aggregate-only figures and a minimum cohort', () => {
    expect(p).toMatch(/never a report about you/);
    expect(p).toMatch(/fewer than 20 people/);
  });

  it('promises no extra collection for it', () => {
    expect(p).toMatch(/we collect nothing extra for it/);
  });
});

describe('permission strings — the other place we describe the microphone', () => {
  // These are shown by iOS in the system permission dialog, which for most
  // users is the FIRST thing they read about the microphone, before the privacy
  // notice and before the line on the drill screen. It said "Nothing is
  // recorded or uploaded", which is not true on a device that cannot transcribe
  // offline — the same defect that was already fixed in the privacy notice.
  //
  // So all three surfaces have to agree: app.json here, the privacy notice in
  // shared/content/legal.js, and the line in VerbalDrillScreen before the
  // microphone opens. If speech behaviour changes, all three change together.
  const plugins = require('../app.json').expo.plugins;
  const speech = plugins.find((p) => Array.isArray(p) && p[0] === 'expo-speech-recognition');
  const strings = Object.values(speech[1]).filter((v) => typeof v === 'string').join('\n');

  it('names the real feature rather than asking for access in the abstract', () => {
    expect(strings).toMatch(/verbal drill/i);
    expect(strings).toMatch(/caution/i);
  });

  it('does not claim the audio never leaves the device', () => {
    expect(strings).not.toMatch(/nothing is recorded or uploaded/i);
    expect(strings).not.toMatch(/never (leaves|leave) (the|your) (device|phone|iPhone)/i);
  });

  it('says where the audio actually goes when it cannot be done on-device', () => {
    expect(strings).toMatch(/Apple's speech service/);
    expect(strings).toMatch(/never receive or keep the audio/i);
  });
});

describe('terms — UK consumer law', () => {
  const t = flat('terms');

  it('preserves statutory rights under the Consumer Rights Act 2015', () => {
    // Section 47 CRA 2015: the trader cannot exclude or restrict liability for
    // the digital content quality rights.
    expect(t).toMatch(/Consumer Rights Act 2015/);
    expect(t).toMatch(/satisfactory quality/);
    expect(t).toMatch(/Nothing in these terms excludes or limits those rights/);
  });

  it('does not purport to exclude liability that cannot be excluded', () => {
    expect(t).toMatch(/death or personal injury caused by our negligence/);
    expect(t).toMatch(/fraud or fraudulent misrepresentation/);
    // the old blanket disclaimer must be gone
    expect(t).not.toMatch(/We accept no liability for examination outcomes/);
  });

  it('explains the cancellation position for immediate digital downloads', () => {
    expect(t).toMatch(/Consumer Contracts \(Information, Cancellation and Additional Charges\) Regulations 2013/);
    expect(t).toMatch(/14-day right/);
  });

  it('states a governing law and preserves local consumer protections', () => {
    expect(t).toMatch(/governed by the law of/);
    expect(t).toMatch(/Scotland or Northern Ireland/);
  });

  it('says the app is not endorsed by any police force', () => {
    expect(t).toMatch(/not produced, endorsed or approved/);
  });
});
