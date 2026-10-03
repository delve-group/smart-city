import { getConfig, getDemoPasswords } from "../src/server/config";
import { loadEnvironment, reportSetupFailure } from "./db-common";
import { voiceConfigurationIssues } from "../src/server/voice/environment";

try {
  if (process.argv.includes("--production")) Object.assign(process.env, { NODE_ENV: "production" });
  loadEnvironment();
  getConfig();
  if (process.argv.includes("--seed")) getDemoPasswords();
  const voiceIssues = voiceConfigurationIssues(process.env);
  if (voiceIssues.length) console.warn(`Voice unavailable: missing or invalid ${voiceIssues.join(", ")}. Form reporting remains available.`);
  console.info("Environment configuration is valid.");
} catch (error) {
  reportSetupFailure("Environment validation", error);
}
