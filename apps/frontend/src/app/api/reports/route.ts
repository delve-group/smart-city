import { createReportInputSchema, type ReportsResponseDto } from "@/api/reports/types";
import { CATEGORIES } from "../categories/categories";
import { addReport, listReports } from "./report-store";

/** Mock endpoint (demo data, in-memory). */
export function GET() {
  return Response.json({ source: "demo", reports: listReports() } satisfies ReportsResponseDto);
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = createReportInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid report." }, { status: 400 });
  }
  if (!CATEGORIES.some((category) => category.id === parsed.data.category_id)) {
    return Response.json({ error: "Unknown category." }, { status: 400 });
  }
  return Response.json(addReport(parsed.data), { status: 201 });
}
