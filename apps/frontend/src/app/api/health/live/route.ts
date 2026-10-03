import { handleApi, success } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return handleApi((correlationId) => success({ status: "ok" }, correlationId));
}
