import { handleApi, success } from "@/server/http/api";
import { ISSUE_TYPES } from "@/server/reports/issue-types";

/** Demo configuration: the issue types a draft may name, each with the category it belongs to. */
export async function GET() {
  return handleApi((correlationId) => success({ items: ISSUE_TYPES, next_cursor: null }, correlationId));
}
