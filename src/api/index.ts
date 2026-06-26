/**
 * Vercel Serverless Entry Point
 *
 * This file is the handler for Vercel's @vercel/node runtime.
 * It exports the Express `app` directly — Vercel wraps it into a
 * serverless function. Do NOT call app.listen() here.
 *
 * For local development, use `npm run dev` which uses src/server.ts.
 */
import "dotenv/config";
import app from "../app.js";

// Export the Express app as the default export.
// @vercel/node will invoke it as a serverless function handler.
export default app;
