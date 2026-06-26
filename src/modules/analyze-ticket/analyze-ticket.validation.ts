// ============================================================
// QueueStorm Investigator — Zod Validation Schema
// ============================================================

import { z } from "zod";

const TransactionEntrySchema = z.object({
  transaction_id: z.string(),
  timestamp: z.string(),
  type: z.enum(["transfer", "payment", "cash_in", "cash_out", "settlement", "refund"]).optional(),
  amount: z.number().optional(),
  counterparty: z.string().optional(),
  status: z.enum(["completed", "failed", "pending", "reversed"]).optional(),
});

export const AnalyzeTicketSchema = z.object({
  ticket_id: z.string().min(1, "ticket_id is required"),
  complaint: z.string().min(1, "complaint is required"),
  language: z.enum(["en", "bn", "mixed"]).optional(),
  channel: z
    .enum(["in_app_chat", "call_center", "email", "merchant_portal", "field_agent"])
    .optional(),
  user_type: z.enum(["customer", "merchant", "agent", "unknown"]).optional(),
  campaign_context: z.string().optional(),
  transaction_history: z.array(TransactionEntrySchema).optional().default([]),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type AnalyzeTicketInput = z.infer<typeof AnalyzeTicketSchema>;
