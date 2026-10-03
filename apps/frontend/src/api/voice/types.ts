import { z } from "zod";
import { draftFieldsSchema } from "@/api/intake/types";

export const createVoiceSessionSchema = z.strictObject({ draft_id: z.uuid() });
export const voiceSessionSchema = z.object({ id: z.uuid(), draft_id: z.uuid(), expires_at: z.iso.datetime({ offset: true }), conversation_token: z.string().min(1) });
export type VoiceSession = z.infer<typeof voiceSessionSchema>;

/** Neither an actor, a draft ID nor coordinates are supplied by the dispatcher. */
export const voiceToolSchema = z.discriminatedUnion("operation", [
  z.strictObject({ operation: z.literal("resolve_location"), address: z.string().trim().min(3).max(200) }),
  z.strictObject({ operation: z.literal("find_incidents"), query: z.string().trim().min(1).max(1000) }),
  z.strictObject({
    operation: z.literal("prepare_report"), expected_revision: z.number().int().positive(),
    fields: draftFieldsSchema.omit({ location: true }).partial(),
    candidate_id: z.string().min(1).max(200).optional(), unit: z.string().trim().min(1).max(40).nullable().optional(),
  }),
  z.strictObject({ operation: z.literal("confirm_report_draft"), revision: z.number().int().positive(), explicit_agreement: z.literal(true) }),
  z.strictObject({ operation: z.literal("submit_report"), revision: z.number().int().positive() }),
]);
export type VoiceToolInput = z.infer<typeof voiceToolSchema>;
