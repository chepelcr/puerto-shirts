import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// AppConfig — same pattern as tsuru management-be src/config/appConfig.ts.
//
// Resolution order for every dot-notation key:
//   1. SSM Parameter Store  ({ssmBasePath}/{dot-key → slash-path})  ← primary
//   2. Environment variable  (UPPER_SNAKE_CASE of dot key)          ← local dev
//   3. default argument                                             ← fallback
//
// Key mapping examples:
//   "aws.database"        → SSM: {ssmpath}/aws/database   env: AWS_DATABASE
//   "s3.uploads-bucket"   → SSM: {ssmpath}/s3/uploads-bucket  env: S3_UPLOADS_BUCKET
//
// settings.cfg (INI) provides the base path for local dev:
//   [DEVELOPMENT]
//   ssmpath = /pacific/dev/puerto-shirts
// ---------------------------------------------------------------------------

interface SsmCacheEntry {
  value: string;
  expiresAt: number;
}

const SSM_TTL_MS = 5 * 60 * 1000; // 5 minutes

class AppConfig {
  private ssmBasePath: string;
  private ssmClient: SSMClient;
  private cache: Map<string, SsmCacheEntry> = new Map();

  constructor() {
    this.ssmBasePath = this._resolveSsmBasePath();
    this.ssmClient = new SSMClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }

  /** Resolve a dot-notation config key. Order: SSM → env → defaultValue. */
  async getKey(dotKey: string, defaultValue?: string): Promise<string | undefined> {
    const ssmValue = await this._getFromSsm(dotKey);
    if (ssmValue !== undefined) return ssmValue;

    const envValue = this._getFromEnv(dotKey);
    if (envValue !== undefined) return envValue;

    return defaultValue;
  }

  /** Same as getKey but throws if the value is not found. */
  async requireKey(dotKey: string): Promise<string> {
    const value = await this.getKey(dotKey);
    if (value === undefined || value === "") {
      throw new Error(`Required config key "${dotKey}" not found in SSM or environment`);
    }
    return value;
  }

  getSsmBasePath(): string {
    return this.ssmBasePath;
  }

  private async _getFromSsm(dotKey: string): Promise<string | undefined> {
    const paramPath = `${this.ssmBasePath}/${dotKey.replace(/\./g, "/")}`;

    const cached = this.cache.get(paramPath);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    try {
      const command = new GetParameterCommand({ Name: paramPath });
      const response = await this.ssmClient.send(command);
      const value = response.Parameter?.Value;

      if (value !== undefined) {
        this.cache.set(paramPath, { value, expiresAt: Date.now() + SSM_TTL_MS });
        return value;
      }
    } catch (err: any) {
      // ParameterNotFound is expected for optional keys — not an error
      if (err?.name !== "ParameterNotFound") {
        console.warn(`[AppConfig] SSM lookup failed for "${paramPath}": ${err?.message}`);
      }
    }

    return undefined;
  }

  private _getFromEnv(dotKey: string): string | undefined {
    const envKey = dotKey.replace(/\./g, "_").replace(/-/g, "_").toUpperCase();
    const value = process.env[envKey];
    return value !== undefined && value !== "" ? value : undefined;
  }

  private _resolveSsmBasePath(): string {
    // SSM_BASE_PATH env var takes highest priority (set by the Lambda template)
    if (process.env.SSM_BASE_PATH) {
      return process.env.SSM_BASE_PATH;
    }

    const nodeEnv = (process.env.NODE_ENV || "development").toLowerCase();
    const section = nodeEnv === "production" ? "PRODUCTION" : "DEVELOPMENT";

    try {
      // settings.cfg lives at the api-server root (two levels up from src/config/)
      const cfgPath = path.resolve(__dirname, "../../settings.cfg");
      const content = fs.readFileSync(cfgPath, "utf-8");
      const ssmpath = this._parseIniSection(content, section, "ssmpath");
      if (ssmpath) return ssmpath;
    } catch {
      // settings.cfg not found — fall through to default
    }

    return "/pacific/dev/puerto-shirts";
  }

  private _parseIniSection(content: string, section: string, key: string): string | undefined {
    const lines = content.split("\n");
    let inSection = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === `[${section}]`) {
        inSection = true;
        continue;
      }
      if (trimmed.startsWith("[") && inSection) {
        break;
      }
      if (inSection && trimmed.startsWith(key)) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          return trimmed.slice(eqIdx + 1).trim();
        }
      }
    }

    return undefined;
  }
}

// Module-level singleton — reused across warm Lambda invocations
export const appConfig = new AppConfig();

// ---------------------------------------------------------------------------
// initializeAppConfig — bridge SSM values into process.env at app startup so
// code that reads process.env.X directly (objectStorage, etc.) picks them up.
// ---------------------------------------------------------------------------

const SSM_TO_ENV_MAP: Array<{ key: string; envVar: string }> = [
  { key: "s3.uploads-bucket", envVar: "UPLOADS_BUCKET" },
  { key: "uploads.url", envVar: "PUBLIC_ASSET_BASE_URL" },
  { key: "frontend.url", envVar: "FRONTEND_URL" },
  { key: "aws.region", envVar: "AWS_REGION" },
];

export async function initializeAppConfig(): Promise<void> {
  await Promise.all(
    SSM_TO_ENV_MAP.map(async ({ key, envVar }) => {
      // Don't clobber values already set by the Lambda template / local .env
      if (process.env[envVar]) return;
      const value = await appConfig.getKey(key);
      if (value) {
        process.env[envVar] = value;
      }
    }),
  );
}
