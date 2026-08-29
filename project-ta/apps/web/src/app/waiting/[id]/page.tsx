import type { Metadata } from "next";
import WaitingClient from "./WaitingClient";

export const metadata: Metadata = { title: "Finding you a tutor" };

export default async function WaitingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="wrap wrap-narrow section">
      <WaitingClient requestId={id} />
    </div>
  );
}
