import {
  MATCH_WINDOW_SECONDS,
  pricePence,
  tutorPayoutPence,
  type HelpRequest,
  type User,
  type Wallet,
} from "@project-ta/shared";

/**
 * Demo data. Payments are mocked in this build, so accounts are pre-made and you
 * switch between them on /login rather than registering. Every tutor here is
 * DBS-verified because the matcher will not surface anyone who is not.
 */

const AVATAR_COLOURS = [
  "#157347",
  "#0f5132",
  "#1f9d5b",
  "#2c7a5d",
  "#3f7d20",
  "#0b6e4f",
  "#1a7f5a",
  "#276749",
];

function colour(i: number): string {
  return AVATAR_COLOURS[i % AVATAR_COLOURS.length];
}

export const seedUsers: User[] = [
  // ---------------------------------------------------------------- students
  {
    id: "u_student_aisha",
    role: "student",
    name: "Aisha Rahman",
    displayName: "Aisha R.",
    email: "aisha@example.school.uk",
    avatarColor: colour(0),
    createdAt: Date.now() - 86400000 * 40,
    level: "A-level",
    examBoards: ["Edexcel"],
    yearGroup: "Year 13",
    isUnder18: true,
    guardianId: "u_parent_nadia",
  },
  {
    id: "u_student_tom",
    role: "student",
    name: "Tom Whitfield",
    displayName: "Tom W.",
    email: "tom@example.school.uk",
    avatarColor: colour(3),
    createdAt: Date.now() - 86400000 * 12,
    level: "GCSE",
    examBoards: ["AQA"],
    yearGroup: "Year 11",
    isUnder18: true,
  },
  // ----------------------------------------------------------------- parent
  {
    id: "u_parent_nadia",
    role: "parent",
    name: "Nadia Rahman",
    displayName: "Nadia R.",
    email: "nadia@example.com",
    avatarColor: colour(5),
    createdAt: Date.now() - 86400000 * 40,
  },
  // ------------------------------------------------------------------ tutors
  {
    id: "u_tutor_priya",
    role: "tutor",
    name: "Priya Shah",
    displayName: "Priya S.",
    email: "priya@example.ac.uk",
    avatarColor: colour(1),
    createdAt: Date.now() - 86400000 * 120,
    bio: "Second-year Maths at Warwick. I sat Edexcel Maths and Further Maths in 2024, so I still remember exactly which bits of the spec are horrible. I will not just hand you the answer — we'll get there together.",
    university: "University of Warwick",
    degree: "BSc Mathematics",
    studyYear: "Year 2",
    subjects: ["maths", "physics"],
    levels: ["GCSE", "A-level"],
    examBoards: ["Edexcel", "AQA"],
    dbsStatus: "verified",
    rating: 4.9,
    ratingCount: 214,
    sessionsCompleted: 268,
    understandingScore: 96,
    isOnline: true,
    responseSeconds: 18,
  },
  {
    id: "u_tutor_marcus",
    role: "tutor",
    name: "Marcus Bell",
    displayName: "Marcus B.",
    email: "marcus@example.ac.uk",
    avatarColor: colour(2),
    createdAt: Date.now() - 86400000 * 90,
    bio: "Third-year Chemistry at Manchester. Organic mechanisms are my thing — if arrows are confusing you, I can usually fix that in ten minutes on the whiteboard.",
    university: "University of Manchester",
    degree: "MChem Chemistry",
    studyYear: "Year 3",
    subjects: ["chemistry", "biology"],
    levels: ["GCSE", "A-level"],
    examBoards: ["AQA", "OCR"],
    dbsStatus: "verified",
    rating: 4.8,
    ratingCount: 143,
    sessionsCompleted: 171,
    understandingScore: 92,
    isOnline: true,
    responseSeconds: 26,
  },
  {
    id: "u_tutor_leah",
    role: "tutor",
    name: "Leah Okonkwo",
    displayName: "Leah O.",
    email: "leah@example.ac.uk",
    avatarColor: colour(4),
    createdAt: Date.now() - 86400000 * 200,
    bio: "Final-year Physics at Bristol and a GCSE science tutor for three years. Patient with the stuff people are embarrassed to ask about — there are no stupid questions at 10pm the night before a mock.",
    university: "University of Bristol",
    degree: "MPhys Physics",
    studyYear: "Year 4",
    subjects: ["physics", "maths"],
    levels: ["GCSE", "A-level"],
    examBoards: ["AQA", "OCR", "Edexcel"],
    dbsStatus: "verified",
    rating: 5.0,
    ratingCount: 88,
    sessionsCompleted: 96,
    understandingScore: 98,
    isOnline: false,
    responseSeconds: 41,
  },
  {
    id: "u_tutor_daniel",
    role: "tutor",
    name: "Daniel Amos",
    displayName: "Daniel A.",
    email: "daniel@example.ac.uk",
    avatarColor: colour(6),
    createdAt: Date.now() - 86400000 * 60,
    bio: "Biology and Chemistry, first year at Leeds. Sat AQA Biology last summer with an A*, so the spec is still fresh. Big on drawing things out rather than reciting definitions.",
    university: "University of Leeds",
    degree: "BSc Biological Sciences",
    studyYear: "Year 1",
    subjects: ["biology", "chemistry"],
    levels: ["GCSE", "A-level"],
    examBoards: ["AQA", "WJEC/Eduqas"],
    dbsStatus: "verified",
    rating: 4.7,
    ratingCount: 52,
    sessionsCompleted: 61,
    understandingScore: 89,
    isOnline: true,
    responseSeconds: 33,
  },
  {
    id: "u_tutor_sana",
    role: "tutor",
    name: "Sana Iqbal",
    displayName: "Sana I.",
    email: "sana@example.ac.uk",
    avatarColor: colour(7),
    createdAt: Date.now() - 86400000 * 150,
    bio: "Maths and Further Maths tutor, second year at Imperial. OCR MEI specialist. I like the questions where you've got half a page of working and it's gone wrong somewhere — finding that is the fun bit.",
    university: "Imperial College London",
    degree: "MSci Mathematics",
    studyYear: "Year 2",
    subjects: ["maths"],
    levels: ["GCSE", "A-level"],
    examBoards: ["OCR", "Edexcel"],
    dbsStatus: "verified",
    rating: 4.9,
    ratingCount: 176,
    sessionsCompleted: 199,
    understandingScore: 94,
    isOnline: true,
    responseSeconds: 22,
  },
];

export function seedWallets(): Record<string, Wallet> {
  const now = Date.now();
  return {
    u_student_aisha: {
      userId: "u_student_aisha",
      balancePence: 3000,
      transactions: [
        {
          id: "txn_seed_1",
          userId: "u_student_aisha",
          kind: "topup",
          amountPence: 3000,
          note: "Study pack — 5 sessions (paid by Nadia R.)",
          createdAt: now - 86400000 * 3,
        },
      ],
    },
    u_student_tom: {
      userId: "u_student_tom",
      balancePence: 600,
      transactions: [
        {
          id: "txn_seed_2",
          userId: "u_student_tom",
          kind: "topup",
          amountPence: 600,
          note: "Single question",
          createdAt: now - 86400000,
        },
      ],
    },
  };
}

/**
 * Two questions already on the board, so a tutor logging in for the first time
 * sees the notification feed working rather than an empty state.
 */
export function seedRequests(): HelpRequest[] {
  const now = Date.now();
  return [
    {
      id: `req_seed_integration_${now.toString(36)}`,
      studentId: "u_student_aisha",
      subject: "maths",
      topic: "Integration by parts",
      level: "A-level",
      examBoard: "Edexcel",
      detail:
        "I keep picking the wrong u and dv. On ∫x·ln(x) dx I get a worse integral than the one I started with. What's the rule for choosing?",
      durationMins: 15,
      pricePence: pricePence(15),
      tutorPayoutPence: tutorPayoutPence(15),
      status: "pending",
      createdAt: now - 20000,
      expiresAt: now + MATCH_WINDOW_SECONDS * 1000 - 20000,
    },
    {
      id: `req_seed_moles_${now.toString(36)}`,
      studentId: "u_student_tom",
      subject: "chemistry",
      topic: "Moles and calculations",
      level: "GCSE",
      examBoard: "AQA",
      detail:
        "Mock is Thursday and I still can't do the reacting-masses questions. I get the moles bit but then I don't know which number to divide by.",
      durationMins: 30,
      pricePence: pricePence(30),
      tutorPayoutPence: tutorPayoutPence(30),
      status: "pending",
      createdAt: now - 45000,
      expiresAt: now + MATCH_WINDOW_SECONDS * 1000 - 45000,
    },
  ];
}
