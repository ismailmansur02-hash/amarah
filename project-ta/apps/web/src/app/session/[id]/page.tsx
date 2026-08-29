import type { Metadata } from "next";
import SessionClient from "./SessionClient";

export const metadata: Metadata = { title: "Session" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionClient sessionId={id} />;
}
