import type { Metadata } from "next";
import TutorBoardClient from "./TutorBoardClient";

export const metadata: Metadata = { title: "Question board" };

export default function TutorPage() {
  return (
    <div className="wrap section-tight">
      <TutorBoardClient />
    </div>
  );
}
