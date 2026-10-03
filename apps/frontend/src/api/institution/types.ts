import { z } from "zod";

/* Institution inbox contract (docs/workflow-contracts.md §7). Fictional demo institutions and data. */

export const TICKET_STATUSES = ["created", "acknowledged", "in_progress", "resolved", "rejected"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

const isoDate = z.iso.datetime({ offset: true });

export const institutionTicketDtoSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  institution_id: z.string().min(1),
  status: z.enum(TICKET_STATUSES),
  version: z.number().int().positive(),
  payload: z.array(z.object({ key: z.string(), value: z.string() })),
  incident: z.object({
    id: z.string().min(1),
    reference: z.string().min(1),
    category_id: z.string().min(1),
    issue_type: z.string(),
    public_summary: z.string(),
    public_location: z.object({ lat: z.number(), lng: z.number(), label: z.string(), precision: z.enum(["street", "building"]) }),
  }),
  expected_resolution_at: isoDate.nullable(),
  result_note: z.string().nullable(),
  events: z.array(z.object({ status: z.enum(TICKET_STATUSES), at: isoDate, note: z.string().nullable() })),
  created_at: isoDate,
  updated_at: isoDate,
  provenance: z.literal("demo"),
});
export type InstitutionTicketDto = z.infer<typeof institutionTicketDtoSchema>;

/** Body of PATCH /api/institution/tickets/{id}. Unknown properties are rejected. */
export const ticketUpdateSchema = z.strictObject({
  status: z.enum(["acknowledged", "in_progress", "resolved", "rejected"]),
  expected_version: z.number().int().positive(),
  note: z.string().trim().min(3, "Add a short note.").max(500).optional(),
  expected_resolution_at: isoDate.nullable().optional(),
});
export type TicketUpdate = z.infer<typeof ticketUpdateSchema>;

export type InstitutionTicket = {
  id: string;
  reference: string;
  status: TicketStatus;
  version: number;
  payload: { key: string; value: string }[];
  incident: { id: string; reference: string; categoryId: string; summary: string; locationLabel: string; location: { lat: number; lng: number } };
  expectedResolutionAt: string | null;
  resultNote: string | null;
  events: { status: TicketStatus; at: string; note: string | null }[];
  createdAt: string;
  updatedAt: string;
};

export type InstitutionProfile = { id: string; name: string; isDemo: boolean };

/** A failed inbox request, with the API's machine-readable code (e.g. `version_conflict`). */
export class InstitutionApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
