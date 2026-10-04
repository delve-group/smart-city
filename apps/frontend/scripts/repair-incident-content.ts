import { loadEnvironment } from "./db-common";
import { systemContext } from "../src/server/actor-context";
import { getPool, withTransaction } from "../src/server/db";
import { classifyReport } from "../src/server/agents/report-classification";
import { findReportRow } from "../src/server/reports/reports";
import { bumpIncidentVersion, findIncidentRow } from "../src/server/incidents/incidents";
import { getProposalPayload } from "../src/server/actions/proposal-lifecycle";
import { recordAudit } from "../src/server/audit/audit";
import { enqueueIncidentIndex } from "../src/server/incidents/work";

/** Explicit one-off recovery for legacy incidents. Does not reclassify, relink or send a ticket. */
async function main() {
  loadEnvironment();
  const ticket = process.argv[2];
  if (!ticket || (ticket !== "--all" && !/^[A-Z]+-\d{2}-\d{6}$/.test(ticket))) {
    throw new Error("Pass --all or a service-ticket reference.");
  }
  const pool = getPool();
  try {
    const sources = await pool.query<{ id: string; report_id: string; version: number }>(
      `SELECT DISTINCT ON (i.id) i.id, r.id AS report_id, i.version
       FROM incidents i JOIN reports r ON r.incident_id = i.id
       WHERE i.public_content IS NULL AND ($1::text IS NULL OR EXISTS
         (SELECT 1 FROM service_tickets t WHERE t.incident_id = i.id AND t.reference = $1))
       ORDER BY i.id, r.submitted_at, r.id`, [ticket === "--all" ? null : ticket],
    );
    let repaired = 0;
    for (const source of sources.rows) {
      const report = await findReportRow(pool, source.report_id);
      if (!report) continue;
      const result = await classifyReport(report);
      if (!("public_content" in result) || !result.public_content) {
        console.error(`Content unavailable for ${source.id}: ${result.outcome}`);
        process.exitCode = 1;
        continue;
      }
      const content = result.public_content;
      const ctx = systemContext("triage", `repair-content:${source.id}`);
      await withTransaction(async (client) => {
        const current = await findIncidentRow(client, source.id, true);
        const latestReport = await client.query<{ version: number }>("SELECT version FROM reports WHERE id = $1 FOR UPDATE", [report.id]);
        if (!current || current.public_content || current.version !== source.version || latestReport.rows[0]?.version !== report.version) {
          throw new Error("The incident or report changed during recovery; rerun against the current version.");
        }
        await client.query("UPDATE incidents SET title = $2, description = $3, public_content = $4::jsonb WHERE id = $1",
          [current.id, report.summary, report.original_observation, JSON.stringify(content)]);
        // Retain the preceding payload and version before correcting an open demo ticket.
        const tickets = await client.query<{ id: string; version: number; payload: unknown }>(
          "SELECT id, version, payload FROM service_tickets WHERE incident_id = $1 AND status IN ('created', 'acknowledged', 'in_progress') FOR UPDATE", [current.id],
        );
        const payload = await getProposalPayload(client, current.id);
        for (const item of tickets.rows) {
          await client.query("INSERT INTO service_ticket_content_history (ticket_id, ticket_version, payload) VALUES ($1, $2, $3::jsonb)",
            [item.id, item.version, JSON.stringify(item.payload)]);
          await client.query("UPDATE service_tickets SET payload = $2::jsonb, version = version + 1, updated_at = now() WHERE id = $1",
            [item.id, JSON.stringify(payload)]);
          await recordAudit(client, ctx, { operation: "ticket.correct_content", entity_type: "service_ticket", entity_id: item.id,
            related: { incident_id: current.id, previous_version: item.version }, outcome: "corrected",
            reason: "Recovered the reported problem details; previous request retained in content history." });
        }
        const version = await bumpIncidentVersion(client, current.id);
        await recordAudit(client, ctx, { operation: "incident.correct_content", entity_type: "incident", entity_id: current.id,
          related: { report_id: report.id, previous_version: current.version }, outcome: "corrected",
          reason: "Recovered title and description from the original observation, independently of routing." });
        await enqueueIncidentIndex(client, { id: current.id, version: version! }, ctx.correlation_id);
        repaired++;
      });
    }
    console.log(JSON.stringify({ candidates: sources.rows.length, repaired }));
  } finally {
    await pool.end();
  }
}
main().catch(() => { console.error("Content recovery failed; inspect provider availability and current record versions."); process.exitCode = 1; });
