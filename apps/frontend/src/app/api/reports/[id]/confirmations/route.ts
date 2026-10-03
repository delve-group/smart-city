import { confirmReport } from "../../report-store";

/** Mock endpoint (demo data, in-memory): "I'm affected too". The demo does not identify residents. */
export async function POST(_request: Request, { params }: RouteContext<"/api/reports/[id]/confirmations">) {
  const { id } = await params;
  const report = confirmReport(id);
  if (!report) return Response.json({ error: "This report no longer exists." }, { status: 404 });
  if (report === "resolved") return Response.json({ error: "This report is already resolved." }, { status: 409 });
  return Response.json(report);
}
