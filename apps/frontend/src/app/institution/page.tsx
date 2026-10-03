import type { Metadata } from "next";
import { connection } from "next/server";
import { USE_MOCKS } from "@/api/mocks/use-mocks";
import { isDemoMode } from "@/server/config";
import { InstitutionGate } from "@/features/institution-inbox/components/institution-gate/institution-gate";

export const metadata: Metadata = {
  title: "mRadar — institution inbox",
  description: "Tickets assigned to your institution and their progress. Demo accounts and fictional data.",
};

export default async function InstitutionPage() {
  // Read DEMO_MODE per request, not at build time.
  await connection();
  return (
    <main className="h-dvh w-full">
      <h1 className="sr-only">Institution inbox</h1>
      <InstitutionGate demoMode={isDemoMode() || USE_MOCKS} />
    </main>
  );
}
