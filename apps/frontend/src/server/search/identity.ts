import { createHash } from "node:crypto";
import type { Audience, SourceRef } from "./types";

const URL_NAMESPACE = Buffer.from("6ba7b8119dad11d180b400c04fd430c8", "hex");

/** UUID v5: stable across retries, source versions and supported machine runtimes. */
export function projectionPointId(key: SourceRef, audience: Audience): string {
  const name = `mradar/search/v1/${JSON.stringify([
    key.record_type, key.record_id, audience.kind,
    ...(audience.kind === "institution" ? [audience.institution_id] : []),
  ])}`;
  const bytes = createHash("sha1").update(URL_NAMESPACE).update(name).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
