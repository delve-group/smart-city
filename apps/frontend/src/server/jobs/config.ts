import { z } from "zod";
import { ConfigurationError } from "../config";

export function getWorkerConfig() {
  const result = z.object({
    WORKER_POLL_MS: z.coerce.number().int().min(100).max(30_000).default(1_000),
    WORKER_LEASE_MS: z.coerce.number().int().min(3_000).max(300_000).default(30_000),
    WORKER_HEARTBEAT_MS: z.coerce.number().int().min(250).max(10_000).default(5_000),
  }).refine((value) => value.WORKER_HEARTBEAT_MS * 3 < value.WORKER_LEASE_MS,
    { path: ["WORKER_HEARTBEAT_MS"], message: "must be less than one third of the lease" }).safeParse(process.env);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new ConfigurationError(`Invalid worker configuration: ${fields.join(", ")}. Check the worker documentation.`);
  }
  return { pollMs: result.data.WORKER_POLL_MS, leaseMs: result.data.WORKER_LEASE_MS,
    heartbeatMs: result.data.WORKER_HEARTBEAT_MS };
}
