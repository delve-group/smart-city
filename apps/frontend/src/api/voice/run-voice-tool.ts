import { z } from "zod";
import { jsonBody } from "@/api/intake/request-intake";
import { locationResolutionSchema } from "@/api/locations/types";
import { publicSearchPageSchema } from "@/api/search/types";
import { intakeDraftSchema, submittedReportSchema } from "@/api/intake/types";
import { requestVoice } from "./request-voice";
import type { VoiceToolInput } from "./types";

const submissionSchema = z.object({ report: submittedReportSchema, replayed: z.boolean() });
type Operation = VoiceToolInput["operation"];
type ToolResult<O extends Operation> = O extends "resolve_location" ? z.infer<typeof locationResolutionSchema>
  : O extends "find_incidents" ? z.infer<typeof publicSearchPageSchema>
  : O extends "submit_report" ? z.infer<typeof submissionSchema> : z.infer<typeof intakeDraftSchema>;

export function runVoiceTool<O extends Operation>(sessionId: string, input: Extract<VoiceToolInput, { operation: O }>): Promise<ToolResult<O>>;
export function runVoiceTool(sessionId: string, input: VoiceToolInput) {
  const path = `/api/voice/sessions/${encodeURIComponent(sessionId)}/tools`;
  const options = jsonBody("POST", input);
  switch (input.operation) {
    case "resolve_location": return requestVoice(path, locationResolutionSchema, options);
    case "find_incidents": return requestVoice(path, publicSearchPageSchema, options);
    case "submit_report": return requestVoice(path, submissionSchema, options);
    default: return requestVoice(path, intakeDraftSchema, options);
  }
}
