import type { NextRequest } from "next/server";
import { proposalDecisionSchema } from "@/api/operations/types";
import { decideProposal } from "@/server/actions/proposals";
import { officialCommand } from "@/server/http/official";

export const runtime = "nodejs";

/** Official approval or rejection of exactly the reviewed proposal and incident versions. Never an agent tool. */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/action-proposals/[id]/decision">) {
  const { id } = await params;
  return officialCommand(request, proposalDecisionSchema, async (ctx, decision) => (await decideProposal(ctx, id, decision)).version);
}
