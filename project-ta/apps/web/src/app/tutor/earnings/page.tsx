import type { Metadata } from "next";
import EarningsClient from "./EarningsClient";

export const metadata: Metadata = { title: "Earnings" };

export default function EarningsPage() {
  return (
    <div className="wrap wrap-mid section-tight">
      <EarningsClient />
    </div>
  );
}
