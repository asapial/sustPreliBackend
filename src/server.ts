import "dotenv/config";
import app from "./app.js";
import { prisma } from "./lib/prisma.js";

const PORT = process.env.PORT || 8000;

async function main() {
  // Try to connect to DB but do NOT crash if it fails
  try {
    await prisma.$connect();
    console.log("[DB] Connected to database successfully.");
  } catch (error) {
    console.warn("[DB] Database unavailable — continuing without persistence. Analysis API will still function.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] QueueStorm Investigator running on port ${PORT}`);
    console.log(`[Health] GET  http://localhost:${PORT}/health`);
    console.log(`[API]    POST http://localhost:${PORT}/analyze-ticket`);
  });
}

main().catch((err) => {
  console.error("[Fatal] Server failed to start:", err);
  process.exit(1);
});