import { handleApi, success } from "@/server/http/api";
import { CATEGORIES } from "./categories";

/** API-defined demo catalogue, using the common response boundary. */
export function GET() {
  return handleApi((correlationId) => success(CATEGORIES, correlationId));
}
