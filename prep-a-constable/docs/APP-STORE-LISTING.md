# App Store Connect — everything you need to paste in

Draft copy and questionnaire answers for **Prep a Constable v1.0**.
Nothing here is submitted automatically. Read it, change anything that doesn't
sound like you, then paste it in.

---

## Pricing

| Field | Value |
|---|---|
| Business model | **Paid app** — one-off purchase, no subscription |
| Price | **£6.99** (Apple's UK tier nearest 6.99 — check the tier table; Apple sets the other currencies from it) |
| In-app purchases | **None** |

This works with the app exactly as it is. There is no purchase code in the
build because there doesn't need to be: Apple takes the payment at download
and only paying customers ever get the binary.

If you'd rather give it away free and charge £6.99 to unlock inside the app,
that is a different build — it needs StoreKit, a paywall screen and a Restore
Purchases button, and Apple reviews the purchase flow. Say so and I'll build it.

---

## App information

| Field | Value |
|---|---|
| Name (30 char max) | `Prep a Constable` |
| Subtitle (30 char max) | `Police PCEP & DCEP revision` |
| Primary category | Education |
| Secondary category | Reference |
| Copyright | `2026 <your name or company>` |
| Age rating | See the questionnaire below — likely **12+** |

### Promotional text (170 char max — editable any time without a new build)

```
885 exam questions, AP-scoped mocks, flashcards and a full offence reference —
built by a serving Met officer for recruits sitting AP1 to AP4.
```

### Keywords (100 characters, comma separated, NO spaces after commas)

```
police,pcep,dcep,constable,met,recruit,exam,ap1,ap2,ap3,ap4,revision,law,hendon,offences,powers
```

That is 96 characters. Don't repeat words already in the app name or subtitle —
Apple indexes those separately, so "prep", "revision" and "police" in the title
fields already count.

### Description (4000 char max)

```
Prep a Constable is a revision app for Metropolitan Police recruits preparing
for the Police Constable Entry Programme and Detective Constable Entry
Programme assessments — AP1, AP2, AP3 and AP4.

It was built by a serving police constable who sat these exams, from the
material actually taught at Hendon.

WHAT'S INSIDE

• 885 exam-style questions across 35 topics, each with a full explanation
• Mock exams scoped strictly to each Assessment Point's topic list, under
  timed exam conditions with no feedback until you submit
• 333 flashcards with a "got it / again" deck that keeps bringing back the
  cards you keep missing
• Verbal drills — deliver the caution, GOWISELY and the drink-drive procedure
  out loud into the microphone and see word-for-word what you missed
• Constable Companion — an operational reference of 151 offences and 24 powers
  with points to prove, penalties and the section that creates them
• 40 mnemonics and the key case law, in one place
• Spaced repetition that brings questions back just before you'd forget them
• Topic mastery tracked in the order you're actually taught at Hendon
• Record your real assessment results alongside your practice scores

HOW IT'S BUILT

Your progress is saved on your device and syncs across your devices when you
sign in. Sign-in is by email link — there's no password to forget. You can use
the whole app without an account if you'd rather not have one.

Every offence, power and penalty comes from the material taught on the course.
Nothing is invented.

THIS IS A ONE-OFF PURCHASE

£6.99, once. There is no subscription, nothing renews, and there are no
in-app purchases.

Prep a Constable is an independent study aid. It is not produced, endorsed or
approved by the Metropolitan Police Service or the College of Policing.
```

That last paragraph matters. Without it, a reviewer can read the app as
claiming official status, which is a rejection under guideline 5.2.
It is also simply true.

### URLs

| Field | What to put |
|---|---|
| Privacy Policy URL | **Required.** Host the policy from `shared/content/legal.js` as a web page — your Netlify site can serve it |
| Support URL | **Required.** A page with a contact email is enough |
| Marketing URL | Optional, leave blank |

---

## App Privacy questionnaire

Answer it like this. Apple checks these against what the app actually does, and
a wrong answer here is worse than a strict one.

### Data you collect

**Contact Info → Email Address**
- Collected: **Yes**
- Linked to the user: **Yes**
- Used for tracking: **No**
- Purpose: **App Functionality** (sign-in and syncing progress)

**User Content → Other User Content** — your answers, streaks and mock history
- Collected: **Yes**
- Linked to the user: **Yes**
- Used for tracking: **No**
- Purpose: **App Functionality**

### Data you do NOT collect — say No to all of these

Location · Contacts · Health & Fitness · Financial Info · Browsing History ·
Search History · Identifiers · Usage Data · Diagnostics · Purchases ·
Sensitive Info · Photos or Videos · **Audio Data**

**Audio Data is a No, and that is correct.** The microphone is used only during
a Verbal Drill; the phone's own recogniser turns speech into text on the
device, no audio is recorded, stored or transmitted, and the transcript is
discarded when you leave the drill. Apple only wants "Yes" for data that leaves
the device.

### Tracking

- Do you track users? **No**
- No App Tracking Transparency prompt needed.

---

## Age rating questionnaire

Answer honestly — the content is criminal law, so some of these are not "None".

| Question | Answer |
|---|---|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Prolonged Graphic or Sadistic Realistic Violence | None |
| Profanity or Crude Humor | None |
| Mature/Suggestive Themes | **Infrequent/Mild** — sexual offences law, consent |
| Horror/Fear Themes | None |
| Medical/Treatment Information | None |
| Alcohol, Tobacco, or Drug Use or References | **Infrequent/Mild** — Misuse of Drugs Act, drink-driving |
| Simulated Gambling | None |
| Sexual Content or Nudity | None |
| Unrestricted Web Access | No |
| Gambling and Contests | No |

That should land at **12+**. If it comes out higher, it is not a problem — your
audience is adult police recruits.

---

## App Review Information

This is the free-text box reviewers actually read. Paste this in:

```
Prep a Constable is a study aid for UK police recruits sitting the Police
Constable Entry Programme assessments.

SIGN-IN: you do not need an account. Tap "Continue without an account" on the
first screen to reach the whole app. If you would like to test the email
sign-in instead, enter any email address and you will be sent a one-time link.

MICROPHONE: the microphone is used in one place only — Home > Verbal Drills >
any drill > the microphone button. It is used so the officer can practise
saying the police caution out loud and have it marked word-for-word against
the correct wording. Speech is converted to text by the device's own
recogniser. No audio is recorded, stored or transmitted, and the transcript is
discarded when the drill is closed. Every drill can also be completed by
typing, using the "Type it instead" link, if you would prefer not to grant
microphone access.

ACCOUNT DELETION: Profile tab > Delete account.

This app is an independent study aid. It is not produced, endorsed or approved
by the Metropolitan Police Service or the College of Policing.
```

Add your name and a contact phone number and email in the fields above that box.

---

## Screenshots

Eleven are in `docs/store-screenshots/`, at **1320 × 2868** — Apple's 6.9-inch
iPhone size. You need a minimum of three; ten is the maximum, so drop one.

Suggested order, strongest first:

1. `01-home` — the shield, the skyline, the whole app at a glance
2. `03-mock-tests` — AP1 to AP4
3. `04-mock-question` — exam conditions, the timer running
4. `11-constable-companion` — the operational reference
5. `08-caution-mic` — the verbal drill, which nothing else in this market has
6. `02-exam-prep` — progress tracking
7. `05-topics` — the breadth of the syllabus
8. `09-flashcards`
9. `10-reference` — mnemonics and case law
10. `06-topic` — lessons inside a topic

**Retake these from the real device before you submit.** They were rendered by
the app's own code in a browser at exactly the right pixel size, so the layout
and content are right, but iOS draws text slightly differently and Apple expects
screenshots taken from the app in use. Once you have the TestFlight build on
your phone, screenshot these same eleven screens and swap them in.

---

## Before you hit Submit

- [ ] Supabase: Authentication → Providers → **enable Email**
- [ ] Supabase: Authentication → URL Configuration → add `prepaconstable://`
- [ ] Privacy policy live at a public URL, and that URL pasted into App Store Connect
- [ ] Support URL live
- [ ] Sign in with a real email on the TestFlight build and confirm the link opens the app
- [ ] Sit one full mock on the phone and check the timer and the result
- [ ] Say the caution into the microphone and check it scores
- [ ] Delete the account from Profile and confirm it actually goes
- [ ] Screenshots retaken on device
