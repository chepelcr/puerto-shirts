import serverless from "serverless-http";
import { ExpressAppConfig } from "./config/ExpressAppConfig";

// Mirrors management-be lambda.cts: build the Express app via the shared config
// class, wrap it with serverless-http. SSM config + DB init happen inside the
// app's readiness gate, so requests wait until it's ready (warm invocations
// resolve immediately).
const app = new ExpressAppConfig().getApp();
const expressHandler = serverless(app);

export const handler = async (event: any, context: any) => expressHandler(event, context);
