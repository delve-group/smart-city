import type { NextConfig } from "next";

/** `npm run dev:ui` runs the frontend on mocks only: no database, no env, no backend calls. */
const useMocks = process.env.npm_lifecycle_event === "dev:ui";

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: { MRADAR_MOCKS: useMocks ? "true" : "false" },
};

export default nextConfig;
