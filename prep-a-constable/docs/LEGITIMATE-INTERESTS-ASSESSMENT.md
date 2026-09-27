# Legitimate Interests Assessment — app effectiveness statistics

**Controller:** *[to be completed — same name as in `shared/content/legal.js`]*
**Processing assessed:** producing aggregate statistics showing whether the app
improves users' examination performance.
**Date:** 27 September 2026. **Review:** annually, or on any change to what is measured.

Relying on legitimate interests (Article 6(1)(f) UK General Data Protection
Regulation) requires this three-part assessment to be carried out and recorded.
This is that record. It is not legal advice and should be reviewed by a
qualified practitioner.

---

## 1. Purpose test — is there a legitimate interest?

**The interest.** To know whether the app actually helps people pass police entry
examinations, and to find the parts that do not work.

**Why it matters.** The app is sold on the promise that it helps people pass. The
controller has a plain commercial and professional interest in knowing whether
that is true, and users have an interest in the product being improved where it
falls short. Topic-level difficulty figures also surface content that is being
taught badly — which is a quality and accuracy benefit to every user, in an app
whose subject matter is the law police officers will apply operationally.

**Who benefits.** The controller, existing users (improvements), and future users.
No third party benefits and nothing is sold or shared.

**Is it lawful and ethical?** Yes. It is ordinary product measurement, using data
already held for the service itself, with no attempt to identify or judge any
individual.

**Conclusion:** there is a legitimate interest.

---

## 2. Necessity test — is the processing necessary for it?

**Could the purpose be achieved another way?**

| Alternative | Assessment |
|---|---|
| Ask users to volunteer their results | Would produce a badly self-selected sample — the people who pass are far likelier to reply — so it would not answer the question honestly |
| Collect new analytics events | **Worse.** It would mean collecting more data than is collected today, and introducing a tracking SDK into an app that deliberately has none |
| Anonymise before analysis | The data is already only analysed in aggregate and never per person. Irreversibly anonymising the stored data is not possible without destroying the service, because the same records are what the user sees as their own progress |
| Do not measure at all | Leaves the controller unable to say whether a paid product does what it claims |

**What is actually processed.** Only data already collected to provide the service:
answer counts, mock attempt scores, and any real assessment results the user chose
to record. **Nothing additional is collected for this purpose.** No new field, no
event logging, no third-party service.

**Conclusion:** necessary, and it is the least intrusive option available.

---

## 3. Balancing test — does it override the individual's interests?

### Reasonable expectations
A user of a revision app would reasonably expect the provider to know, in general
terms, whether the app is helping people pass. This is not a surprising use. It is
also disclosed plainly in the privacy notice at the point the data is collected.

### Nature of the data
Not special category data. Not financial, not health, not biometric, not location.
Examination performance is mildly sensitive in that nobody wants their weak topics
known — which is precisely why the safeguards below prevent any individual figure
from ever being produced.

### Possible impact on the individual
Low. No decision is made about any individual. No one is contacted, ranked,
scored, profiled or treated differently as a result. The output is a handful of
numbers about a cohort.

### Vulnerable individuals
Users are adults applying to or serving in the police. Children are not the
audience, and the app has none of the features that create risk for them.

### Safeguards applied — these are the reason the balance comes out as it does

1. **Aggregate only.** No function returns a user identifier, name, email or
   single-person row. Enforced in SQL, not by convention.
2. **Minimum cohort of 20.** Any figure covering fewer than 20 people returns
   NULL and is simply not produced, so no number can be narrowed to one person.
3. **Opt-out, honoured in the query.** "Help improve the app" in Profile sets
   `statsOptOut`, and the cohort view excludes those rows before anything is
   counted. Objecting is one tap and takes effect immediately.
4. **No new collection.** The processing adds nothing to what is already stored.
5. **Not reachable by the app.** The functions are revoked from `anon` and
   `authenticated`; only the service role can run them.
6. **No sharing.** Outputs are for the controller. If a figure is ever published
   in marketing it must be one that passed the cohort threshold.

### Right to object
Article 21 gives a right to object to processing based on legitimate interests.
It is offered as a visible control rather than only a sentence in a policy, and
it is absolute in effect here: the row is excluded entirely, with no balancing
exercise applied against the user.

**Conclusion:** the interests of the controller are not overridden by the
interests or rights of individuals, given the safeguards above. Without the
aggregate-only rule, the cohort threshold and the opt-out, the assessment would
be far less comfortable — those three are load-bearing, not decoration.

---

## Outcome

Legitimate interests is an appropriate lawful basis for this processing **as
specified above**. If any of the following changes, this assessment must be
redone before the change ships:

- any output that identifies, or could identify, an individual
- lowering or removing the minimum cohort size
- removing or weakening the opt-out
- collecting anything additional for this purpose
- using the results to make decisions about individual users
- sharing the underlying data with anyone

**Outstanding:** complete the controller name above, and have this reviewed by a
qualified UK data protection practitioner alongside the main audit.
