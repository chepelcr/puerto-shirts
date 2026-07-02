import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { appConfig } from "./appConfig";

// ---------------------------------------------------------------------------
// secrets.ts — database credential resolution (same as tsuru management-be).
//
// Resolution chain:
//   1. NEW_DATABASE_URL / DATABASE_URL env var → use directly (local dev)
//   2. SSM {ssmpath}/aws/database → returns the Secrets Manager secret NAME
//   3. Secrets Manager GetSecretValue(secretName) → { host, port, username, password, dbname }
//   4. Build postgresql:// connection URL
// ---------------------------------------------------------------------------

interface DatabaseSecret {
  host: string;
  port: number | string;
  username: string;
  password: string;
  dbname: string;
}

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "us-east-1",
});

let _cachedUrl: string | undefined;

/** Resolve the PostgreSQL connection URL (cached across warm invocations). */
export async function getDatabaseUrl(): Promise<string> {
  if (_cachedUrl) return _cachedUrl;

  // 1. Local dev fast-path
  const envUrl = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL;
  if (envUrl) {
    _cachedUrl = envUrl;
    return _cachedUrl;
  }

  // 2. Secret name from SSM
  const secretName = await appConfig.getKey("aws.database");
  if (!secretName) {
    throw new Error(
      "Database credentials not found. Set DATABASE_URL (local dev) or deploy the SSM params + secret stacks (Lambda).",
    );
  }

  // 3. Fetch credentials from Secrets Manager
  const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretName }));
  if (!response.SecretString) {
    throw new Error(`Secrets Manager secret "${secretName}" has no SecretString`);
  }

  const secret: DatabaseSecret = JSON.parse(response.SecretString);
  const { host, port, username, password, dbname } = secret;
  if (!host || !username || !password || !dbname) {
    throw new Error(
      `Secrets Manager secret "${secretName}" is missing required fields (host, port, username, password, dbname)`,
    );
  }

  // 4. Build URL (Supabase pooler + TLS)
  _cachedUrl =
    `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port ?? 6543}/${dbname}?sslmode=require`;
  return _cachedUrl;
}
