import type { Metadata } from "next";
import AskClient from "./AskClient";

export const metadata: Metadata = { title: "Ask a question" };

export default function AskPage() {
  return (
    <div className="wrap wrap-mid section">
      <AskClient />
    </div>
  );
}
