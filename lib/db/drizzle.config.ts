import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Relative (posix) paths — drizzle-kit's globber rejects Windows backslash paths.
// Resolved relative to this config's directory (lib/db), which is the cwd used
// by the db:push / db:generate scripts.
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
