# Project TA — Competitor & Market Research

**Prepared for:** Ismail Mansur
**Date:** 28 August 2026
**Subject:** On-demand, chat-based tutoring marketplace for UK GCSE / A-level students

---

## 1. Executive summary

Your idea — a student posts a question, pays for a fixed block of time (e.g. 15 minutes),
every tutor on the platform gets a push notification showing **the fee, the topic and the
duration**, and the first suitable tutor to accept starts a chat + whiteboard session — is
a well-understood model. It has been tried, it has worked at scale, and several of the
best-funded attempts are now dead.

That is not a reason to abandon it. It is a reason to build it differently. Here is the
short version of what the research says:

1. **The model works when the unit is a question, not an hour.** Snapask reached ~3.2m
   students and ~350,000 tutors across eight Asian markets on exactly this mechanic.
2. **It dies when tutor pay is too low.** Yup raised $23.5m and shut down; the most cited
   reason is that it paid tutors roughly $10/hour, so it could never hold onto graduates
   with strong maths. Your model must survive its own tutor churn.
3. **The "answers" market has been destroyed by AI.** Chegg went from a $14.7bn market cap
   to roughly $115m and cut 45% of staff in October 2025. If Project TA competes on
   *getting the answer*, free AI wins on day one.
4. **Therefore the defensible product is not answers — it is a verified human, right now,
   who will not just give the answer.** That is the one thing ChatGPT does not sell and
   Chegg lost.
5. **In the UK, under-18 safeguarding is the moat.** UK GDPR, the ICO Children's Code and
   the Online Safety Act 2023 make an adult-to-child chat app genuinely hard to launch
   legally. That is a cost — but it is also a barrier that stops a solo developer copying
   you in a weekend, and it is the thing parents actually pay for.

**The single biggest strategic risk in your current plan:** paying a flat fee for 15
minutes of an undergraduate's time, in a market where the answer is free, to an audience
of teenagers who mostly do not control a payment card. Sections 8–10 deal with this
head-on.

---

## 2. Market context

| Metric | Figure | Source |
|---|---|---|
| UK K-12 online tutoring market growth, 2025–2030 | +USD ~15.96bn, 17.2% CAGR | Technavio / Research and Markets |
| Global edtech venture funding, 2021 | $5.8bn | Pertama Ventures |
| Global edtech venture funding, 2023 | $712m (−87%) | Pertama Ventures |
| Chegg market cap, Feb 2021 | $14.7bn ($115/share) | Entrepreneur |
| Chegg market cap, 2026 | ~$115m (~$1.02/share) | Entrepreneur |
| Chegg subscribers, Q1 2025 | 3.2m, −31% YoY; revenue −30% to $121m | Entrepreneur |

**Read this as:** the demand side is growing fast and is real. The *funding* side is not
what it was in 2021, so a venture-scale raise on "Uber for tutoring" alone is unlikely.
Build something that is profitable small before it is big.

---

## 3. The graveyard — read this before you build anything

### Yup (formerly MathCrunch) — the closest thing to your exact idea, and it is dead

- On-demand, **chat-based**, 24/7 maths tutoring, grades 3–12. Whiteboard + chat, no video.
- Raised **$23.5m** across 4 rounds from 12 investors.
- **App and website shut down by February 2025.** Not acquired — ceased operations.
- The most commonly cited cause: **tutor pay around $10/hour**. As one review put it, it is
  hard to see why someone with a maths degree works for that.

**What this means for you:** your notification says "you will earn £X". If £X is not
competitive with a bar shift, your supply side evaporates at exactly the moment your demand
side arrives. Tutor pay is not a cost line to minimise — it is the product.

### Snapask — proved the mechanic, then went quiet

- Hong Kong, "Uber for tutoring". Student photographs a question; the algorithm alerts
  suitably qualified tutors; **the fastest to respond (often under 5 seconds) gets the job**
  and opens a 1:1 chat.
- Reached **3.2m students / 350,000 tutors** across HK, Taiwan, Japan, South Korea,
  Thailand, Malaysia, Singapore, Indonesia. Raised **$56.8m**, including a $35m round in 2020.
- Monetised by **subscription** (a bundle of questions per month), not pay-per-question.
- Reported to have **gone dark around 2022** as pandemic growth reversed and edtech funding
  collapsed.

**What this means for you:** the fastest-finger-first mechanic works and is proven at scale.
But Snapask sold a *subscription*, which smooths revenue and improves retention — a lesson
your pay-per-15-minutes model should absorb (see §9).

### Chegg — what happens when you sell answers

- Near-monopoly on homework answers; now "a commodity player".
- 636+ roles eliminated in 2025 (22% in May, a further 45% in October). Pivoted away from
  academic homework help entirely.
- CheggMate, its own AI, failed to stop the bleed.

**What this means for you:** do not build an answer engine. Build a *teaching* engine.

---

## 4. Competitor deep dives

### 4A. On-demand chat / question-based (your direct category)

**Snapask** — see above. Subscription credits, photo-a-question, sub-5-second tutor claim,
in-app messaging. Multi-market Asia. Now largely inactive.

**Yup** — see above. Chat + whiteboard, 24/7, maths-focused, subscription and school
contracts. Dead as of Feb 2025.

**UPchieve** — free, 24/7, **chat + whiteboard**, for eligible low-income US high schoolers.
Tutors are **unpaid volunteers**; students pay nothing, no commission. Sustained by school
partnership fees of roughly **$10,000 per school per year**.
*Relevance to you:* proves the chat+whiteboard UX for exactly your age group, and proves the
B2B2C funding route. Their product is your product with the money moved to the school.

**Studypool / 24HourAnswers / Brainly / Numerade** — pay-per-question or freemium Q&A.
Brainly is peer-answered and ad/subscription funded. All are being squeezed by free AI.

### 4B. On-demand live-session platforms

**Tutor.com** (The Princeton Review) — 24/7 on-demand across many subjects, real-time
**interactive whiteboard**, aimed at last-minute homework and exam prep. **$29–$40/hour**
depending on subscription vs one-off package and monthly volume. Huge institutional/library
distribution.

**TutorMe** (Pearson) — "Lesson Space" virtual classroom: whiteboard, text editor, screen
share, video/audio chat. Plans from **$26/hour**. Now largely a Pearson institutional channel.

**Skooli** — on-demand K-12 and college, virtual classroom with video, chat and interactive
whiteboard; students connect **in minutes**. **Pay-per-minute at roughly $0.82/min (~$49/hr)**,
with discounted prepaid packages.
*Relevance to you:* Skooli is the clearest precedent for per-minute billing. Your 15-minute
block at, say, £6 works out at £24/hour — materially cheaper than Skooli and Tutor.com.

**Varsity Tutors (Nerdy)** — instant tutoring plus classes. Notable for its economics:
students billed around **$65–95/hour** while tutors earn roughly **$11–20/hour** — a take
rate approaching **70%**. Managed marketplace, tutors do not set rates.

**Paper** — district-funded unlimited on-demand tutoring; sells to schools, not students.

### 4C. Scheduled marketplaces (the mainstream UK model)

**MyTutor** — 5,000+ tutors from 60 top universities; founded 2013. **Undergraduate tutors
are its entire supply model** — exactly your plan. **Mandatory DBS checks.** Published
safeguarding and online-safety policies (worth copying the structure of).

**Tutorful** — UK marketplace, **mandatory DBS**.

**Sherpa** — UK GCSE/A-level focus, **350,000+ 1:1 lessons delivered**, 4.8★ from 40,000+
parents, lessons **from £20/hour**, iOS and Android apps shipped. Claims average improvement
of 2.2 grades. **This is your most relevant live UK competitor**, though it is
booking-based rather than instant.

**GoStudent** — pan-European, subscription lesson packages, heavy paid acquisition,
**mandatory DBS**.

**Wyzant** — tutors set rates ($25–60 typical), **flat 25% platform commission** since Jan 2019.

**Preply** — tutors set rates ($10–40 typical), **tiered commission: ~33% on first hours with
a new student, falling to ~18–22%** for high-volume tutors.

**Superprof / First Tutors / TutorExtra** — DBS **recommended but not required**. This is the
low-trust end of the UK market and it is where your safeguarding story wins.

**Tutorpeers** — peer-to-peer tutoring, **free to $25 per 30 minutes**. Closest to your
"undergrads teaching school students" positioning on price.

### 4D. School-funded

**Third Space Learning** — UK's largest online maths tutoring company for schools. Flat
school licence **$5,000–15,000/year** based on school size, free pilots, district rollouts.
Raised $16.3m.
*Relevance:* if consumer pay-per-question proves hard (it will be, see §8), this is the
proven UK escape hatch.

### 4E. AI-first (your real competition for a student's first instinct)

**Photomath, Gauth, Question.AI, Numerade, Brainly, Khanmigo — and simply ChatGPT/Claude.**
Free or near-free, instant, no waiting for a human to accept, available at 2am. In 2026 the
homework space is described as crowded and commoditised.

**The uncomfortable truth:** for "what's the answer to Q7", you cannot win. For "I have a
mock on Thursday, I don't understand why we integrate by parts here, and I've been staring
at this for 40 minutes" — a real person who has recently sat the same exam wins easily.
Position Project TA at the second thing.

---

## 5. Feature matrix

| Feature | Snapask | Yup | UPchieve | Tutor.com | Skooli | MyTutor | Sherpa | Wyzant | **Project TA (proposed)** |
|---|---|---|---|---|---|---|---|---|---|
| Instant match (no booking) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Text chat session | ✅ | ✅ | ✅ | ✅ | ✅ | ➖ | ➖ | ➖ | ✅ |
| Shared whiteboard | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Video required | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ (deliberate) |
| Photo-a-question intake | ✅ | ✅ | ➖ | ➖ | ➖ | ❌ | ❌ | ❌ | ✅ |
| Tutor sees fee before accepting | ✅ | ➖ | n/a | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ **headline** |
| Pay per short block | ➖ | ❌ | free | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Subscription option | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (recommended) |
| Undergraduate tutor supply | ✅ | ➖ | ✅ | ❌ | ❌ | ✅ | ➖ | ➖ | ✅ |
| Mandatory DBS | n/a | n/a | US | US | US | ✅ | ✅ | ❌ | ✅ |
| Session transcript kept for safeguarding | ➖ | ➖ | ✅ | ✅ | ➖ | ✅ | ✅ | ❌ | ✅ **required** |
| Parent visibility | ❌ | ➖ | ❌ | ➖ | ➖ | ✅ | ✅ | ➖ | ✅ |
| School / B2B channel | ➖ | ✅ | ✅ | ✅ | ➖ | ✅ | ➖ | ❌ | Phase 3 |

✅ yes ➖ partial/unclear ❌ no

---

## 6. Pricing and take-rate benchmarks

| Platform | Student pays | Tutor receives | Platform take |
|---|---|---|---|
| Varsity Tutors | $65–95/hr | $11–20/hr | **~70%** |
| Preply | tutor-set $10–40/hr | 67–82% of rate | **18–33% tiered** |
| Wyzant | tutor-set $25–60/hr | 75% of rate | **25% flat** |
| Skooli | ~$0.82/min (~$49/hr) | undisclosed | — |
| Tutor.com | $29–40/hr | ~$11–15/hr reported | high |
| TutorMe | from $26/hr | undisclosed | — |
| Sherpa (UK) | from **£20/hr** | undisclosed | — |
| Tutorpeers | free–$25/30min | — | — |
| Yup (dead) | subscription | **~$10/hr** | fatal |
| **Project TA (recommended)** | **£6 / 15 min (£24/hr)** | **£4 / 15 min (£16/hr)** | **~33%** |

Notes on the recommendation:
- **£16/hour effective to the tutor** beats a typical UK undergraduate's alternative
  (retail/hospitality at roughly £11–12) without being so high that your margin dies.
- **£6 for 15 minutes** is an impulse purchase — under the psychological threshold where a
  teenager has to ask a parent, and cheaper per hour than every UK competitor listed.
- **~33% take rate** sits between Wyzant's 25% and Preply's opening 33%. It is defensible.
- After payment processing (~1.5% + 20p on UK cards) and the fact that a 15-minute session
  carries the same fixed cost as an hour, **your gross margin on a single £6 session is
  roughly £1.80.** This is why §9 argues for credit packs, not single sessions.

---

## 7. What will make Project TA stand out

Ranked by how defensible each one is.

### Tier 1 — genuinely differentiating

**1. The tutor sees the money before they accept.**
No competitor does this in the notification itself. Wyzant, Preply and Varsity all hide the
economics behind a booking flow; Varsity hides them because they are bad. Your notification
— *"£4.00 · A-level Maths · Integration by parts · 15 min"* — is a **transparency
proposition to the supply side**, and supply is the harder side of this marketplace to win.
Make it the marketing line for tutor recruitment. It is your Uber-driver-sees-the-fare moment.

**2. "We will not just give you the answer."**
Free AI gives answers instantly. Your wedge is the opposite promise: a tutor who works
*with* the student. Enforce it as product, not a slogan — a tutor rating dimension for
"did they help you understand it, or just tell you", and a visible pledge in the session
UI. Parents pay for this; ChatGPT cannot sell it.

**3. Safeguarding as a visible feature, not buried policy.**
The UK press is actively campaigning on the tutoring safeguarding loophole — the NSPCC, the
NEU, the Tutors' Association and the Children's Commissioner for England, Dame Rachel de
Souza, have all called for mandatory DBS for private tutors ("an absolute basic minimum").
Superprof, First Tutors and TutorExtra still only *recommend* DBS. If your landing page
says **every tutor DBS-checked, every session transcript retained and reviewable by a
parent, no private contact details ever exchanged**, you are on the right side of the story
that is coming. This is also the single strongest thing you can put in front of a parent
with a debit card.

**4. Text-first, camera-off.**
Every "premium" competitor pushes video. For a 15-year-old at 9pm who is embarrassed not to
understand something, **not having to show their face or their bedroom is a feature**.
Yup, Snapask and UPchieve all worked this way. It also cuts your infrastructure cost to
near zero versus WebRTC, and it makes safeguarding review trivial because text is
searchable and video is not.

**5. Exam-board-native.**
"A-level Maths" is not specific enough. AQA, Edexcel, OCR and WJEC differ, and a student
revising Edexcel Further Maths wants a tutor who sat Edexcel Further Maths. No on-demand
platform routes on exam board. This is cheap to build and immediately obvious in quality.

### Tier 2 — worth doing, easier to copy

6. **Photo-a-question intake** — Snapask's core loop; lowers the effort of asking to near zero.
7. **Session replay** — the whiteboard and transcript saved to the student's account, so
   £6 buys a permanent revision asset rather than 15 disappearing minutes.
8. **Sub-60-second match guarantee, or the credit is refunded.** Turns your biggest
   operational risk into a marketing promise.
9. **Same tutor again** — let a student re-request a tutor who helped. Retention, and it
   softens the marketplace's disintermediation risk.
10. **Tutor "office hours"** — tutors declare when they are online, so you can predict
    coverage instead of hoping.

### Tier 3 — do NOT do these yet

- Video. Doubles your build and your safeguarding burden for marginal gain.
- Your own AI answer bot. You will lose to ChatGPT and dilute the human proposition.
- Every subject at once. Launch on **Maths + the three sciences**, GCSE and A-level only.
- Scheduled bookings. That is Sherpa's and MyTutor's game and they are years ahead.

---

## 8. The UK regulatory reality (do not skip this)

Your users are mostly under 18. That changes what you are legally building.

**DBS checks.** Private 1:1 tutoring is **not** "regulated activity" under the Safeguarding
Vulnerable Groups Act 2006, so enhanced DBS is not automatically a legal requirement for a
self-employed tutor. **However**, the Act does require platforms to carry out enhanced DBS
and barred-list checks on tutors working **unsupervised with under-18s** — which is what
your product is. MyTutor, Tutorful and GoStudent all treat it as mandatory. So should you.
Budget roughly £40–60 and 2–8 weeks per tutor, and decide who pays. *This is the main
reason you cannot onboard "anyone" as a tutor, which differs from your original sketch.*

**ICO Children's Code (Age Appropriate Design Code).** If your service is likely to be
accessed by children, you **must** complete a **DPIA** before launch, apply data
minimisation, default to high privacy, and match your **age assurance** to the level of risk
(low/medium/high — full ID verification is not required for every service). The ICO updated
its children's data guidance on **15 May 2026**.

**Online Safety Act 2023.** A platform where users message each other is a **user-to-user
service**. Ofcom and the ICO published a **joint statement on age assurance on 25 March
2026** setting common expectations for services likely to be accessed by children. You will
need risk assessments, reporting and complaints mechanisms, and content moderation — which,
conveniently, is what your complaints page and transcript retention already give you.

**Practical implications for the build:**
- A **complaints/report button inside every session**, not just a page in the footer.
- **Transcripts retained** and reviewable — this is a safeguarding control, and you must say
  so plainly in the privacy policy.
- **Block contact-detail exchange** (phone numbers, socials, emails, meeting links) in chat,
  automatically. Every serious UK platform does this.
- **Parent/guardian account linkage** and a lawful basis for processing a child's data.
- A named **Designated Safeguarding Lead** — at your stage, that is you or your cousin, with
  training, and it needs to be a real person with a real inbox.

Treat this section as a build requirement, not paperwork. It is roughly 20% of your
engineering effort and 100% of your credibility with parents and schools.

---

## 9. Unit economics — the honest maths

At **£6 per 15-minute session, £4 to the tutor**:

| Line | Per session |
|---|---|
| Student pays | £6.00 |
| Tutor payout | −£4.00 |
| Card processing (~1.5% + 20p) | −£0.29 |
| Payout fee (Stripe Connect, amortised) | −£0.10 |
| **Contribution** | **~£1.61** |

To cover a £2,000/month cost base you need roughly **1,250 sessions a month** — about
**42 a day**. That is achievable, but only with retention: a student who asks one question
and leaves has a customer acquisition cost you will never recover (UK edtech paid
acquisition typically runs £15–40 per paying user).

**Three fixes, in order of impact:**

1. **Sell credit packs, not single sessions.** £25 for 5 sessions, £45 for 10. Cash up
   front, higher lifetime value, and it is what Snapask, Tutor.com and Skooli all
   converged on. Keep the single £6 session as the trial.
2. **Charge the parent, not the student.** Under-18s rarely hold a card. Build the parent
   account as a first-class object — parent tops up, student spends, parent sees the
   transcripts. This solves payment *and* safeguarding in one move.
3. **Have a B2B plan.** UPchieve at ~$10k/school/year and Third Space Learning at
   $5,000–15,000/school/year both show UK/US schools will fund exactly this. One school
   contract equals hundreds of consumer sessions with a fraction of the support burden.

---

## 10. Cold-start plan

The marketplace chicken-and-egg is your hardest problem, not the code.

- **Weeks 1–4 — supply first, one university, one subject.** Recruit 20–30 undergraduate
  maths/science tutors from your own university. Pay them a **guaranteed hourly rate to sit
  online** during a fixed evening window (7–10pm, Sun–Thu) regardless of session volume.
  This is expensive and correct: it buys you a match-time guarantee.
- **Weeks 3–8 — demand, narrow.** Target one or two local secondary schools' parent groups
  and sixth forms. Launch during a revision crunch — **the run-up to mocks in November and
  to summer exams in April/May** is when demand for instant help peaks.
- **Measure two numbers only:** median time-to-match, and repeat-purchase rate within 14
  days. If time-to-match goes over 3 minutes, buy more supply. If repeat purchase is under
  25%, the product is not working and no amount of marketing fixes it.
- **Do not expand subjects or cities until both numbers are healthy.**

---

## 11. Key risks

| Risk | Severity | Mitigation |
|---|---|---|
| Free AI absorbs the "quick question" use case | **High** | Position on understanding, not answers; exam-board specificity; human accountability |
| Tutor supply churns at £16/hr | **High** | Guaranteed-online payments early; transparent fee in notification; fast payouts |
| Empty-marketplace death spiral at 2am | **High** | Fixed evening coverage windows; refund the credit if unmatched in 60s |
| DBS cost and 2–8 week lag throttles onboarding | Medium | Start tutor recruitment before the app is finished; consider paying for the check |
| Safeguarding incident | **Critical** | Transcript retention, contact-detail blocking, in-session reporting, named DSL, DPIA |
| Disintermediation (tutor and student go direct) | Medium | Contact-blocking, "same tutor again" feature, keep the take rate fair |
| Chargebacks / disputes on a 15-min session | Medium | Credits not cash refunds; clear complaints SLA; transcript as evidence |

---

## 12. Recommendation

Build the product you described, with **five changes**:

1. Tutors are **vetted undergraduates with DBS checks**, not "anyone".
2. **Parents pay and can see transcripts**; students spend credits.
3. Sell **credit packs**; the £6 single session is the trial, not the business.
4. Launch **Maths + Physics/Chemistry/Biology, GCSE and A-level, routed by exam board**, in
   one city, on one evening window.
5. Make **safeguarding and fee transparency the marketing**, because they are the two
   things every incumbent is either bad at or hiding.

The mechanic is proven. The graveyard is full of companies that got the mechanic right and
the economics wrong. Get the economics right first and the app is the easy part.

---

## Sources

- ProProfs — Best Tutoring Software Platforms 2026 — https://www.proprofstraining.com/blog/best-tutoring-software/
- Research.com — Best Online Tutoring Platforms 2026 — https://research.com/software/best-online-tutoring-platforms
- Wiingy — Best Online Tutoring Services 2026 — https://wiingy.com/blog/best-online-tutoring-services/
- Wiingy — Wyzant vs Varsity Tutors 2026 — https://wiingy.com/blog/wyzant-vs-varsity-tutors/
- Tutorpeers — https://tutorpeers.com/
- Dealroom — Snapask — https://app.dealroom.co/companies/snapask_hk
- CNBC — Snapask "Uber for tutoring" — https://www.cnbc.com/2019/07/29/snapasks-timothy-yu-on-creating-the-uber-for-tutoring-in-asia.html
- TechCrunch — Snapask $35m round — https://techcrunch.com/2020/02/25/on-demand-tutoring-app-snapask-gets-35-million-to-expand-in-southeast-asia
- Hive Life — Snapask — https://hivelife.com/snapask/
- Pertama Ventures — Why Most EdTech Tutoring Startups Fail — https://pertamaventures.com/insights/edtech-tutoring-startups-sea
- Wikipedia — Yup Technologies — https://en.wikipedia.org/wiki/Yup_Technologies
- SideHusl — Yup: Alternatives to This Defunct Tutoring Platform — https://sidehusl.com/yup/
- Tracxn — Yup — https://tracxn.com/d/companies/yup/__eo3dF-x42gs2gBTZpBUiUWrwSB1xtsnluHxQvZtcOqk
- MyEngineeringBuddy — UPchieve Review 2026 — https://www.myengineeringbuddy.com/blog/upchieve-reviews-alternatives-pricing-offerings/
- Steal What Works — We Compared the Features of 103 Tutoring Apps — https://stealwhatworks.com/blogs/news/tutoring-app-features
- Entrepreneur — Chegg wiped out by AI — https://www.entrepreneur.com/business-news/this-14-billion-business-is-wiped-out-by-ai
- Technavio — UK K-12 Online Tutoring Market 2026-2030 — https://www.technavio.com/report/k-12-online-tutoring-market-in-uk-industry-analysis
- Research and Markets — UK K-12 Online Tutoring Market — https://www.researchandmarkets.com/report/united-kingdom-k-12-online-tutoring-market
- StudyGuru — Best Online Tutoring Platforms UK 2026 — https://www.studyguru.co.uk/best-online-tutoring-platforms
- TutorChase — Top 10 Tutoring Websites in the UK 2026 — https://www.tutorchase.com/blog/top-tutoring-websites-in-uk
- Sherpa Online — https://sherpa-online.com/ and https://sherpa-online.com/becomeatutor
- Lilach Bullock — What Preply, Cambly and Wyzant Pay in 2026 — https://www.lilachbullock.com/are-online-tutoring-jobs-legitimate-pay/
- Supatutor — Wyzant Review for Tutors 2026 — https://supatutor.in/wyzant-review-for-tutors/
- Wealthvieu — How Much Do Online Tutors Make in 2026 — https://wealthvieu.com/personal-finance/side-hustles/online-tutoring-income-guide/
- PrepMaven — Wyzant vs Varsity Tutors — https://prepmaven.com/blog/test-prep/wyzant-vs-varsity-tutors/
- MyTutor — Safeguarding Policy — https://www.mytutor.co.uk/safeguarding-policy/
- MyTutor — Online Safety Policies — https://www.mytutor.co.uk/online-safety/
- Tutes4u — Safeguarding & Regulations for Online Tutoring UK: DBS, GDPR & Legal Guide 2026 — https://www.tutes4u.co.uk/blog/online-tutoring-uk-complete-guide/safeguarding-regulations
- TutorExtra — UK Tutoring Platforms: DBS, Safeguarding & Fees Report 2025 — https://tutorextra.co.uk/articles/uk-tutoring-platforms-dbs-safeguarding-fees-report-2025/392
- Personnel Checks — Tutoring Safeguarding Loophole — https://www.personnelchecks.co.uk/latest-news/tutoring-safeguarding-loophole-why-regulation-is-urgently-needed
- ICO — Children's Code strategy — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/protecting-childrens-privacy-online-our-childrens-code-strategy/
- Covington Inside Privacy — Ofcom and ICO Joint Statement on Age Assurance — https://www.insideprivacy.com/online-safety/ofcom-and-ico-issue-joint-statement-on-age-assurance/
- Lewis Silkin — Age Assurance in 2026 — https://www.lewissilkin.com/en/insights/2026/04/17/age-assurance-in-2026-what-do-digital-businesses-operating-in-the-uk-and-eu-need-to-know
- A&O Shearman — ICO updates guidance on using children's information — https://www.aoshearman.com/en/insights/ao-shearman-on-data/ico-updates-guidance-on-using-childrens-information
- Third Space Learning — Pricing — https://thirdspacelearning.com/us/pricing/
- Tracxn — Third Space Learning — https://tracxn.com/d/companies/thirdspacelearning/__TlJ4fcDX1gnVrNVTu_7ADVMEtGmaJLt0NEfGil2PKSg
