// ============================================================
// QueueStorm Investigator — Controller
// ============================================================

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AnalyzeTicketSchema } from "./analyze-ticket.validation.js";
import { analyzeTicket } from "./analyze-ticket.engine.js";
import { saveTicketAnalysisLog, saveSafetyEventLog } from "./analyze-ticket.service.js";

export const analyzeTicketController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ── Validate body ────────────────────────────────────────────────────────
    const parseResult = AnalyzeTicketSchema.safeParse(req.body);

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];

      // Empty complaint → 422
      if (
        firstIssue?.path[0] === "complaint" &&
        firstIssue?.code === "too_small"
      ) {
        res.status(422).json({
          error: true,
          message: "Complaint cannot be empty",
        });
        return;
      }

      // Missing required fields → 400
      res.status(400).json({
        error: true,
        message: "Invalid request body: " + parseResult.error.issues.map((i) => i.message).join(", "),
      });
      return;
    }

    const input = parseResult.data;

    // ── Complaint must not be just whitespace ────────────────────────────────
    if (!input.complaint.trim()) {
      res.status(422).json({
        error: true,
        message: "Complaint cannot be empty or whitespace",
      });
      return;
    }

    // ── Run analysis ─────────────────────────────────────────────────────────
    const result = analyzeTicket(input as any);

    // ── Optional: log safety events ──────────────────────────────────────────
    if (result.reason_codes?.includes("prompt_injection_detected")) {
      saveSafetyEventLog(
        input.ticket_id,
        "prompt_injection_detected",
        `Prompt injection signal found in ticket ${input.ticket_id}`
      ).catch(() => {});
    }

    // ── Optional: persist analysis log (fire-and-forget) ────────────────────
    saveTicketAnalysisLog(input as any, result).catch(() => {});

    // ── Return result ────────────────────────────────────────────────────────
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: true,
        message: "Invalid request format",
      });
      return;
    }
    next(err);
  }
};
