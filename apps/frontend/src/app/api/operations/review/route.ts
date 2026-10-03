import { handleApi, success } from "@/server/http/api";
import { snapshot } from "../operations-store";

/** Demo endpoint (in-memory, no staff session check yet): the official's whole workspace. */
export async function GET() {
  return handleApi((correlationId) => success(snapshot(), correlationId));
}
