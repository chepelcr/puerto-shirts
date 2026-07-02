// Integration tests that invoke the built Lambda handler with synthetic API
// Gateway (REST v1) events — the exact path production uses (serverless-http +
// Express), so it catches body-parsing regressions like the Express-5 bug.
//
// Run:  pnpm --filter @workspace/api-server run test:api
//   (builds the bundle, resolves DATABASE_URL from env or the repo .env, then
//    exercises insert → get → update → delete against the real database.)
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

// --- resolve DATABASE_URL (env, else build from the repo .env fields) ---------
function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = Object.fromEntries(
      readFileSync(path.join(repoRoot, ".env"), "utf8")
        .split(/\r?\n/)
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
        }),
    );
    if (env.DATABASE_HOST) {
      const u = encodeURIComponent(env.DATABASE_USERNAME);
      const p = encodeURIComponent(env.DATABASE_PASSWORD);
      return `postgresql://${u}:${p}@${env.DATABASE_HOST}:${env.DATABASE_PORT || 6543}/${env.DATABASE_DBNAME}`;
    }
  } catch {
    /* no .env */
  }
  return undefined;
}

process.env.DATABASE_URL = resolveDatabaseUrl();
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.AWS_EC2_METADATA_DISABLED = "true";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "x";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "x";

const skip = !process.env.DATABASE_URL;

const { handler } = await import("../dist/lambda.mjs");

/** Invoke the handler with a synthetic API Gateway REST v1 event. */
async function call(method, apiPath, body) {
  const res = await handler(
    {
      version: "1.0",
      path: apiPath,
      httpMethod: method,
      headers: { "Content-Type": "application/json" },
      requestContext: { httpMethod: method, path: apiPath, stage: "test" },
      body: body === undefined ? null : JSON.stringify(body),
      isBase64Encoded: false,
    },
    {},
  );
  let json;
  try {
    json = res.body ? JSON.parse(res.body) : undefined;
  } catch {
    json = res.body;
  }
  return { status: res.statusCode, json };
}

test("health check", { skip }, async () => {
  const res = await call("GET", "/api/healthz");
  assert.equal(res.status, 200);
  assert.equal(res.json.status, "ok");
});

test("proveedores: insert → get → update → delete", { skip }, async () => {
  const created = await call("POST", "/api/proveedores", { nombre: "QA Proveedor" });
  assert.equal(created.status, 201, "POST should create");
  const id = created.json.id;
  assert.equal(created.json.nombre, "QA Proveedor");

  const got = await call("GET", `/api/proveedores/${id}`);
  assert.equal(got.status, 200);
  assert.equal(got.json.id, id);

  const updated = await call("PATCH", `/api/proveedores/${id}`, { nombre: "QA Proveedor (edit)" });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.nombre, "QA Proveedor (edit)");

  const removed = await call("DELETE", `/api/proveedores/${id}`);
  assert.equal(removed.status, 204);
});

test("proveedores: POST rejects invalid body", { skip }, async () => {
  const res = await call("POST", "/api/proveedores", { nombre: "" });
  assert.equal(res.status, 422);
});

test("equipos: insert → update → delete", { skip }, async () => {
  const created = await call("POST", "/api/equipos", { nombreEquipo: "QA Equipo" });
  assert.equal(created.status, 201);
  const id = created.json.id;

  const updated = await call("PATCH", `/api/equipos/${id}`, { nombreEquipo: "QA Equipo (edit)" });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.nombreEquipo, "QA Equipo (edit)");

  const removed = await call("DELETE", `/api/equipos/${id}`);
  assert.equal(removed.status, 204);
});
