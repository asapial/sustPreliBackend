import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { indexRouter } from "./index.js";
import analyzeTicketRouter from "./modules/analyze-ticket/analyze-ticket.route.js";

const app: Application = express();

// Middleware
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

// CORS — open for hackathon judging
app.use(cors({ origin: true, credentials: true }));

// Better Auth API Route
app.all("/api/auth/*splat", toNodeHandler(auth));

// ── QueueStorm Investigator: Required Endpoints ───────────────────────────────

// GET /health — must return exactly {"status":"ok"}
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// POST /analyze-ticket
app.use("/analyze-ticket", analyzeTicketRouter);

// ── Original Health Check ─────────────────────────────────────────────────────
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "QueueStorm Investigator API is running",
    service: "QueueStorm Investigator",
    version: "1.0.0",
    environment: process.env.NODE_ENV ?? "development",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Original API routes ───────────────────────────────────────────────────────
app.use("/api/v1", indexRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: true, message: "Route not found" });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) console.error("[Error]", err);

  res.status(err?.statusCode ?? 500).json({
    error: true,
    message: err?.message ?? "Internal server error",
  });
});

export default app;