import { getConfig, getDemoPasswords } from "../src/server/config";
import { loadEnvironment, reportSetupFailure } from "./db-common";

try {
  if (process.argv.includes("--production")) Object.assign(process.env, { NODE_ENV: "production" });
  loadEnvironment();
  getConfig();
  if (process.argv.includes("--seed")) getDemoPasswords();
  console.info("Environment configuration is valid.");
} catch (error) {
  reportSetupFailure("Environment validation", error);
}
