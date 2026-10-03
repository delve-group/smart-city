import type { Metadata } from "next";
import { OperationsWorkspace } from "@/features/incident-operations/components/operations-workspace/operations-workspace";

export const metadata: Metadata = {
  title: "mRadar — operations",
  description: "Review incidents, approve responses and follow institution work. Demo workspace.",
};

export default function OperationsPage() {
  return (
    <main className="h-dvh w-full">
      <h1 className="sr-only">Operations workspace</h1>
      <OperationsWorkspace />
    </main>
  );
}
