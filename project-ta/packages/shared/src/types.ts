/** Core domain types for Project TA. Shared by the web app and the mobile app. */

export type Role = "student" | "tutor" | "parent" | "admin";

export type Level = "GCSE" | "A-level";

export type ExamBoard = "AQA" | "Edexcel" | "OCR" | "WJEC/Eduqas" | "Not sure";

export type DbsStatus = "verified" | "pending" | "none";

export interface User {
  id: string;
  role: Role;
  name: string;
  /** Students are shown to tutors by first name + initial only, never in full. */
  displayName: string;
  email: string;
  avatarColor: string;
  createdAt: number;

  // Student fields
  level?: Level;
  examBoards?: ExamBoard[];
  yearGroup?: string;
  /** Under-18 accounts must be linked to a parent/guardian account. */
  guardianId?: string;
  isUnder18?: boolean;

  // Tutor fields
  bio?: string;
  university?: string;
  degree?: string;
  studyYear?: string;
  subjects?: string[];
  levels?: Level[];
  dbsStatus?: DbsStatus;
  rating?: number;
  ratingCount?: number;
  sessionsCompleted?: number;
  /** Rolling "explained it, didn't just answer it" score — our core quality metric. */
  understandingScore?: number;
  isOnline?: boolean;
  responseSeconds?: number;
}

export type RequestStatus =
  | "pending"
  | "matched"
  | "active"
  | "completed"
  | "cancelled"
  | "expired";

export interface HelpRequest {
  id: string;
  studentId: string;
  subject: string;
  topic: string;
  level: Level;
  examBoard: ExamBoard;
  detail: string;
  /** Data URL of the photographed question, if the student attached one. */
  photo?: string;
  durationMins: number;
  /** Everything in pence — never use floats for money. */
  pricePence: number;
  tutorPayoutPence: number;
  status: RequestStatus;
  createdAt: number;
  expiresAt: number;
  matchedTutorId?: string;
  sessionId?: string;
}

export type SessionStatus = "active" | "completed" | "abandoned";

export interface TutorSession {
  id: string;
  requestId: string;
  studentId: string;
  tutorId: string;
  subject: string;
  topic: string;
  startedAt: number;
  endsAt: number;
  extensionsMins: number;
  status: SessionStatus;
  endedAt?: number;
  rating?: number;
  understandingRating?: number;
  feedback?: string;
  tutorPayoutPence: number;
}

export type MessageKind = "text" | "system" | "photo";

export interface Message {
  id: string;
  sessionId: string;
  senderId: string;
  senderRole: Role;
  senderName: string;
  kind: MessageKind;
  body: string;
  createdAt: number;
  /** True when the safeguarding filter redacted contact details from this message. */
  redacted?: boolean;
}

export type Tool = "pen" | "highlighter" | "eraser";

export interface Stroke {
  id: string;
  sessionId: string;
  authorId: string;
  authorRole: Role;
  tool: Tool;
  color: string;
  width: number;
  /** Flat [x0,y0,x1,y1,...] in 0..1 normalised board space so it scales across devices. */
  points: number[];
  createdAt: number;
}

export type ComplaintCategory =
  | "safeguarding"
  | "tutor-quality"
  | "payment"
  | "technical"
  | "other";

export interface Complaint {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  sessionId?: string;
  category: ComplaintCategory;
  detail: string;
  status: "open" | "acknowledged" | "resolved";
  createdAt: number;
  /** Safeguarding reports are escalated to the Designated Safeguarding Lead immediately. */
  urgent: boolean;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  kind: "topup" | "spend" | "refund" | "payout";
  amountPence: number;
  note: string;
  createdAt: number;
}

export interface Wallet {
  userId: string;
  balancePence: number;
  transactions: WalletTransaction[];
}

export interface TutorApplication {
  id: string;
  name: string;
  email: string;
  university: string;
  degree: string;
  studyYear: string;
  subjects: string[];
  levels: Level[];
  examBoards: ExamBoard[];
  aLevelResults: string;
  motivation: string;
  hasDbs: boolean;
  createdAt: number;
  status: "received" | "screening" | "dbs-pending" | "approved" | "rejected";
}
