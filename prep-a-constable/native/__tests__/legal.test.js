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

  it('states the one-month response time, not an invented one', () => {
    expect(p).toMatch(/within one month/);
    expect(p).not.toMatch(/within 30 days/);
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
