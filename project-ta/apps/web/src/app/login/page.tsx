import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="wrap wrap-narrow section">
      <h1>Choose an account</h1>
      <p className="muted">
        This is a prototype, so sign-in is a persona picker rather than a password.
        Open two browser windows with different accounts to watch a question travel
        from a student to a tutor in real time.
      </p>
      <LoginClient />
    </div>
  );
}
