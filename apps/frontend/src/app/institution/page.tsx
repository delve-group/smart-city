import type { Metadata } from "next";
import { InstitutionGate } from "@/features/institution-inbox/components/institution-gate/institution-gate";

export const metadata: Metadata = {
  title: "mRadar — institution inbox",
  description: "Tickets assigned to your institution and their progress. Demo accounts and fictional data.",
};

export default function InstitutionPage() {
  return (
    <main className="h-dvh w-full">
      <h1 className="sr-only">Institution inbox</h1>
      <InstitutionGate />
    </main>
  );
}
