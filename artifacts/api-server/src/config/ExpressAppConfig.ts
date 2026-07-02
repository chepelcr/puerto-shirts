import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "../routes";
import { logger } from "../lib/logger";
import { setupSwagger } from "./swagger";
import { initializeAppConfig } from "./appConfig";
import { getDatabaseUrl } from "./secrets";
import { initializeDatabase } from "@workspace/db";

// Mirrors tsuru management-be's ExpressAppConfig so the Lambda + local server
// share one entry point. Key detail: body parsers (express.json / urlencoded)
// are registered FIRST — before logging/CORS — and a readiness gate blocks each
// request until SSM config + the DB connection are ready. This is the
// serverless-http-friendly setup (the original Replit app registered pino-http
// first, which broke body parsing under serverless-http).
export class ExpressAppConfig {
  private app: Express;
  /** Resolves once SSM config and the DB are ready. All requests wait on this. */
  private _readyPromise: Promise<void>;

  constructor() {
    this.app = this._createApp();
    this._readyPromise = this._initialize();
    this._configureMiddleware();
    this._configureRoutes();
  }

  private async _initialize(): Promise<void> {
    await initializeAppConfig();
    await initializeDatabase(await getDatabaseUrl());
  }

  private _createApp(): Express {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    return app;
  }

  private _configureMiddleware(): void {
    // Readiness gate — blocks requests until SSM config + DB are initialized.
    // Resolves immediately on warm Lambda invocations (promise already settled).
    this.app.use((_req: Request, _res: Response, next: NextFunction) => {
      this._readyPromise.then(() => next()).catch(next);
    });

    this.app.use(cors());

    this.app.use(
      pinoHttp({
        logger,
        serializers: {
          req(req) {
            return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
          },
          res(res) {
            return { statusCode: res.statusCode };
          },
        },
      }),
    );
  }

  private _configureRoutes(): void {
    setupSwagger(this.app);
    this.app.use("/api", router);
  }

  public getApp(): Express {
    return this.app;
  }
}
