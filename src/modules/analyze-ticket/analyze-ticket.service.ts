// ============================================================
// QueueStorm Investigator — Optional Prisma Logging Service
// ============================================================

import { prisma } from "../../lib/prisma.js";
import { AnalyzeTicketRequest, AnalyzeTicketResponse } from "./analyze-ticket.types.js";

// Sanitize complaint preview — strip any sensitive-looking content
function safeComplaintPreview(complaint: string): string {
  const sensitivePattern = /\b(otp|pin|password|card\s*number|\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/gi;
  const sanitized = complaint.replace(sensitivePattern, "[REDACTED]");
  return sanitized.substring(0, 120);
}

export async function saveTicketAnalysisLog(
  input: AnalyzeTicketRequest,
  result: AnalyzeTicketResponse
): Promise<void> {
  try {
    await (prisma as any).ticketAnalysisLog.create({
      data: {
        ticketId: result.ticket_id,
        complaintPreview: safeComplaintPreview(input.complaint),
        language: input.language ?? null,
        channel: input.channel ?? null,
        userType: input.user_type ?? null,
        caseType: result.case_type,
        evidenceVerdict: result.evidence_verdict,
        relevantTransactionId: result.relevant_transaction_id ?? null,
        severity: result.severity,
        department: result.department,
        humanReviewRequired: result.human_review_required,
        confidence: result.confidence ?? null,
        reasonCodesJson: JSON.stringify(result.reason_codes ?? []),
      },
    });
  } catch {
    // Intentional no-op — DB logging is optional and must never break the API
    console.error("[QueueStorm] Optional DB logging failed (non-fatal)");
  }
}

export async function saveSafetyEventLog(
  ticketId: string | undefined,
  eventType: string,
  detail: string
): Promise<void> {
  try {
    await (prisma as any).safetyEventLog.create({
      data: {
        ticketId: ticketId ?? null,
        eventType,
        detail: detail.substring(0, 500),
      },
    });
  } catch {
    console.error("[QueueStorm] Optional safety event log failed (non-fatal)");
  }
}
