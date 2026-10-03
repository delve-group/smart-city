import { z } from "zod";
import { requestIntake } from "./request-intake";
import { issueTypeSchema } from "./types";

export async function getIssueTypes(signal?: AbortSignal) {
  return (await requestIntake("/api/issue-types", z.object({ items: z.array(issueTypeSchema) }), { signal })).items;
}
