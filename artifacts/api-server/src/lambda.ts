import serverless from "serverless-http";
import { initializeAppConfig } from "./config/appConfig";
import { getDatabaseUrl } from "./config/secrets";
import { initializeDatabase } from "@workspace/db";

// Bootstrap (management-be order) BEFORE importing the Express app: bridge SSM
// config into env, resolve the DB URL (env → SSM → Secrets Manager) and open
// the postgres-js connection. The app is imported dynamically so its module
// graph (routes → @workspace/db) evaluates only after the db is ready.

let cachedHandler: ReturnType<typeof serverless> | undefined;

async function bootstrap() {
  if (!cachedHandler) {
    await initializeAppConfig();
    await initializeDatabase(await getDatabaseUrl());
    const { default: app } = await import("./app");
    cachedHandler = serverless(app);
  }
  return cachedHandler;
}

export const handler = async (event: any, context: any) => {
  const h = await bootstrap();
  return h(event, context);
};
