// ============================================================
// QueueStorm Investigator — Core Analysis Engine
// ============================================================

import { extractSignals } from "../../utils/normalize.js";
import {
  AnalyzeTicketRequest,
  AnalyzeTicketResponse,
  CaseType,
  Department,
  EvidenceVerdict,
  ExtractedSignals,
  Severity,
  TransactionEntry,
} from "./analyze-ticket.types.js";

// ── 1. Case Classification ────────────────────────────────────────────────────

function classifyCaseType(signals: ExtractedSignals): CaseType {
  // Priority order: safety > specific financial > generic
  if (signals.hasScamSignal || signals.hasPinOtpPasswordSignal) {
    return "phishing_or_social_engineering";
  }
  if (signals.hasDuplicateSignal) {
    return "duplicate_payment";
  }
  if (signals.hasMerchantSignal) {
    return "merchant_settlement_delay";
  }
  if (signals.hasAgentCashInSignal) {
    return "agent_cash_in_issue";
  }
  if (signals.hasWrongTransferSignal) {
    return "wrong_transfer";
  }
  if (signals.hasFailedPaymentSignal) {
    return "payment_failed";
  }
  if (signals.hasRefundSignal) {
    return "refund_request";
  }
  return "other";
}

// ── 2. Transaction Matching ───────────────────────────────────────────────────

function scoreTransaction(
  txn: TransactionEntry,
  signals: ExtractedSignals,
  caseType: CaseType
): number {
  let score = 0;
  const normalizedCounterparty = txn.counterparty?.toLowerCase() ?? "";
  const txnId = txn.transaction_id?.toUpperCase() ?? "";

  // Direct transaction ID mention
  if (signals.mentionedTransactionIds.some((id) => id.toUpperCase() === txnId)) {
    score += 6;
  }

  // Amount match
  if (txn.amount !== undefined && signals.mentionedAmounts.some((amt) => Math.abs(amt - txn.amount!) < 1)) {
    score += 3;
  }

  // Counterparty match
  if (
    signals.mentionedCounterparties.some((cp) => {
      const cleanCp = cp.replace(/\s/g, "");
      const cleanTxnCp = normalizedCounterparty.replace(/\s/g, "");
      return cleanCp === cleanTxnCp || cleanTxnCp.includes(cleanCp) || cleanCp.includes(cleanTxnCp);
    })
  ) {
    score += 3;
  }

  // Type alignment
  const typeAlignment: Partial<Record<CaseType, TransactionEntry["type"][]>> = {
    wrong_transfer: ["transfer"],
    payment_failed: ["payment"],
    duplicate_payment: ["payment"],
    merchant_settlement_delay: ["settlement"],
    agent_cash_in_issue: ["cash_in"],
    refund_request: ["refund", "payment", "transfer"],
  };

  if (txn.type && typeAlignment[caseType]?.includes(txn.type)) {
    score += 2;
  } else if (txn.type) {
    // Type contradicts case
    const contradictions: Partial<Record<CaseType, TransactionEntry["type"][]>> = {
      wrong_transfer: ["cash_in", "settlement"],
      agent_cash_in_issue: ["settlement", "payment"],
    };
    if (contradictions[caseType]?.includes(txn.type)) {
      score -= 2;
    }
  }

  // Status alignment
  if (caseType === "payment_failed" && (txn.status === "failed" || txn.status === "pending")) {
    score += 2;
  } else if (caseType === "wrong_transfer" && txn.status === "completed") {
    score += 2;
  } else if (caseType === "duplicate_payment" && (txn.status === "completed" || txn.status === "pending")) {
    score += 2;
  } else if (caseType === "agent_cash_in_issue" && (txn.status === "pending" || txn.status === "failed")) {
    score += 2;
  } else if (caseType === "merchant_settlement_delay" && (txn.status === "pending" || txn.status === "failed")) {
    score += 2;
  }

  // Amount contradictions
  if (txn.amount !== undefined && signals.mentionedAmounts.length > 0) {
    const minMentioned = Math.min(...signals.mentionedAmounts);
    const maxMentioned = Math.max(...signals.mentionedAmounts);
    if (txn.amount < minMentioned * 0.1 || txn.amount > maxMentioned * 10) {
      score -= 2;
    }
  }

  return score;
}

function findRelevantTransaction(
  transactions: TransactionEntry[],
  signals: ExtractedSignals,
  caseType: CaseType
): { txn: TransactionEntry | null; score: number; isDuplicate: boolean } {
  if (!transactions || transactions.length === 0) {
    return { txn: null, score: 0, isDuplicate: false };
  }

  // Check for duplicate payment scenario
  if (caseType === "duplicate_payment" && transactions.length >= 2) {
    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        const a = transactions[i];
        const b = transactions[j];
        if (
          a.amount === b.amount &&
          a.counterparty === b.counterparty &&
          (a.status === "completed" || a.status === "pending") &&
          (b.status === "completed" || b.status === "pending")
        ) {
          return { txn: a, score: 8, isDuplicate: true };
        }
      }
    }
  }

  let bestTxn: TransactionEntry | null = null;
  let bestScore = 0;

  for (const txn of transactions) {
    const score = scoreTransaction(txn, signals, caseType);
    if (score > bestScore) {
      bestScore = score;
      bestTxn = txn;
    }
  }

  const MATCH_THRESHOLD = 3;
  return { txn: bestScore >= MATCH_THRESHOLD ? bestTxn : null, score: bestScore, isDuplicate: false };
}

// ── 3. Evidence Verdict ───────────────────────────────────────────────────────

function determineEvidenceVerdict(
  txn: TransactionEntry | null,
  caseType: CaseType,
  signals: ExtractedSignals,
  transactions: TransactionEntry[]
): EvidenceVerdict {
  if (!txn || transactions.length === 0) {
    return "insufficient_data";
  }

  // Consistent cases
  if (caseType === "wrong_transfer" && txn.type === "transfer" && txn.status === "completed") {
    return "consistent";
  }
  if (caseType === "payment_failed" && txn.type === "payment" && (txn.status === "failed" || txn.status === "pending")) {
    return "consistent";
  }
  if (caseType === "duplicate_payment") {
    return "consistent"; // already verified in findRelevantTransaction
  }
  if (caseType === "merchant_settlement_delay" && txn.type === "settlement" && (txn.status === "pending" || txn.status === "failed")) {
    return "consistent";
  }
  if (caseType === "agent_cash_in_issue" && txn.type === "cash_in" && (txn.status === "pending" || txn.status === "failed")) {
    return "consistent";
  }
  if (caseType === "refund_request" && txn.status !== "reversed") {
    return "consistent";
  }
  if (caseType === "phishing_or_social_engineering") {
    // No transaction match expected; signal-based
    return "insufficient_data";
  }

  // Inconsistent cases
  if (caseType === "payment_failed" && txn.status === "completed") {
    return "inconsistent";
  }
  if (caseType === "wrong_transfer" && txn.status === "failed") {
    return "inconsistent";
  }
  if (
    signals.mentionedAmounts.length > 0 &&
    txn.amount !== undefined &&
    !signals.mentionedAmounts.some((amt) => Math.abs(amt - txn.amount!) < txn.amount! * 0.1)
  ) {
    return "inconsistent";
  }
  if (caseType === "refund_request" && txn.status === "reversed") {
    return "inconsistent"; // refund already completed
  }

  return "insufficient_data";
}

// ── 4. Severity ───────────────────────────────────────────────────────────────

function determineSeverity(
  caseType: CaseType,
  evidenceVerdict: EvidenceVerdict,
  signals: ExtractedSignals,
  txn: TransactionEntry | null
): Severity {
  // Critical cases
  if (caseType === "phishing_or_social_engineering") {
    return "critical";
  }
  if (signals.hasPromptInjectionSignal) {
    return "critical";
  }

  const amount = txn?.amount ?? (signals.mentionedAmounts.length > 0 ? Math.max(...signals.mentionedAmounts) : 0);

  // High cases
  if (caseType === "wrong_transfer" && evidenceVerdict === "consistent") {
    return "high";
  }
  if (amount >= 10000) {
    return "high";
  }
  if (evidenceVerdict === "inconsistent") {
    return "high";
  }
  if (signals.hasRefundSignal && amount >= 5000) {
    return "high";
  }

  // Medium cases
  if (caseType === "payment_failed") {
    return amount >= 5000 ? "high" : "medium";
  }
  if (caseType === "duplicate_payment") {
    return "medium";
  }
  if (caseType === "merchant_settlement_delay") {
    return "medium";
  }
  if (caseType === "agent_cash_in_issue") {
    return "medium";
  }
  if (caseType === "refund_request") {
    return "medium";
  }
  if (evidenceVerdict === "insufficient_data" && caseType !== "other") {
    return "medium";
  }

  return "low";
}

// ── 5. Department Routing ─────────────────────────────────────────────────────

function determineDepartment(
  caseType: CaseType,
  severity: Severity,
  evidenceVerdict: EvidenceVerdict
): Department {
  switch (caseType) {
    case "wrong_transfer":
      return "dispute_resolution";
    case "payment_failed":
      return "payments_ops";
    case "duplicate_payment":
      return "payments_ops";
    case "merchant_settlement_delay":
      return "merchant_operations";
    case "agent_cash_in_issue":
      return "agent_operations";
    case "phishing_or_social_engineering":
      return "fraud_risk";
    case "refund_request":
      if (severity === "high" || severity === "critical" || evidenceVerdict === "inconsistent") {
        return "dispute_resolution";
      }
      return "customer_support";
    default:
      return "customer_support";
  }
}

// ── 6. Human Review ───────────────────────────────────────────────────────────

function determineHumanReview(
  caseType: CaseType,
  severity: Severity,
  evidenceVerdict: EvidenceVerdict,
  txn: TransactionEntry | null,
  signals: ExtractedSignals
): boolean {
  if (caseType === "wrong_transfer") return true;
  if (caseType === "phishing_or_social_engineering") return true;
  if (caseType === "duplicate_payment") return true;
  if (severity === "high" || severity === "critical") return true;
  if (evidenceVerdict === "insufficient_data" && caseType !== "other") return true;
  if (evidenceVerdict === "inconsistent") return true;
  if (txn && txn.amount !== undefined && txn.amount >= 5000) return true;
  if (signals.hasRefundSignal) return true;
  if (caseType === "merchant_settlement_delay") return true;
  if (caseType === "agent_cash_in_issue") return true;
  return false;
}

// ── 7. Agent Summary ─────────────────────────────────────────────────────────

function generateAgentSummary(
  caseType: CaseType,
  evidenceVerdict: EvidenceVerdict,
  department: Department,
  txn: TransactionEntry | null
): string {
  const caseLabel = caseType.replace(/_/g, " ");
  if (txn) {
    return `Customer reports a ${caseLabel} issue related to transaction ${txn.transaction_id}. Provided transaction evidence appears ${evidenceVerdict}, and the case is routed to ${department.replace(/_/g, " ")}.`;
  }
  return `Customer reports a ${caseLabel} issue, but no matching transaction was found in the provided history. Evidence is insufficient from the current data.`;
}

// ── 8. Recommended Next Action ────────────────────────────────────────────────

function generateRecommendedNextAction(caseType: CaseType, evidenceVerdict: EvidenceVerdict): string {
  if (evidenceVerdict === "insufficient_data" && caseType === "other") {
    return "Request only non-sensitive clarifying details such as approximate time, amount, or transaction reference if available. Do not request PIN, OTP, password, or full card number.";
  }
  switch (caseType) {
    case "wrong_transfer":
      return "Verify the matched transfer details using approved internal checks and escalate to dispute resolution. Do not promise reversal before authorization.";
    case "payment_failed":
      return "Check transaction status, ledger debit status, and merchant confirmation. If eligible, follow the official failed-payment workflow.";
    case "refund_request":
      return "Review transaction eligibility and policy status before taking any refund-related action. Do not confirm refund before authorization.";
    case "duplicate_payment":
      return "Compare repeated payment records for amount, counterparty, and timestamp. Escalate to payments operations for adjustment review if duplicate debit is confirmed.";
    case "merchant_settlement_delay":
      return "Check settlement batch status, merchant ID, and expected settlement window. Escalate to merchant operations if delayed.";
    case "agent_cash_in_issue":
      return "Verify cash-in transaction status, agent ID, and ledger posting. Escalate to agent operations if the deposit was not reflected.";
    case "phishing_or_social_engineering":
      return "Escalate to fraud risk, record reported suspicious contact details if available, and advise the customer only through official safety guidance.";
    default:
      return "Request only non-sensitive clarifying details such as approximate time, amount, or transaction reference if available. Do not request PIN, OTP, password, or full card number.";
  }
}

// ── 9. Customer Reply ─────────────────────────────────────────────────────────

function generateCustomerReply(caseType: CaseType): string {
  switch (caseType) {
    case "wrong_transfer":
      return "We have noted your concern about the transfer. Our support team will review the transaction details through official channels. Please do not share your PIN, OTP, password, or sensitive credentials with anyone.";
    case "payment_failed":
      return "We have noted your concern about the payment. The transaction details will be checked through official support channels, and any eligible amount will be handled according to policy.";
    case "refund_request":
      return "We have received your refund-related concern. The team will verify the transaction and eligibility through official channels before any action is taken.";
    case "duplicate_payment":
      return "We have noted your concern about a possible duplicate payment. The relevant transaction details will be reviewed, and any eligible adjustment will be processed through official channels.";
    case "merchant_settlement_delay":
      return "We have noted the merchant settlement concern. The merchant operations team will review the settlement status through official records.";
    case "agent_cash_in_issue":
      return "We have noted your concern about the cash-in transaction. The agent operations team will review the transaction record and follow official procedures.";
    case "phishing_or_social_engineering":
      return "Please do not share your PIN, OTP, password, or verification code with anyone. We have flagged this concern for review through official support channels.";
    default:
      return "We have noted your concern. Our support team will review the available information and guide you through official channels.";
  }
}

// ── 10. Confidence Score ──────────────────────────────────────────────────────

function calculateConfidence(
  txn: TransactionEntry | null,
  txnScore: number,
  signals: ExtractedSignals,
  evidenceVerdict: EvidenceVerdict,
  caseType: CaseType
): number {
  let confidence = 0.5;

  if (txn) {
    if (txnScore >= 6) confidence += 0.2;
    else if (txnScore >= 3) confidence += 0.1;

    if (signals.mentionedAmounts.some((amt) => txn.amount !== undefined && Math.abs(amt - txn.amount!) < 1)) {
      confidence += 0.1;
    }
    if (signals.mentionedCounterparties.length > 0) {
      confidence += 0.1;
    }
  } else {
    confidence -= 0.2;
  }

  // Keyword classification strength
  if (caseType !== "other") {
    confidence += 0.1;
  } else {
    confidence -= 0.1;
  }

  // Evidence verdict
  if (evidenceVerdict === "inconsistent") {
    confidence -= 0.2;
  } else if (evidenceVerdict === "insufficient_data") {
    confidence -= 0.1;
  }

  // Vague complaint
  if (signals.mentionedAmounts.length === 0 && signals.mentionedTransactionIds.length === 0) {
    confidence -= 0.1;
  }

  // Clamp between 0.1 and 0.95
  return Math.min(0.95, Math.max(0.1, Math.round(confidence * 100) / 100));
}

// ── 11. Reason Codes ──────────────────────────────────────────────────────────

function buildReasonCodes(
  caseType: CaseType,
  txn: TransactionEntry | null,
  signals: ExtractedSignals,
  evidenceVerdict: EvidenceVerdict,
  humanReview: boolean,
  isDuplicate: boolean,
  severity: Severity
): string[] {
  const codes: string[] = [];

  // Case type
  codes.push(caseType);

  // Transaction match
  if (txn) {
    codes.push("transaction_match");
    if (signals.mentionedAmounts.some((amt) => txn.amount !== undefined && Math.abs(amt - txn.amount!) < 1)) {
      codes.push("amount_match");
    }
    if (signals.mentionedCounterparties.length > 0) {
      codes.push("counterparty_match");
    }
    if (txn.type) {
      codes.push("type_match");
    }
    if (txn.status === "completed") codes.push("status_completed");
    if (txn.status === "failed") codes.push("status_failed");
    if (txn.status === "pending") codes.push("status_pending");
    if (txn.status === "reversed") codes.push("status_reversed");
  } else {
    codes.push("no_transaction_match");
  }

  if (evidenceVerdict === "insufficient_data") {
    if (!txn) codes.push("insufficient_history");
  }

  if (signals.hasPromptInjectionSignal) {
    codes.push("prompt_injection_detected");
  }
  if (signals.hasPinOtpPasswordSignal) {
    codes.push("credential_request_detected");
  }
  if (signals.hasScamSignal) {
    codes.push("phishing_signal");
  }
  if (isDuplicate) {
    codes.push("duplicate_payment_detected");
    codes.push("repeated_amount_counterparty");
  }
  if (humanReview) {
    codes.push("human_review_required");
  }
  if (severity === "high" || severity === "critical") {
    codes.push("high_value");
  }
  if (signals.mentionedAmounts.length === 0 && signals.mentionedTransactionIds.length === 0) {
    codes.push("ambiguous_complaint");
  }

  return [...new Set(codes)];
}

// ── 12. Final Safety Guardrails ───────────────────────────────────────────────

const UNSAFE_REPLY_PATTERNS = [
  "share your pin",
  "send otp",
  "give password",
  "send full card",
  "we will refund you",
  "refund confirmed",
  "reversal confirmed",
  "account recovery confirmed",
  "contact this number",
  "click this link",
  "your refund has been",
  "refund has been processed",
];

function applySafetyGuardrails(
  response: AnalyzeTicketResponse,
  caseType: CaseType
): AnalyzeTicketResponse {
  let modified = false;

  const replyLower = response.customer_reply.toLowerCase();
  const actionLower = response.recommended_next_action.toLowerCase();

  for (const pattern of UNSAFE_REPLY_PATTERNS) {
    if (replyLower.includes(pattern) || actionLower.includes(pattern)) {
      modified = true;
      break;
    }
  }

  if (modified) {
    response.customer_reply = generateCustomerReply(caseType);
    response.recommended_next_action = generateRecommendedNextAction(caseType, response.evidence_verdict);
    response.human_review_required = true;
    if (!response.reason_codes.includes("safety_guardrail_applied")) {
      response.reason_codes.push("safety_guardrail_applied");
    }
  }

  // Ensure required fields always have valid enum values
  const validEvidenceVerdicts = ["consistent", "inconsistent", "insufficient_data"];
  if (!validEvidenceVerdicts.includes(response.evidence_verdict)) {
    response.evidence_verdict = "insufficient_data";
  }

  const validCaseTypes = [
    "wrong_transfer", "payment_failed", "refund_request", "duplicate_payment",
    "merchant_settlement_delay", "agent_cash_in_issue", "phishing_or_social_engineering", "other",
  ];
  if (!validCaseTypes.includes(response.case_type)) {
    response.case_type = "other";
  }

  const validSeverities = ["low", "medium", "high", "critical"];
  if (!validSeverities.includes(response.severity)) {
    response.severity = "medium";
  }

  const validDepartments = [
    "customer_support", "dispute_resolution", "payments_ops",
    "merchant_operations", "agent_operations", "fraud_risk",
  ];
  if (!validDepartments.includes(response.department)) {
    response.department = "customer_support";
  }

  // Confidence bounds
  response.confidence = Math.min(0.95, Math.max(0.1, response.confidence));

  return response;
}

// ── Main Analysis Pipeline ────────────────────────────────────────────────────

export function analyzeTicket(input: AnalyzeTicketRequest): AnalyzeTicketResponse {
  const transactions = input.transaction_history ?? [];

  // Step 1: Extract signals
  const signals = extractSignals(input.complaint);

  // Step 2: Detect prompt injection (already in signals)

  // Step 3: Classify case type
  const caseType = classifyCaseType(signals);

  // Step 4: Find relevant transaction
  const { txn, score: txnScore, isDuplicate } = findRelevantTransaction(transactions, signals, caseType);

  // Step 5: Evidence verdict
  const evidenceVerdict = determineEvidenceVerdict(txn, caseType, signals, transactions);

  // Step 6: Severity
  const severity = determineSeverity(caseType, evidenceVerdict, signals, txn);

  // Step 7: Department
  const department = determineDepartment(caseType, severity, evidenceVerdict);

  // Step 8: Human review
  const humanReviewRequired = determineHumanReview(caseType, severity, evidenceVerdict, txn, signals);

  // Step 9: Agent summary
  const agentSummary = generateAgentSummary(caseType, evidenceVerdict, department, txn);

  // Step 10: Recommended next action
  const recommendedNextAction = generateRecommendedNextAction(caseType, evidenceVerdict);

  // Step 11: Customer reply
  const customerReply = generateCustomerReply(caseType);

  // Step 12: Confidence
  const confidence = calculateConfidence(txn, txnScore, signals, evidenceVerdict, caseType);

  // Step 13: Reason codes
  const reasonCodes = buildReasonCodes(
    caseType, txn, signals, evidenceVerdict, humanReviewRequired, isDuplicate, severity
  );

  // Step 14: Build response
  let response: AnalyzeTicketResponse = {
    ticket_id: input.ticket_id,
    relevant_transaction_id: txn?.transaction_id ?? null,
    evidence_verdict: evidenceVerdict,
    case_type: caseType,
    severity,
    department,
    agent_summary: agentSummary,
    recommended_next_action: recommendedNextAction,
    customer_reply: customerReply,
    human_review_required: humanReviewRequired,
    confidence,
    reason_codes: reasonCodes,
  };

  // Step 15: Final safety check
  response = applySafetyGuardrails(response, caseType);

  return response;
}
