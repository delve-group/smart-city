import type { Metadata } from "next";
import { connection } from "next/server";
import { USE_MOCKS } from "@/api/mocks/use-mocks";
import { isDemoMode } from "@/server/config";
import { OperationsGate } from "@/features/incident-operations/components/operations-gate/operations-gate";

export const metadata: Metadata = {
  title: "mRadar — operations",
  description: "Review incidents, approve responses and follow institution work. Demo accounts and fictional data.",
};

export default async function OperationsPage() {
  // Read DEMO_MODE per request, not at build time.
  await connection();
  return (
    <main className="h-dvh w-full">
      <h1 className="sr-only">Operations workspace</h1>
      <OperationsGate demoMode={isDemoMode() || USE_MOCKS} />
    </main>
  );
}
