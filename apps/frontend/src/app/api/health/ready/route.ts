import { getPool } from "@/server/db";
import { ApiError, handleApi, success } from "@/server/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handleApi(async (correlationId) => {
    // Touch the actual columns as well as the migration ledger, not just SELECT 1.
    const result = await getPool().query<{ ready: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE name = '001_auth.sql') AS ready,
        (SELECT id FROM actors LIMIT 1),
        (SELECT token_hash FROM sessions LIMIT 1),
        (SELECT id FROM institutions LIMIT 1),
        (SELECT key_hash FROM auth_login_attempts LIMIT 1)`,
    ).catch(() => {
      throw new ApiError(503, "dependency_unavailable", "The database is not ready. Check the database and migrations.", true);
    });
    if (!result.rows[0]?.ready) {
      throw new ApiError(503, "dependency_unavailable", "The database is not ready. Run the database migrations.", true);
    }
    return success({ status: "ready" }, correlationId);
  });
}
