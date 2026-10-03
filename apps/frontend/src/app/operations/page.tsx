import type { Metadata } from "next";
import { OperationsGate } from "@/features/incident-operations/components/operations-gate/operations-gate";

export const metadata: Metadata = {
  title: "mRadar — operations",
  description: "Review incidents, approve responses and follow institution work. Demo accounts and fictional data.",
};

export default function OperationsPage() {
  return (
    <main className="h-dvh w-full">
      <h1 className="sr-only">Operations workspace</h1>
      <OperationsGate />
    </main>
  );
}
