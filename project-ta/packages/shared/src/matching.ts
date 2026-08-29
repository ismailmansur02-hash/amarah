import type { HelpRequest, User } from "./types";

/**
 * Which tutors get pinged for a request.
 *
 * Snapask's mechanic — alert every suitably qualified tutor, first to accept wins,
 * often inside five seconds — is the proven one, so that is what this does. The
 * difference is that our notification carries the fee, the topic and the duration
 * up front, which no competitor shows before a tutor commits.
 */

export interface MatchScore {
  tutor: User;
  score: number;
  reasons: string[];
}

export function isEligible(tutor: User, request: HelpRequest): boolean {
  if (tutor.role !== "tutor") return false;
  if (tutor.dbsStatus !== "verified") return false;
  if (!tutor.subjects?.includes(request.subject)) return false;
  if (!tutor.levels?.includes(request.level)) return false;
  return true;
}

/** Ranking only decides notification order — any eligible tutor can still claim it. */
export function scoreTutor(tutor: User, request: HelpRequest): MatchScore {
  let score = 0;
  const reasons: string[] = [];

  if (tutor.isOnline) {
    score += 50;
    reasons.push("online now");
  }
  if (tutor.examBoards?.includes(request.examBoard)) {
    score += 30;
    reasons.push(`sat ${request.examBoard}`);
  }
  if ((tutor.rating ?? 0) >= 4.8) {
    score += 15;
    reasons.push("top rated");
  }
  if ((tutor.understandingScore ?? 0) >= 90) {
    score += 15;
    reasons.push("explains rather than answers");
  }
  if ((tutor.responseSeconds ?? 999) < 30) {
    score += 10;
    reasons.push("fast to respond");
  }
  score += Math.min((tutor.sessionsCompleted ?? 0) / 10, 10);

  return { tutor, score, reasons };
}

export function rankTutors(tutors: User[], request: HelpRequest): MatchScore[] {
  return tutors
    .filter((t) => isEligible(t, request))
    .map((t) => scoreTutor(t, request))
    .sort((a, b) => b.score - a.score);
}

export function secondsRemaining(expiresAt: number, now = Date.now()): number {
  return Math.max(0, Math.round((expiresAt - now) / 1000));
}
