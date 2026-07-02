import type { Express } from "express";
import path from "path";
import { readFileSync } from "fs";

// Swagger serving — same approach as tsuru management-be: in Lambda load the
// pre-generated spec (bundled as swagger-spec.json), locally generate it from
// the `@swagger` JSDoc on the route files. UI assets come from a CDN so nothing
// needs to be bundled into the Lambda.

export const swaggerDefinition = {
  openapi: "3.0.3",
  info: {
    title: "Camisas del Puerto API",
    version: "1.0.0",
    description: "Inventory & sales API for Camisas del Puerto (camisetas, equipos, lotes, maletas, kardex, reportes).",
  },
  servers: [
    {
      url:
        process.env.NODE_ENV === "production"
          ? "https://api.shirts.jcampos.dev"
          : `http://localhost:${process.env.PORT || 5000}`,
      description: process.env.NODE_ENV === "production" ? "Production API" : "Development API",
    },
  ],
};

const swaggerJsdocOptions = {
  definition: swaggerDefinition,
  // Forward slashes required — swagger-jsdoc's globber does not accept Windows backslashes.
  apis: [
    path.join(process.cwd(), "src/routes/*.ts").replace(/\\/g, "/"),
    path.join(process.cwd(), "artifacts/api-server/src/routes/*.ts").replace(/\\/g, "/"),
  ],
};

export function setupSwagger(app: Express): void {
  let specs: any;
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isLambda) {
    try {
      // In Lambda the bundle root is /var/task; swagger-spec.json ships alongside lambda.mjs
      const specPath = path.join(process.cwd(), "swagger-spec.json");
      specs = JSON.parse(readFileSync(specPath, "utf8"));
    } catch (error) {
      console.error("Failed to load swagger-spec.json:", error);
      specs = { ...swaggerDefinition, paths: {} };
    }
  } else {
    // Local dev: generate dynamically from JSDoc (dynamic import keeps it out of
    // the Lambda code path).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const swaggerJsdoc = require("swagger-jsdoc");
    specs = swaggerJsdoc(swaggerJsdocOptions);
  }

  app.get("/api-docs/swagger.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(specs);
  });

  app.get("/api-docs", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Camisas del Puerto API</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>body{margin:0}.swagger-ui .topbar{display:none}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: '/api-docs/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`);
  });
}
