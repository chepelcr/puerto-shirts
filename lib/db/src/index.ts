import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// ---------------------------------------------------------------------------
// Lazy-initialized Drizzle instance (same pattern as tsuru management-be).
//
// Call initializeDatabase() once at startup (lambda.ts / index.ts). After that,
// `import { db }` works unchanged in every repository/route via the Proxy below.
// Uses postgres-js with prepare:false — required for the Supabase transaction
// pooler (pgBouncer rejects prepared statements).
// ---------------------------------------------------------------------------

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | undefined;
let _client: ReturnType<typeof postgres> | undefined;

/**
 * Initialize the database connection.
 * Uses the passed URL, else process.env.DATABASE_URL. Safe to call repeatedly.
 */
export async function initializeDatabase(url?: string): Promise<void> {
  if (_db) return;

  const connectionString = url ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL must be set (or pass a url to initializeDatabase). Did you forget to provision the database?",
    );
  }

  _client = postgres(connectionString, { prepare: false });
  _db = drizzle({ client: _client, schema });
}

/** Direct accessor — throws if initializeDatabase() has not been called. */
export function getDb(): DrizzleDb {
  if (!_db) throw new Error("Database not initialized. Call initializeDatabase() first.");
  return _db;
}

/**
 * Backwards-compatible proxy export — all existing `import { db }` keep working
 * once initializeDatabase() has run.
 */
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    if (!_db) throw new Error("Database not initialized. Call initializeDatabase() first.");
    return (_db as any)[prop];
  },
  set(_target, prop, value) {
    if (!_db) throw new Error("Database not initialized. Call initializeDatabase() first.");
    (_db as any)[prop] = value;
    return true;
  },
});

export * from "./schema";
