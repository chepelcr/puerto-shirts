import { ExpressAppConfig } from "./config/ExpressAppConfig";
import { logger } from "./lib/logger";

// Local dev entry — same app assembly as the Lambda. SSM config + DB init run
// inside the app's readiness gate (locally, DATABASE_URL in .env short-circuits
// the secret lookup, so there are no AWS calls).
const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const app = new ExpressAppConfig().getApp();

app.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
