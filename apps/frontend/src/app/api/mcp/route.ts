import { handleMcpRequest } from "@/server/mcp/endpoint";

export const runtime = "nodejs";

export const POST = handleMcpRequest;
export const GET = handleMcpRequest;
export const DELETE = handleMcpRequest;
export const OPTIONS = handleMcpRequest;
export const HEAD = handleMcpRequest;
export const PUT = handleMcpRequest;
export const PATCH = handleMcpRequest;
