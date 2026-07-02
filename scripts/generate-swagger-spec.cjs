/**
 * Generate the OpenAPI spec from the Express `@swagger` JSDoc on the route files.
 *
 * Modes:
 *   (default)  → swagger/puerto-shirts.json   — source of truth for the API Gateway template
 *   --dist     → artifacts/api-server/dist/swagger-spec.json  — bundled into the Lambda for /api-docs
 *
 * Usage:
 *   node scripts/generate-swagger-spec.cjs
 *   node scripts/generate-swagger-spec.cjs --dist
 */
const swaggerJsdoc = require("swagger-jsdoc");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const distMode = process.argv.includes("--dist");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Camisas del Puerto API",
      version: "1.0.0",
      description:
        "Inventory & sales API for Camisas del Puerto (camisetas, equipos, lotes, maletas, kardex, reportes).",
    },
    servers: [
      { url: "https://api.shirts.jcampos.dev", description: "Production API" },
      { url: "http://localhost:5000", description: "Development API" },
    ],
  },
  // Forward slashes required — swagger-jsdoc's globber does not accept Windows backslashes.
  apis: [path.join(rootDir, "artifacts/api-server/src/routes/*.ts").replace(/\\/g, "/")],
};

const specs = swaggerJsdoc(options);
const specJson = JSON.stringify(specs, null, 2);

let outputPath;
if (distMode) {
  const distDir = path.join(rootDir, "artifacts/api-server/dist");
  fs.mkdirSync(distDir, { recursive: true });
  outputPath = path.join(distDir, "swagger-spec.json");
} else {
  const swaggerDir = path.join(rootDir, "swagger");
  fs.mkdirSync(swaggerDir, { recursive: true });
  outputPath = path.join(swaggerDir, "puerto-shirts.json");
}

fs.writeFileSync(outputPath, specJson);
console.log(`Swagger spec generated at: ${outputPath}`);
console.log(`Paths found: ${Object.keys(specs.paths || {}).length}`);
