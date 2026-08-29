import type { Level } from "./types";

/**
 * Pricing lives here so the web app, the mobile app and the API can never disagree
 * about what a student pays or what a tutor earns.
 *
 * Benchmarks that set these numbers (see docs/COMPETITOR-RESEARCH.md):
 *   Sherpa (UK) from £20/hr · Skooli ~£0.65/min · Tutor.com £22-31/hr
 *   Wyzant takes 25% flat · Preply takes 18-33% tiered · Varsity takes ~70%
 * Yup paid tutors ~£8/hr and went out of business, so the tutor share is
 * deliberately generous: an undergraduate must earn more here than in a bar.
 */

/** Platform commission. Sits between Wyzant's 25% and Preply's opening 33%. */
export const TAKE_RATE = 1 / 3;

/** What a student pays per minute of live tutoring, in pence. £0.40/min = £24/hour. */
export const PRICE_PENCE_PER_MIN = 40;

export const DURATION_OPTIONS = [15, 30, 45] as const;
export type Duration = (typeof DURATION_OPTIONS)[number];

/** How long a request stays on the tutor notification board before it expires. */
export const MATCH_WINDOW_SECONDS = 180;

/** If nobody accepts inside this window the student's credits go straight back. */
export const REFUND_PROMISE_SECONDS = 60;

export function pricePence(durationMins: number): number {
  return durationMins * PRICE_PENCE_PER_MIN;
}

export function tutorPayoutPence(durationMins: number): number {
  return Math.round(pricePence(durationMins) * (1 - TAKE_RATE));
}

export function platformFeePence(durationMins: number): number {
  return pricePence(durationMins) - tutorPayoutPence(durationMins);
}

/** Effective hourly rate a tutor earns, in pence — what we show on the tutor page. */
export function tutorHourlyPence(durationMins: number): number {
  return Math.round((tutorPayoutPence(durationMins) / durationMins) * 60);
}

export function formatMoney(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

/** Money with no trailing pence when it is a round pound, for headlines. */
export function formatMoneyShort(pence: number): string {
  return pence % 100 === 0 ? `£${pence / 100}` : formatMoney(pence);
}

export interface CreditPack {
  id: string;
  name: string;
  sessions: number;
  pricePence: number;
  /** Credits granted, in pence of tutoring time. */
  creditPence: number;
  badge?: string;
  blurb: string;
}

/**
 * Credit packs, not single sessions, are the business. A single £6 session nets
 * roughly £1.60 after processing, which never repays acquisition cost. Packs take
 * cash up front and are what Snapask, Tutor.com and Skooli all converged on.
 */
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "taster",
    name: "Single question",
    sessions: 1,
    pricePence: 600,
    creditPence: 600,
    blurb: "One 15-minute session. No subscription, nothing to cancel.",
  },
  {
    id: "five",
    name: "Study pack",
    sessions: 5,
    pricePence: 2500,
    creditPence: 3000,
    badge: "Most popular",
    blurb: "Five 15-minute sessions. Works out at £5 each — you save £5.",
  },
  {
    id: "ten",
    name: "Exam term pack",
    sessions: 10,
    pricePence: 4500,
    creditPence: 6000,
    badge: "Best value",
    blurb: "Ten 15-minute sessions at £4.50 each. Built for mock and exam season.",
  },
];

export const LEVELS: Level[] = ["GCSE", "A-level"];
