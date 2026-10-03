import "server-only";
import { createHash } from "node:crypto";
import { getPool, withTransaction } from "@/server/db";
import type { WorkItem } from "@/server/jobs";
import { ASSESSMENT_SCHEMA_VERSION, type AssessmentInput } from "./assessment";
import type { DecisionProvider } from "./config";
import { ASSESSMENT_PROMPT_VERSION } from "./prompt";
import type { AssessmentResult } from "./scaleway";

export type AssessmentState = "running" | "review" | "proposal" | "superseded";
export interface StoredAssessment {
  assessment_key: string;
  state: AssessmentState;
  attempt_count: number;
  detail: string | null;
  proposal_id: string | null;
}
export interface ReceivedAssessment {
  attempt: number;
  snapshot: AssessmentInput;
  snapshot_sha256: string;
  result: AssessmentResult;
}

export const assessmentKey = (incidentId: string, version: number) => `assess:incident:${incidentId}:v${version}`;

/** The worker's single dispatcher serializes incident work; this also preserves replay identity. */
export async function getOrCreateAssessment(work: WorkItem): Promise<StoredAssessment> {
  const key = assessmentKey(work.source.id, work.source.version);
  await getPool().query(
    `INSERT INTO incident_assessments (assessment_key, incident_id, incident_version, correlation_id)
     VALUES ($1, $2, $3, $4) ON CONFLICT (assessment_key) DO NOTHING`,
    [key, work.source.id, work.source.version, work.correlation_id],
  );
  const result = await getPool().query<StoredAssessment>(
    "SELECT assessment_key, state, attempt_count, detail, proposal_id FROM incident_assessments WHERE assessment_key = $1", [key],
  );
  return result.rows[0];
}

export async function setAssessmentProvider(key: string, provider: DecisionProvider): Promise<void> {
  await getPool().query("UPDATE incident_assessments SET provider = $2, updated_at = now() WHERE assessment_key = $1 AND state = 'running'", [key, provider]);
}

/** A persisted validated response can be applied again without a second model call. */
export async function getReceivedAssessment(key: string): Promise<ReceivedAssessment | null> {
  const result = await getPool().query<ReceivedAssessment>(
    `SELECT attempt, snapshot, snapshot_sha256, result FROM incident_assessment_attempts
     WHERE assessment_key = $1 AND result IS NOT NULL ORDER BY attempt DESC LIMIT 1`, [key],
  );
  return result.rows[0] ?? null;
}

/** Count before the provider call; a crash cannot reset the maximum three-call budget. */
export async function beginAssessmentAttempt(key: string, snapshot: AssessmentInput): Promise<number | null> {
  return withTransaction(async (client) => {
    const current = await client.query<{ attempt_count: number; state: AssessmentState }>(
      "SELECT attempt_count, state FROM incident_assessments WHERE assessment_key = $1 FOR UPDATE", [key],
    );
    const row = current.rows[0];
    if (!row || row.state !== "running" || row.attempt_count >= 3) return null;
    const attempt = row.attempt_count + 1;
    await client.query(
      `UPDATE incident_assessment_attempts SET outcome = 'abandoned', error_code = 'worker_restarted', finished_at = now()
       WHERE assessment_key = $1 AND outcome = 'running'`, [key],
    );
    await client.query(
      `INSERT INTO incident_assessment_attempts
         (assessment_key, attempt, snapshot, snapshot_sha256, prompt_version, schema_version)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6)`,
      [key, attempt, JSON.stringify(snapshot), createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"),
        ASSESSMENT_PROMPT_VERSION, ASSESSMENT_SCHEMA_VERSION],
    );
    await client.query(
      "UPDATE incident_assessments SET attempt_count = $2, provider = 'scaleway', updated_at = now() WHERE assessment_key = $1", [key, attempt],
    );
    return attempt;
  });
}

export async function saveAssessmentResponse(key: string, attempt: number, result: AssessmentResult): Promise<void> {
  const saved = await getPool().query(
    `UPDATE incident_assessment_attempts SET result = $3::jsonb, outcome = 'received', finished_at = now()
     WHERE assessment_key = $1 AND attempt = $2 AND outcome = 'running'`,
    [key, attempt, JSON.stringify(result)],
  );
  if (saved.rowCount !== 1) throw new Error("Assessment response could not be persisted before proposal application.");
}

export async function recordAssessmentFailure(key: string, attempt: number, code: string, retry: boolean): Promise<void> {
  await getPool().query(
    `UPDATE incident_assessment_attempts SET outcome = $3, error_code = $4, finished_at = now()
     WHERE assessment_key = $1 AND attempt = $2 AND outcome = 'running'`,
    [key, attempt, retry ? "retry" : "failed", code],
  );
}

export async function finishAssessment(
  key: string, state: Exclude<AssessmentState, "running">, detail: string, proposalId: string | null = null,
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE incident_assessments SET state = $2, detail = $3, proposal_id = $4, updated_at = now(), finished_at = now()
       WHERE assessment_key = $1 AND state = 'running'`, [key, state, detail, proposalId],
    );
    await client.query(
      `UPDATE incident_assessment_attempts SET outcome = $2, finished_at = now()
       WHERE assessment_key = $1 AND outcome = 'received'`, [key, state],
    );
    await client.query(
      `UPDATE incident_assessment_attempts SET outcome = 'abandoned', error_code = 'assessment_finished_without_response', finished_at = now()
       WHERE assessment_key = $1 AND outcome = 'running'`, [key],
    );
  });
}
