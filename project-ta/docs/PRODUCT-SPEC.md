# Project TA — Product Specification

**Version:** 1.0 · 28 August 2026
**Owners:** Ismail Mansur and cousin
**Market:** UK, GCSE and A-level, students mostly aged 14–18

---

## 1. The product in one paragraph

A student is stuck on a question at 9pm. They open Project TA, pick their subject,
level, exam board and topic, say what is confusing them, and pay £6 for 15 minutes.
Every DBS-checked undergraduate tutor approved for that subject and level is
notified instantly, and the notification shows **what they will earn, the topic, and
how long the session is**. The first tutor to accept opens a chat and a shared
whiteboard with the student. When the time runs out, the student can buy more. The
transcript and whiteboard are saved as revision notes.

## 2. What makes it different

Ranked by defensibility. Derived from `COMPETITOR-RESEARCH.md`.

| # | Differentiator | Why it holds |
|---|---|---|
| 1 | **Fee shown to tutors before they accept** | No competitor does this. Supply is the harder side of this marketplace; this is the recruitment pitch. |
| 2 | **"We won't just give you the answer"** | The one thing free AI cannot sell. Enforced as a rated metric, not a slogan. |
| 3 | **Safeguarding as a visible feature** | Regulatory pressure is rising; it is what a parent with a debit card actually buys. |
| 4 | **Text-first, camera-off** | Lower embarrassment for teenagers, near-zero infra cost, far easier to review. |
| 5 | **Exam-board-native routing** | AQA ≠ Edexcel ≠ OCR ≠ WJEC. Cheap to build, immediately obvious in quality. |
| 6 | Photo-a-question intake | Snapask's core loop; makes asking nearly effortless. |
| 7 | Session replay saved to the account | £6 buys a permanent artefact, not 15 vanished minutes. |
| 8 | 60-second match promise, or refund | Turns the biggest operational risk into a marketing line. |

## 3. Roles

| Role | Can do |
|---|---|
| **Student** | Ask questions, spend credit, join sessions, rate tutors, report. |
| **Parent/guardian** | Hold the payment method, top up credit, read their child's transcripts. Required on under-16 accounts. |
| **Tutor** | Go online, see the board, accept questions, run sessions, see earnings. Blocked until DBS clears. |
| **Admin / DSL** | Read flagged transcripts, suspend tutors, resolve complaints, make referrals. |

## 4. Screens

### Public
`/` landing · `/how-it-works` · `/pricing` · `/tutors` and `/tutors/[id]` ·
`/faqs` · `/research` · `/safeguarding` · `/privacy` · `/terms` · `/cookies` ·
`/complaints` · `/become-a-tutor`

### Student
- `/ask` — subject → level → exam board → topic → detail → optional photo → duration → confirm.
- `/waiting/[id]` — live match screen, elapsed timer, refund promise, cancel.
- `/session/[id]` — chat + whiteboard, countdown, buy more time, report, rate at the end.
- `/pay` — credit packs, mocked card form, balance, transaction history, refund policy.

### Tutor
- `/tutor` — the notification board. Fee-first cards, countdowns, accept.
- `/tutor/earnings` — completed sessions, totals, the published split.

### Still to build
Parent dashboard (`/parent`), admin safeguarding console (`/admin`), session history
(`/sessions`), tutor availability scheduling.

## 5. Core flow — asking a question

```
Student submits
   │  credit HELD (not spent), request status = pending, expires in 3 min
   ▼
Matching: every tutor where
   dbsStatus == "verified"
   AND subject ∈ tutor.subjects
   AND level   ∈ tutor.levels
   │  ranked by: online (+50), same exam board (+30), rating ≥4.8 (+15),
   │             understanding ≥90 (+15), fast responder (+10), volume (≤+10)
   ▼
All eligible tutors notified simultaneously — ranking sets order, not access
   │
   ├── a tutor accepts ──► session created, both parties enter, credit SPENT
   │                        opening system message + the question posted to chat
   │
   └── 3 minutes pass ───► status = expired, credit REFUNDED automatically
```

First-to-accept wins; a second tutor arriving late gets a clear `409 — another
tutor got there first`, verified by test.

## 6. Data model

`packages/shared/src/types.ts` is authoritative. Summary:

| Entity | Key fields |
|---|---|
| `User` | role, displayName, avatarColor; students: level, examBoards, yearGroup, guardianId, isUnder18; tutors: university, degree, subjects, levels, examBoards, dbsStatus, rating, understandingScore, isOnline |
| `HelpRequest` | subject, topic, level, examBoard, detail, photo, durationMins, pricePence, tutorPayoutPence, status, expiresAt, matchedTutorId, sessionId |
| `TutorSession` | requestId, studentId, tutorId, startedAt, endsAt, extensionsMins, status, rating, understandingRating, tutorPayoutPence |
| `Message` | sessionId, senderId, senderRole, kind, body, createdAt, **redacted** |
| `Stroke` | sessionId, authorId, tool, color, width, points (normalised 0..1) |
| `Wallet` | balancePence, transactions[] |
| `Complaint` | category, detail, sessionId, status, **urgent** |
| `TutorApplication` | university, degree, subjects, levels, examBoards, results, motivation, hasDbs, status |

**Money is always integer pence.** Never floats.

## 7. Pricing and unit economics

| | |
|---|---|
| Student pays | **£0.40/min** — £6 / 15 min, £12 / 30 min |
| Tutor receives | **⅔ of it** — £4 / 15 min = **£16/hour** |
| Platform take | **33%**, flat, published, never tiered |
| Credit packs | £6 × 1 · £25 → £30 credit · £45 → £60 credit |

Contribution per single £6 session after card fees is roughly **£1.61**, so a
£2,000/month cost base needs about **1,250 sessions/month (~42/day)**. This is why
credit packs, not single sessions, are the business, and why the parent is the
customer.

**£16/hour is the number that matters.** Yup paid its tutors around £8 and went out
of business. A UK undergraduate's alternative is retail or hospitality at roughly
£11–12.

## 8. Safeguarding design (non-negotiable)

1. **Enhanced DBS with barred-list check** on every tutor before they see any question. Enforced in `isEligible()`, tested.
2. **Every session recorded** — chat and whiteboard, retained 24 months.
3. **Contact details blocked server-side** — phones, emails (including "at"/"dot" obfuscation), social handles, URLs, bare domains, off-platform payment terms. `packages/shared/src/safeguarding.ts`, with its own test suite.
4. **No video.** Text and whiteboard only.
5. **Students pseudonymous to tutors** — first name + initial, year group, level, exam board. Nothing else.
6. **Report button in the session header**, both roles, during and after.
7. **Named DSL**, 24-hour SLA, tutor suspended within 1 hour of a safeguarding report.

### Compliance checklist before real users
- [ ] Data Protection Impact Assessment (required by the Children's Code)
- [ ] ICO registration
- [ ] Online Safety Act children's risk assessment (user-to-user service)
- [ ] Age assurance proportionate to risk (Ofcom/ICO joint statement, March 2026)
- [ ] Named DSL + deputy, both trained
- [ ] DBS umbrella body contract
- [ ] Privacy policy and terms reviewed by an education-law solicitor
- [ ] Public liability and professional indemnity insurance

## 9. Technical architecture

```
                 ┌──────────────────┐
   Web (Next.js) ─┤                  │
                  │   /api/* routes  ├── store.ts ── Netlify Blobs (prod)
 Mobile (Expo)  ──┤   (Next server)  │                in-process map (dev)
                 └────────┬─────────┘
                          │
                 @project-ta/shared
        types · pricing · curriculum · matching · safeguarding
```

- **Polling, not websockets.** Chat 1.5s, whiteboard 1.2s, board 2s, session 5s. Deployable to serverless with nothing to run; swapping to sockets touches `ChatPanel`, `Whiteboard` and `TutorBoardClient`.
- **Whiteboard strokes normalised to 0..1** so a phone and a laptop see the same drawing.
- **One shared package** means pricing cannot drift between web, mobile and server.
- **Auth**: httpOnly cookie on web, `x-pta-user` header on mobile, both resolved in `lib/auth.ts`. Becomes a signed bearer token in production.

## 10. Roadmap

### Phase 1 — make it real (4–6 weeks)
1. Real auth: email + password, parental consent for under-16s, age band at sign-up.
2. Stripe Checkout for credit, Stripe Connect for weekly tutor payouts.
3. Postgres (Supabase) behind the existing `store.ts` interface.
4. Parent dashboard with transcript access.
5. Admin/DSL console: flagged messages, complaints queue, tutor suspension.
6. DPIA and ICO registration.

### Phase 2 — get 30 tutors and one school (6–10 weeks)
7. Tutor onboarding with DBS tracking.
8. Push notifications (Expo, then APNs/FCM).
9. Tutor availability windows, so coverage is predictable rather than hoped for.
10. **Pay tutors a guaranteed hourly rate to sit online 7–10pm Sun–Thu.** Expensive and correct — it buys the match-time guarantee.
11. Launch on one university's undergraduates + one or two local schools, timed to **November mocks**.

### Phase 3 — prove retention before scaling
12. "Same tutor again."
13. Session replay and revision-note export.
14. Referral loop.
15. **Only then** add subjects, and consider a school licence (£5k–15k/year is the going rate).

### Explicitly not now
Video · an in-house AI answer bot · scheduled bookings · more than four subjects · any city beyond the first.

## 11. Metrics

Two numbers decide whether this works:

| Metric | Target | If it misses |
|---|---|---|
| **Median time-to-match** | < 60s in the evening window | Buy more supply. Nothing else matters. |
| **Repeat purchase within 14 days** | > 25% | The product is wrong. Marketing will not fix it. |

Secondary: acceptance rate per notification, understanding score distribution,
refund rate, safeguarding reports per 1,000 sessions (watch the trend, not the
level), tutor churn at 30/60/90 days.

## 12. Open questions for Ismail and cousin

1. **Who is the customer — student or parent?** The spec assumes the parent pays and can see transcripts. That is the safer and more sellable answer, but it changes the sign-up funnel.
2. **Who pays for the DBS check?** £40–60 and 2–8 weeks per tutor. Paying it removes the biggest barrier to supply but costs real money before any revenue.
3. **Is 33% the right take?** It is defensible against Wyzant's 25% and Preply's 33%, but £1.61 contribution per single session is thin. Packs fix it; a higher take would not.
4. **One university or several?** Concentration buys tutor density in one subject at one time of night. Spreading buys nothing early on.
5. **B2C or straight to schools?** UPchieve (~$10k/school/year) and Third Space Learning ($5–15k/school/year) both show UK/US schools will fund exactly this, with far less support burden than consumers.
