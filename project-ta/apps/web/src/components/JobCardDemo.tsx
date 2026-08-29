"use client";

import { useEffect, useState } from "react";
import { tutorPayoutPence } from "@project-ta/shared";
import JobCard, { type Job } from "./JobCard";

/** A looping example of the tutor notification, for the landing page. */
const EXAMPLES: Job[] = [
  {
    id: "demo1",
    subject: "Maths",
    topic: "Integration by parts",
    level: "A-level",
    examBoard: "Edexcel",
    detail: "I keep picking the wrong u and dv. On ∫x·ln(x) dx I get a worse integral than the one I started with.",
    durationMins: 15,
    tutorPayoutPence: tutorPayoutPence(15),
    expiresAt: 0,
    studentYear: "Year 13",
  },
  {
    id: "demo2",
    subject: "Chemistry",
    topic: "Moles and calculations",
    level: "GCSE",
    examBoard: "AQA",
    detail: "Mock is Thursday and I still can't do reacting masses. I get the moles bit but not what to divide by.",
    durationMins: 30,
    tutorPayoutPence: tutorPayoutPence(30),
    expiresAt: 0,
    studentYear: "Year 11",
  },
  {
    id: "demo3",
    subject: "Physics",
    topic: "Electric fields",
    level: "A-level",
    examBoard: "OCR",
    detail: "Why is the field inside a conductor zero? My textbook says it just is and that isn't helping.",
    durationMins: 15,
    tutorPayoutPence: tutorPayoutPence(15),
    expiresAt: 0,
    studentYear: "Year 12",
  },
];

export default function JobCardDemo() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % EXAMPLES.length), 4200);
    return () => clearInterval(t);
  }, []);

  const job = EXAMPLES[i];
  return <JobCard key={job.id} job={job} subjectName={job.subject} demo />;
}
