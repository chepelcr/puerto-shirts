import app from "./app";
import { logger } from "./lib/logger";
import { initializeAppConfig } from "./config/appConfig";
import { getDatabaseUrl } from "./config/secrets";
import { initializeDatabase } from "@workspace/db";

async function main() {
  const rawPort = process.env["PORT"];
  if (!rawPort) {
    throw new Error("PORT environment variable is required but was not provided.");
  }
  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  // Same bootstrap as the Lambda handler. Locally, set DATABASE_URL in .env and
  // getDatabaseUrl() short-circuits (no AWS calls).
  await initializeAppConfig();
  await initializeDatabase(await getDatabaseUrl());

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
