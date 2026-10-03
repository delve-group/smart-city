import type { IntakeDraft, Report } from "@/api/intake/types";

/** Screen composition supplies its existing intake controller without cross-feature imports. */
export interface VoiceDraftController {
  draft: IntakeDraft | null;
  report: Report | null;
  receiveVoiceDraft: (draft: IntakeDraft | null, report?: Report) => Promise<boolean>;
  recover: (preserveInput?: boolean) => Promise<IntakeDraft | null | undefined>;
}
