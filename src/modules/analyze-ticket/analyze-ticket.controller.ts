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
      const issues = parseResult.error.issues;
      const firstIssue = issues[0];

      // Human-readable field name map
      const fieldLabels: Record<string, string> = {
        ticket_id: "Ticket ID",
        complaint: "Complaint",
        language: "Language",
        channel: "Channel",
        user_type: "User Type",
        transaction_history: "Transaction History",
        campaign_context: "Campaign Context",
        metadata: "Metadata",
      };

      // Empty complaint → 422 Unprocessable Entity
      if (
        firstIssue?.path[0] === "complaint" &&
        firstIssue?.code === "too_small"
      ) {
        res.status(422).json({
          error: true,
          message: "Your complaint message cannot be empty. Please describe your issue and try again.",
        });
        return;
      }

      // Map each Zod issue to a friendly message
      const details = issues.map((issue) => {
        const field = issue.path.length > 0
          ? fieldLabels[String(issue.path[0])] ?? String(issue.path[0])
          : "Request body";

        const code = (issue as any).code as string;
        if (code === "invalid_enum_value" || code === "invalid_value") {
          const received = (issue as any).received ?? (issue as any).input;
          const options = (issue as any).options ?? (issue as any).values;
          return `'${field}' has an invalid value '${received}'. Accepted values are: ${Array.isArray(options) ? options.join(", ") : "see documentation"}.`;
        }
        if (issue.code === "invalid_type" && (issue as any).received === "undefined") {
          return `'${field}' is required but was not provided.`;
        }
        return `'${field}': ${issue.message}`;
      });

      // Generic validation failure → 400 Bad Request
      res.status(400).json({
        error: true,
        message: "We were unable to process your request due to invalid input. Please review the details below and try again.",
        details,
      });
      return;
    }

    const input = parseResult.data;

    // ── Complaint must not be just whitespace ────────────────────────────────────
    if (!input.complaint.trim()) {
      res.status(422).json({
        error: true,
        message: "Your complaint message cannot be empty or contain only spaces. Please describe your issue and try again.",
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
        message: "We received a request in an unexpected format. Please check your input and try again.",
      });
      return;
    }
    next(err);
  }
};
