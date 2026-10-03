import type { Assessment, ProposalState, ResponseStatus, ReviewReason, TicketStatus } from "@/api/operations/types";

type BadgeVariant = "secondary" | "outline" | "success" | "warning" | "error" | "soft";

export const ASSESSMENT: Record<Assessment, { label: string; hint: string; variant: BadgeVariant }> = {
  suspected: { label: "Suspected", hint: "Reported, not yet corroborated.", variant: "outline" },
  corroborated: { label: "Corroborated", hint: "Several residents or a data source agree. Not officially verified.", variant: "secondary" },
  verified: { label: "Verified", hint: "An official recorded verifying evidence.", variant: "success" },
  disputed: { label: "Disputed", hint: "An official recorded conflicting information.", variant: "warning" },
};

export const RESPONSE: Record<ResponseStatus, { label: string; variant: BadgeVariant }> = {
  new: { label: "New", variant: "outline" },
  triaged: { label: "Triaged", variant: "outline" },
  assigned: { label: "Assigned", variant: "secondary" },
  in_progress: { label: "In progress", variant: "secondary" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "soft" },
};

export const PROPOSAL: Record<ProposalState, string> = {
  pending: "Waiting for your decision",
  approved: "Approved",
  rejected: "Rejected",
  executing: "Sending…",
  executed: "Sent",
  failed: "Sending failed",
  unknown: "Outcome unknown",
  superseded: "Replaced",
};

export const TICKET_STEPS = ["created", "acknowledged", "in_progress", "resolved"] as const satisfies readonly TicketStatus[];

export const TICKET: Record<TicketStatus, string> = {
  created: "Ticket sent",
  acknowledged: "Acknowledged",
  in_progress: "Work started",
  resolved: "Resolved",
  rejected: "Rejected by the institution",
};

/** Queue line under the title: what the official has to do. */
export const REVIEW: Record<ReviewReason, string> = {
  urgent: "Urgent · possible danger",
  proposal_ready: "Proposal ready for approval",
  needs_responsibility: "Choose who responds",
  ticket_rejected: "Rejected by the institution",
  needs_link: "Uncertain link",
  private_scope: "Apartment-only report",
  pending_triage: "Triage failed · review by hand",
};
