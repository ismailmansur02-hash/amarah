# Prep a Constable — UK pre-launch compliance audit

**Scope:** United Kingdom law and regulators only. Version audited: 1.0.0, branch
`claude/full-app-audit-rraf3e`. Audited 27 September 2026.

**This is not legal advice and I am not a solicitor.** It is a technical and
documentary review against published UK regulatory guidance, carried out by
reading the source code rather than by assuming. Everything marked CRITICAL or
HIGH should be reviewed by a qualified UK data protection practitioner or
solicitor before launch. Nothing here certifies the app as compliant.

Where I could not verify something from the code — anything about your business,
your contracts with suppliers, or your registration status — it is listed as an
action for you, not as a finding about the app.

---

## What the app actually does

Established by reading the code, not from the existing documentation.

| | Finding |
|---|---|
| **Personal data collected** | Email address (only if an account is created); optional first name, surname, rank; study data (answers, flags, attempts, lessons read, spaced-repetition schedule, streak, chosen Assessment Point and dates, recorded real assessment results) |
| **Special category data** | None collected or requested |
| **Location** | Not collected. No location permission, no location code anywhere |
| **Camera / photos / video** | Not collected. No permission declared, no code |
| **Microphone** | Verbal Drills only, while recording. See CRITICAL-1 |
| **Device identifiers / advertising ID** | None |
| **Analytics SDK** | **None.** Verified by searching for the common providers — no Firebase, Sentry, Amplitude, Mixpanel, PostHog, Meta, AppsFlyer, Adjust, AdMob |
| **Advertising SDK** | None |
| **Push notifications** | None. `expo-notifications` is not a dependency |
| **Cookies / web tracking** | None |
| **User-generated content** | None. Users cannot upload anything, and there is no messaging, no profile visible to others, no comments |
| **AI** | None. No model is called at runtime |
| **Profiling / automated decisions** | None with legal or similarly significant effects. The spaced-repetition schedule is a study tool, not a decision about the person |
| **Payment data** | None reaches the app. One-off £6.99 taken by Apple or Google |
| **Third parties receiving data** | Supabase (processor); Apple or Google for speech transcription and for the purchase |
| **Where data sits** | Supabase project `uqekeszdgeumwjdbompd`, region `eu-west-1` (Ireland) |

This is a genuinely small data footprint. Most of the findings below are about
**documentation and accountability**, not about the app collecting too much.

---

# CRITICAL — fix before launch

## CRITICAL-1 — The privacy notice said speech never leaves the device. It does.

**The problem.** `native/src/speech.js` called the recogniser without setting
`requiresOnDeviceRecognition`. That option **defaults to `false`**, documented in
the module as *"[Default: false] Prevent device from sending audio over the
network."* So audio was being sent to Apple's or Google's speech servers for
transcription, while the privacy notice stated *"We do not record, store or
upload any audio"* and the draft App Store privacy answers declared **No** to
collecting Audio Data.

**The law.** Article 5(1)(a) UK General Data Protection Regulation (lawfulness,
fairness and transparency) and Article 13, which requires users to be told the
recipients of their personal data. Separately, a false answer in the App Store
privacy questionnaire is an Apple policy breach.

**Legally required, not best practice.**

**Why it applies.** Voice is personal data. A user reading that notice would
reasonably conclude their voice never left their handset, which was not true.

**What changed.** The app now requests on-device recognition wherever the device
supports it (`requiresOnDeviceRecognition: supportsOnDevice()`), and the drill
screen states, *before the microphone opens*, which of the two is happening on
that specific device. The privacy notice now describes both cases accurately. A
test asserts the notice does not claim audio stays local.

**Your remaining action:** when completing the App Store privacy questionnaire,
answer **Yes** to Audio Data unless you can show on-device transcription for all
supported devices — or keep the answer conservative and declare it.

**Source:** [ICO — right to be informed](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/)

## CRITICAL-2 — The published documents told users they were unfinished templates

**The problem.** Both documents ended with a visible note reading *"This is a
template policy provided with the prototype. Before publishing, have it reviewed
… and insert your registered business name, contact email, and ICO registration
number."* That text was rendered to users in the app.

**The law.** Article 12(1) UK GDPR requires privacy information to be concise,
transparent, intelligible and in clear plain language. A notice that says it is
unfinished does not discharge the Article 13 duty.

**Legally required.**

**What changed.** Both documents rewritten. The notes are gone.

## CRITICAL-3 — No controller identity, no contact details

**The problem.** The notice never said who the controller was. Contact was *"the
support address listed on our App Store listing"*.

**The law.** Article 13(1)(a) and (b) UK GDPR — the identity **and** contact
details of the controller must be provided.

**Legally required.**

**What changed.** Added, driven by `CONTROLLER_NAME`, `CONTROLLER_EMAIL` and
`CONTROLLER_ADDRESS` at the top of `shared/content/legal.js`. **These are
placeholders and you must fill them in.** A test fails while they remain, so the
app cannot be shipped with them showing.

## CRITICAL-4 — No lawful basis stated

**The problem.** Not one purpose had a lawful basis.

**The law.** Article 13(1)(c) UK GDPR.

**Legally required.**

**What changed.** Stated per purpose: performance of a contract for the account,
profile and study data; consent for the microphone, given by tapping the button
and granting the device permission, withdrawable at any time.

## CRITICAL-5 — No right to complain to the Information Commissioner's Office

**The law.** Article 13(2)(d) UK GDPR.

**Legally required.**

**What changed.** Added, with the ICO helpline and website.

## CRITICAL-6 — ICO data protection fee (your action, not a code change)

**The problem.** Nothing in the project shows the fee has been paid.

**The law.** Data Protection (Charges and Information) Regulations 2018. Controllers
processing personal data — including sole traders — must pay the annual data
protection fee unless an exemption applies. Tier 1 is £52 for organisations with
turnover under £632,000 or no more than 10 staff. Exemptions exist for certain
limited purposes; running a commercial app with user accounts is very unlikely to
fall within them.

**Legally required.**

**What you must do.** Take the ICO's self-assessment and, if it says so, register
and pay before launch.

**Sources:** [ICO — data protection fee](https://ico.org.uk/for-organisations/data-protection-fee/) · [ICO — exemptions](https://ico.org.uk/for-organisations/data-protection-fee/data-protection-fee/exemptions/) · [GOV.UK — pay the data protection fee](https://www.gov.uk/data-protection-register-notify-ico-personal-data)

## CRITICAL-7 — The notice described sign-in methods that do not exist

**The problem.** It described storing *"an identifier from your chosen sign-in
provider (Apple, Google, or email)"*. Only the email one-time link is implemented;
Apple and Google sign-in are deliberately not offered.

**The law.** Article 5(1)(a) and Article 13 — accuracy of the information given.

**Legally required.**

**What changed.** Corrected to describe the one-time link only, and to state that
no password is ever held.

---

# HIGH — should fix before launch

## HIGH-1 — International transfers were not disclosed

**The law.** Article 13(1)(f) UK GDPR.

**Legally required to disclose.** The good news is that the transfer itself needs
no extra safeguard: the database is in Ireland, and all European Economic Area
countries have full UK adequacy, so no International Data Transfer Agreement and
no transfer risk assessment is needed for it.

**What changed.** Disclosed, including that suppliers outside the UK may access
data in support and that transfer safeguards in supplier agreements are relied on.

**Your action:** confirm Supabase's own sub-processors and support arrangements,
and that its terms include the International Data Transfer Agreement or the UK
Addendum where data goes beyond the EEA.

**Source:** [ICO — adequacy regulations](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/adequacy-regulations/)

## HIGH-2 — Retention was vague, and the new promise needs a mechanism

**The problem.** *"as long as your account is active"* is not a retention period.

**The law.** Article 5(1)(e) (storage limitation) and Article 13(2)(a), which
requires the period or the criteria used to determine it.

**Legally required.**

**What changed.** Concrete periods published: kept until you delete your account;
inactive accounts emailed at 24 months and deleted 30 days later; speech not
retained at all.

**Important:** publishing that period creates an obligation to apply it.
`backend/supabase/migrations/0002_retention.sql` provides the mechanism, with a
dry run first. **It is deliberately not enabled** — it deletes accounts, and it
needs the warning email to exist before the published promise is actually kept.
Until you enable it, that paragraph is a commitment you are not meeting.

## HIGH-3 — Incomplete rights list

**The problem.** Only access, rectification and erasure were mentioned.

**The law.** Article 13(2)(b)-(c) — restriction, objection, portability, and the
right to withdraw consent must also be given.

**Legally required.** **What changed.** All of them now listed, with how to use
them and the one-month response time (Article 12(3)), replacing the invented
"30 days".

## HIGH-4 — The terms tried to exclude liability that cannot be excluded

**The problem.** *"We accept no liability for examination outcomes or operational
decisions made in reliance on the app"*, with no statutory-rights savings and no
carve-outs.

**The law.** Section 47 Consumer Rights Act 2015 — a trader cannot exclude or
restrict liability for the digital content rights in Chapter 3 (satisfactory
quality, fit for purpose, as described). Section 65 — liability for death or
personal injury from negligence cannot be excluded. Section 62 — the fairness
test; an unfair term is not binding on the consumer.

**Legally required.**

**What changed.** Added an explicit statement of Consumer Rights Act 2015 rights,
carve-outs for death or personal injury, fraud, and anything else that cannot
lawfully be excluded, and a proportionate cap for everything else.

**Source:** [Consumer Rights Act 2015, Part 1 Chapter 3](https://www.legislation.gov.uk/ukpga/2015/15/part/1/chapter/3) · [Part 2, unfair terms](https://www.legislation.gov.uk/ukpga/2015/15/part/2) · [CMA37 unfair contract terms guidance](https://assets.publishing.service.gov.uk/media/6a609329b00f3323bf1a23f3/unfair_contract_terms_guidance.pdf)

## HIGH-5 — No governing law, no cancellation position

**The law.** Regulation 13 and Schedule 2 Consumer Contracts (Information,
Cancellation and Additional Charges) Regulations 2013 — pre-contract information
including the cancellation right. For immediately-downloaded digital content the
14-day right is lost **only if** the consumer gave express consent to immediate
supply **and** acknowledged losing the right.

**Legally required** (Apple and Google collect that consent at the point of
purchase; your terms should still explain the position).

**What changed.** Terms now explain the cancellation position, that refunds go
through the store that took the payment, that statutory rights are enforceable
against you regardless, and set governing law with Scottish and Northern Irish
consumer protections preserved.

## HIGH-6 — Article 28 processor contract with Supabase

**The law.** Article 28(3) UK GDPR — processing by a processor must be governed by
a contract containing the specified terms.

**Legally required.** Nothing in the repository evidences one.

**Your action:** accept Supabase's Data Processing Addendum and keep a copy.

## HIGH-7 — Children's Code position needs to be recorded

**The problem.** The old notice said only *"not directed at children under 16"*,
which is the wrong threshold (a child is under 18) and does not address the test.

**The law.** The ICO's Age Appropriate Design Code is a **statutory** code under
section 123 Data Protection Act 2018. It applies to information society services
**likely to be accessed by children**, and the ICO is explicit that adult-only
services are in scope if children are in fact likely to access them.

**My assessment — and it is an assessment, not a certainty.** An age gate does
**not** appear to be required here: applicants to UK police forces must be at
least 18 at appointment, the subject matter is professional examination revision,
the app has no feature that attracts children, and — decisively — it is a paid
app with none of the risky processing the Code targets: no location, no
profiling, no personalised advertising, no public profile, no user-to-user
contact, and no data sharing. Standards on high-privacy defaults, data
minimisation and nudge techniques are already met in substance because those
features do not exist.

**What to do.** Record that assessment in writing and keep it. You are expected to
be able to justify your conclusion; the conclusion itself looks defensible.
**Have this one confirmed by a practitioner** — it is the finding I am least
certain about, because "likely to be accessed" is a judgement about your real
audience, which you know and I do not.

**What changed.** The Children section now uses the correct threshold, states the
18+ position, and records that none of the risky features exist.

**Sources:** [ICO — Children's code guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/) · [ICO — age assurance opinion](https://ico.org.uk/about-the-ico/what-we-do/information-commissioners-opinions/age-assurance-for-the-children-s-code/)

## HIGH-8 — No breach procedure exists

**The law.** Article 33 UK GDPR — notify the ICO without undue delay and within
72 hours of becoming aware, where the breach is likely to result in a risk.
Article 34 — tell affected individuals where the risk is high. Article 33(5) —
keep a record of every breach, including ones you do not report.

**Legally required.**

**Your action.** A one-page procedure is enough at this size: who notices, who
decides, the 72-hour clock, the ICO reporting route, and a breach log. The app
can answer *what* and *who* — one row per user, `updated_at` timestamps — but
there is currently no alerting to tell you something happened.

## HIGH-9 — Authentication tokens are in AsyncStorage, not the Keychain

**The problem.** The Supabase session, including the refresh token, is stored via
`AsyncStorage`, which on iOS is ordinary app-container storage. The Keychain
(`expo-secure-store`) is the appropriate place for a credential.

**Best practice, not a specific legal requirement** — but it engages Article 32
(security appropriate to the risk).

**Deliberately not implemented.** `expo-secure-store` warns above 2048 bytes per
value and a Supabase session with two JSON Web Tokens can exceed that, so doing
this properly needs a chunking storage adapter and testing on a real device.
Swapping it in blind, days before launch, is a worse risk than the finding. It is
a contained piece of work — say the word and I will do it with tests.

---

# MEDIUM — recommended

**MEDIUM-1 — No record of processing activities.** Article 30(5) exempts
organisations under 250 staff *unless* the processing is not occasional — yours
is regular, so a short record is expected. It is half a page given how little you
process.

**MEDIUM-2 — Data Protection Impact Assessment not required, but record why.**
Article 35 requires one for processing likely to result in high risk. Against the
ICO's screening criteria this app hits none: no special category data, no
systematic monitoring, no profiling with significant effects, no location, no
biometrics, no AI, no large-scale processing, and children are not the audience.
**My assessment is that a DPIA is not required.** Write down that conclusion and
the reasons — the accountability principle means you need to be able to show you
considered it.

**MEDIUM-3 — Supabase project region and sub-processors.** Confirm the region has
not moved and review the sub-processor list, since the notice now states Ireland.

**MEDIUM-4 — Inactivity warning email does not exist.** See HIGH-2. Until it does,
the published promise of a warning is not being kept.

**MEDIUM-5 — Supabase leaked-password protection advisory.** Not applicable — there
are no passwords — but the advisory will keep appearing in the dashboard.

---

# LOW — optional

**LOW-1** — Add a short plain-English summary at the top of the privacy notice.
Good practice under Article 12(1); the notice is already plain but it is long.

**LOW-2** — Publish the same privacy notice at a public URL for App Store Connect
(already on the pre-launch list) and keep it identical to the in-app copy.

**LOW-3** — Consider a `security.txt` or a stated contact for security reports.

---

# Security review

Reviewed against the specific risks asked about.

| Check | Result |
|---|---|
| Exposed API keys | **Pass.** The key shipped in the client is the Supabase publishable key, which is designed to ship. The service-role key exists only inside the deployed edge function |
| Secrets in the repository | **Pass.** `backend/.env` is gitignored; only `.env.example` is tracked |
| Broken authorisation / IDOR | **Pass.** `user_state` has row-level security on all four verbs, each `auth.uid() = user_id`. `user_id` is the primary key and is taken from the verified JSON Web Token, never from client input. One user cannot reach another's row by changing an identifier |
| Insecure authentication | **Pass with a note.** One-time email link, so no passwords exist to leak or reuse. See HIGH-9 on token storage |
| Account deletion | **Pass.** The edge function derives the user from their own token — it never trusts an identifier in the request body — uses the service role server-side only, and `ON DELETE CASCADE` removes the state row. Local state resets to defaults |
| Insecure database rules | **Pass.** Row-level security enabled; the `updated_at` trigger has a pinned `search_path` |
| Insecure file uploads | **Not applicable.** No uploads exist |
| Excessive permissions | **Pass.** Microphone and speech recognition only, both used in one screen, both with usage strings |
| Unprotected APIs | **Pass.** All data access goes through PostgREST with row-level security; the edge function requires a valid token |
| Storage exhaustion | **Pass.** A `CHECK` constraint caps the state blob at 4 MiB server-side, so a hand-crafted request cannot bypass the client cap |
| Rate limiting | **Partial.** You rely on Supabase's built-in auth rate limits. There is no application-level limit. Acceptable at this scale; worth checking the dashboard settings for the magic-link endpoint |
| Payment/webhook vulnerabilities | **Not applicable.** No payment code and no webhooks — Apple and Google take the money |
| Prototype pollution / untrusted state | **Pass.** `sanitizeRecordMap` strips `__proto__`, `constructor` and `prototype`, enforces plain objects and caps entry counts |

---

# Sections that do not apply

Stated explicitly so the absence is a finding, not an oversight.

- **Cookies and tracking (section 5).** No cookies, no analytics, no advertising
  identifiers, no pixels. Under the Privacy and Electronic Communications
  Regulations no consent mechanism is required, and **you should not add a cookie
  banner** — there is nothing to consent to. Local storage of progress and of the
  sign-in session is strictly necessary to provide the service the user asked for,
  which is an exception to the consent requirement. (The Data (Use and Access) Act
  2025 added further exceptions, including for aggregate statistical information;
  not relevant while there is no analytics.)
- **Marketing (section 4).** None is sent. The sign-in link is a service message,
  not direct marketing, so PECR regulation 22 is not engaged. No push
  notifications. If you later add a mailing list, you will need consent, and the
  soft opt-in is unlikely to help because it is limited to similar products
  marketed to your own existing customers.
- **Location (section 7).** Not collected.
- **User-generated content (section 12).** None.
- **Artificial intelligence (section 17).** None at runtime.
- **Subscriptions and free trials (sections 9 and 10).** Neither exists — the app
  is a one-off £6.99 purchase, so there is no auto-renewal, no cancellation flow
  and no dark-pattern surface. **For completeness:** the subscription regime in
  Chapter 2 of Part 4 of the Digital Markets, Competition and Consumers Act 2024
  is **enacted but not yet in force**; secondary legislation is still required and
  commencement was anticipated for spring 2027. If you ever move to a
  subscription, that regime and its reminder and cooling-off duties will apply.
  **Sources:** [DMCCA 2024 Part 4 Chapter 2](https://www.legislation.gov.uk/ukpga/2024/13/part/4/chapter/2) · [GOV.UK — government response on the subscription contracts regime](https://www.gov.uk/government/consultations/consultation-on-the-implementation-of-the-new-subscription-contracts-regime/outcome/government-response-to-consultation-on-the-implementation-of-the-new-subscription-contracts-regime-web-accessible-version)
- **Financial Conduct Authority.** Not engaged. The app provides no regulated
  financial activity and handles no payments.
- **Ofcom / Online Safety Act 2023.** The Act bites on user-to-user services and
  search services. This app has no user-to-user functionality of any kind — no
  messaging, no comments, no sharing, no visible profiles — so it does not appear
  to be a regulated service. **Do not add any user-to-user feature without
  re-checking this**, as it would change the analysis materially.

---

# Platform policy, kept separate from UK law

These are Apple and Google requirements, not legal ones.

- **Account deletion in-app** — required by Apple wherever accounts can be
  created. Present, in Profile.
- **App Store privacy questionnaire** — must match reality. See CRITICAL-1: the
  Audio Data answer needs revisiting now that network transcription is disclosed.
- **Privacy policy URL** — required in App Store Connect. Still outstanding.
- **Permission usage strings** — present for microphone and speech recognition.
- **Guideline 5.2 (intellectual property / implying official status)** — addressed
  by the "not produced, endorsed or approved" line in both the store description
  and the terms, and by using no police crest in the icon.

---

# Second audit — what remains after the changes

Re-run after implementing everything above.

**Fixed and verified in code:**

- Speech now requests on-device transcription where supported, and discloses the
  network case in-app before the microphone opens
- Privacy notice rewritten to Article 13 standard: controller identity, lawful
  bases, recipients, transfers, retention periods, full rights list, ICO complaint
  route, one-month response time
- Terms rewritten: Consumer Rights Act 2015 rights preserved, unlawful exclusions
  removed, cancellation position explained, governing law set
- Template notes removed from both documents
- Retention mechanism written (`0002_retention.sql`), with a dry run, not enabled
- 20 tests added asserting the documents say these things and do not re-acquire
  the two errors that have already happened once
- 107 of 108 tests pass

**Still outstanding — and the app should not launch until these are done:**

1. **Fill in the three placeholders** in `shared/content/legal.js`. The test suite
   fails until you do. This is deliberate.
2. **ICO data protection fee** — self-assess, register, pay.
3. **Supabase Data Processing Addendum** — accept and keep a copy.
4. **App Store privacy questionnaire** — revisit the Audio Data answer.
5. **Privacy policy at a public URL.**
6. **Breach procedure and breach log** — one page.
7. **Write down the Children's Code assessment and the DPIA screening conclusion.**
8. **Decide on the inactivity deletion**: enable the job and build the warning
   email, or change the published retention wording to what you will actually do.
9. **Have a qualified person review** the privacy notice, the terms, and
   particularly the Children's Code position at HIGH-7.

**Known and accepted, not blocking:** authentication tokens in AsyncStorage
rather than the Keychain (HIGH-9), and no application-level rate limiting
(MEDIUM, Supabase's own limits apply).

---

## One thing worth saying plainly

The app itself is in unusually good shape for this kind of review. It collects
very little, sells for a one-off price with no subscription machinery, has no
analytics, no advertising, no tracking, no uploads and no user-to-user features —
which removes most of what normally goes wrong. Almost every finding above is
about **documentation and accountability**, not about the product doing something
it should not.

The single genuine product defect was the microphone claim, and that only
surfaced by reading the speech module's documented default rather than trusting
the policy. That is the one I would want a second pair of eyes on.


---

# Addendum — effectiveness statistics (added after the main audit)

Mr Mansur asked to track how people score, to see whether the app is helping.
This is a new purpose, so it was added deliberately rather than casually.

**What it does.** Three read-only SQL functions
(`backend/supabase/migrations/0003_effectiveness.sql`) that answer: are people
getting more accurate, do mock scores improve with practice, what is the real
assessment pass rate among users who record one, and which topics do people find
hardest.

**What it collects.** Nothing new. It reads data already stored to provide the
service. No analytics SDK was added and the app still contains no tracking.

**Lawful basis.** Legitimate interests, Article 6(1)(f). A Legitimate Interests
Assessment is recorded at `docs/LEGITIMATE-INTERESTS-ASSESSMENT.md` — relying on
this basis without one is itself a compliance gap.

**Safeguards, all enforced in code rather than promised:**

| Safeguard | Where |
|---|---|
| Aggregate only — no function returns a user id, name or single-person row | the SQL |
| Minimum cohort of 20; smaller figures return NULL | the SQL |
| Opt-out excluded before anything is counted | `stats_cohort` view |
| Opt-out offered as a control, not just a policy sentence | Profile → Help improve the app |
| Functions revoked from `anon` and `authenticated` | the SQL |

**Notice updated** with the purpose, the basis and the objection route
(Article 13(1)(c)-(d), Article 21). Tests assert all of it.

**Why this did not become a problem.** The obvious way to answer "is my app
helping?" is to add an analytics SDK. That would have introduced third-party
tracking, a new processor, probably a transfer outside the UK, and a consent
question — undoing most of the audit. Querying data already held, in aggregate,
with a cohort floor and an opt-out, gets the same answer and adds almost no risk.

**Still outstanding for this piece:**

1. Run `0003_effectiveness.sql` in Supabase. It is not applied automatically.
2. Complete the controller name in the Legitimate Interests Assessment.
3. Expect every figure to be NULL until 20 people qualify. That is the safeguard
   working, not a fault — `people` still shows the count so you know when numbers
   will appear.
4. If you ever publish a figure in marketing, it must be one that cleared the
   cohort threshold, and it must be accurate — a misleading claim about
   effectiveness engages the Consumer Protection from Unfair Trading
   Regulations 2008 and the advertising codes.


---

# Applied and verified live — 27 September 2026

`0003_effectiveness.sql` has been applied to Supabase project
`uqekeszdgeumwjdbompd` as migration `app_effectiveness_aggregates`. The
safeguards were then checked against the live database rather than assumed:

| Check | Result |
|---|---|
| `app_effectiveness()` runs | Yes — `people: 0`, every figure NULL |
| `app_improvement()` runs | Yes — `people_with_two_or_more_mocks: 0`, figures NULL |
| `anon` can execute any of the three functions | **No** |
| `authenticated` can execute any of the three functions | **No** |
| `anon` can read `stats_cohort` | **No** |
| `authenticated` can read `stats_cohort` | **No** |
| Opt-out expression excludes only `statsOptOut = true` | Verified against literals: absent → included, false → included, true → **excluded** |

Everything returning NULL is the minimum-cohort safeguard working with no users
yet, not a fault. `people` will keep counting, and figures appear at 20.

## Database-level observation

The same Supabase project also hosts an unrelated property-portal schema
(`properties`, `tenants`, `leases`, `documents`, `portal_users` and others).
This matters because the Prep a Constable app ships a publishable key for this
database inside a public App Store binary.

**Checked: every table in `public` has row level security enabled.** The
property-portal tables have RLS enabled with **zero policies**, which in
PostgreSQL denies all access to non-superuser roles — so the shipped key cannot
read them. Nothing is currently exposed.

**But this is a standing risk, not a clean bill of health.** The moment a policy
is added to any of those tables — for example to build the property portal's own
front end — it will be evaluated against a key that is already published in an
App Store app. Two options, in order of preference:

1. **Move the property portal to its own Supabase project.** Unrelated
   applications sharing one database and one publishable key is the underlying
   problem; separating them removes it permanently.
2. If they must share, write every future policy on those tables as if an
   untrusted public key is holding it, because one is.

This is a security observation about the database your app depends on. It is not
a UK data protection finding today, because nothing is accessible. It would
become one — potentially a serious one, given the property tables would hold
tenants' personal data — if a permissive policy were added later.


---

# App icon — decision recorded

The icon shipped at Mr Mansur's direction depicts a British custodian helmet
bearing a royal crown and a police cap badge, over the letters "PC".

**This was flagged before it was used, and he asked for it as supplied.** It is
his app and his decision; this entry exists so the record is honest, not to
reopen it.

**The risk, stated once.** App Store Review Guideline 5.2 covers content that
suggests an association with, or endorsement by, another entity. An icon
combining a police helmet, a crown and a cap badge can read as an official
police product. That is the same risk the store description already addresses
with its "not produced, endorsed or approved by the Metropolitan Police Service
or the College of Policing" line, which remains in place and is now doing more
work than it was.

Two further points a reviewer or a solicitor may raise:

- Use of a representation of the Royal Crown in commercial branding is
  ordinarily subject to permission.
- Section 90 of the Police Act 1996 concerns impersonation and articles of police
  uniform. An app icon is not a uniform and this is not an impersonation offence,
  but the proximity of the imagery to police insignia is the reason the guideline
  risk above is real rather than theoretical.

**Mitigations in place:** the disclaimer in the store description, the equivalent
clause in the Terms of Service, and the absence of any force name or wordmark in
the icon itself.

**If Apple rejects on 5.2**, a de-badged version of the same design — identical
lettering, colours and layout, without the helmet, crown and badge — is committed
at `docs/icon-options/CHOSEN-1-wordmark.png` and can be swapped in by copying it
over `native/assets/icon.png` and rebuilding. That is a ten-minute change, so a
rejection on this point costs a resubmission, not a redesign.
