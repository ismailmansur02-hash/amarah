import { strict as assert } from "node:assert";
import { test } from "node:test";
import { filterMessage, isLikelyMaths } from "../src/safeguarding.ts";
import { pricePence, tutorPayoutPence, platformFeePence, tutorHourlyPence } from "../src/pricing.ts";
import { isEligible, rankTutors } from "../src/matching.ts";
import type { HelpRequest, User } from "../src/types.ts";

/* ---------------------------------------------------------------- blocking */

const MUST_BLOCK: [string, string][] = [
  ["UK mobile, spaced", "text me on 07700 900123"],
  ["UK mobile, joined", "my number is 07700900123"],
  ["international", "call +44 7700 900123"],
  ["email", "email me at priya.shah@gmail.com"],
  ["obfuscated email", "priya dot shah at gmail dot com"],
  ["email in prose", "Email me at priya.shah@gmail.com or my site is https://example.com/t"],
  ["url", "here's my site https://example.com/tutoring"],
  ["bare www", "go to www.mytutorsite.co.uk"],
  ["bare domain", "find me at mytutorsite.co.uk instead"],
  ["snapchat", "add me on snapchat @priya_maths"],
  ["instagram", "my insta is priya.maths"],
  ["whatsapp", "we could use whatsapp instead"],
  ["discord", "join my discord"],
  ["handle", "I'm @priyamaths everywhere"],
  ["zoom", "let's do zoom.us/j/123456"],
  ["paypal", "just paypal me instead"],
  ["sort code", "my sort code is 20-00-00"],
];

for (const [label, message] of MUST_BLOCK) {
  test(`blocks: ${label}`, () => {
    const result = filterMessage(message);
    assert.equal(result.redacted, true, `should have been redacted: ${message}`);
    assert.ok(
      !/\d{9,}|@\w|https?:|www\./i.test(result.clean.replace(/\[removed[^\]]*\]/g, "")),
      `contact detail survived: ${result.clean}`,
    );
  });
}

/* ------------------------------------------------------------- not blocking */

const MUST_ALLOW: [string, string][] = [
  ["plain help", "I get the outer function but not the middle one"],
  ["short equation", "dy/dx = 3x^2 + 2x"],
  ["integral", "so ∫x·ln(x) dx = ?"],
  ["small numbers", "question 7 part b on page 143"],
  ["a year", "this was on the 2024 paper"],
  ["working", "12 + 34 = 46"],
  ["trig", "sin(2x) = 2 sin x cos x"],
];

for (const [label, message] of MUST_ALLOW) {
  test(`allows: ${label}`, () => {
    assert.equal(filterMessage(message).redacted, false, `wrongly redacted: ${message}`);
  });
}

test("maths relaxation never exempts an email or a link", () => {
  assert.equal(isLikelyMaths("x = 2 and email me at a@b.com"), false);
  assert.equal(isLikelyMaths("dy/dx at www.site.com"), false);
  // The relaxation applies per-rule, so a long line of prose with a number is caught.
  assert.equal(filterMessage("dy/dx = 3x^2, anyway ring me on 07700900123").redacted, true);
});

test("redaction keeps the surrounding words readable", () => {
  const { clean } = filterMessage("Sure, text me on 07700 900123 or add me on snapchat @p_maths ok");
  assert.ok(clean.startsWith("Sure, text me on ["), clean);
  assert.ok(clean.includes("] or add me on ["), clean);
  assert.ok(clean.trim().endsWith("ok"), clean);
});

/* ------------------------------------------------------------------ pricing */

test("pricing arithmetic holds", () => {
  assert.equal(pricePence(15), 600);
  assert.equal(pricePence(30), 1200);
  assert.equal(tutorPayoutPence(15), 400);
  assert.equal(platformFeePence(15), 200);
  assert.equal(tutorPayoutPence(15) + platformFeePence(15), pricePence(15));
  assert.equal(tutorHourlyPence(15), 1600);
});

test("the tutor always keeps two thirds, at every duration", () => {
  for (const mins of [15, 30, 45]) {
    const share = tutorPayoutPence(mins) / pricePence(mins);
    assert.ok(Math.abs(share - 2 / 3) < 0.01, `${mins} min share was ${share}`);
  }
});

/* ----------------------------------------------------------------- matching */

const request: HelpRequest = {
  id: "req_1", studentId: "s1", subject: "maths", topic: "Integration",
  level: "A-level", examBoard: "Edexcel", detail: "help", durationMins: 15,
  pricePence: 600, tutorPayoutPence: 400, status: "pending",
  createdAt: Date.now(), expiresAt: Date.now() + 60_000,
};

const baseTutor: User = {
  id: "t1", role: "tutor", name: "T", displayName: "T.", email: "t@x.com",
  avatarColor: "#000", createdAt: 0, subjects: ["maths"], levels: ["A-level"],
  examBoards: ["Edexcel"], dbsStatus: "verified", isOnline: true, rating: 4.9,
};

test("an un-DBS-checked tutor is never eligible", () => {
  assert.equal(isEligible({ ...baseTutor, dbsStatus: "pending" }, request), false);
  assert.equal(isEligible({ ...baseTutor, dbsStatus: "none" }, request), false);
  assert.equal(isEligible(baseTutor, request), true);
});

test("subject and level must both match", () => {
  assert.equal(isEligible({ ...baseTutor, subjects: ["chemistry"] }, request), false);
  assert.equal(isEligible({ ...baseTutor, levels: ["GCSE"] }, request), false);
});

test("the right exam board ranks above the wrong one", () => {
  const wrongBoard = { ...baseTutor, id: "t2", examBoards: ["AQA" as const] };
  const ranked = rankTutors([wrongBoard, baseTutor], request);
  assert.equal(ranked[0].tutor.id, "t1");
  assert.ok(ranked[0].reasons.includes("sat Edexcel"));
});

test("an offline tutor is still eligible, just ranked lower", () => {
  const offline = { ...baseTutor, id: "t3", isOnline: false };
  const ranked = rankTutors([offline, baseTutor], request);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].tutor.id, "t1");
});
