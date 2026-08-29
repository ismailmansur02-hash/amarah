import type { Metadata } from "next";
import PayClient from "./PayClient";

export const metadata: Metadata = { title: "Credit & payments" };

export default function PayPage() {
  return (
    <div className="wrap wrap-mid section-tight">
      <PayClient />
    </div>
  );
}
