// ============================================================
// QueueStorm Investigator — Core Analysis Engine (v3)
//
// Bug-fixes vs v2:
// 1. classifyCaseType: prompt injection suppresses phishing classification
//    so injected OTP/pin keywords don't hijack the real case type.
// 2. determineEvidenceVerdict: duplicate_payment now requires isDuplicate=true
//    to be "consistent"; plain keyword match without proof = "inconsistent".
// 3. refund_request verdict: checks matched txn TYPE (refund completed = inconsistent).
// 4. Phishing transaction matching threshold raised to 6 so unrelated
//    transactions in history don't get attached to phishing complaints.
// 5. determineSeverity: uses complaint-mentioned amounts (not txn amounts)
//    for most rules; per-case thresholds; prompt injection only → critical
//    when combined with credential/scam signal.
// 6. wrong_transfer severity: insufficient_data → medium, otherwise → high.
// 7. merchant_settlement_delay: failed status → high; pending → medium unless
//    complaint explicitly states high amount.
// 8. "other" case: matched txn → "consistent"; hasCashOutSignal used to score
//    cash_out transactions; hasBalanceIssueSignal → medium severity + human review.
// 9. Removed standalone "agent" from agentCashInKeywords (see normalize.ts).
// ============================================================

import { extractSignals } from "../../utils/normalize.js";
import {
  AnalyzeTicketRequest,
  AnalyzeTicketResponse,
  CaseType,
  Department,
  EvidenceVerdict,
  ExtractedSignals,
  Language,
  Severity,
  TransactionEntry,
} from "./analyze-ticket.types.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number | undefined): string {
  if (amount === undefined) return "unknown amount";
  return `${amount.toLocaleString()} BDT`;
}

function fmtType(type: string | undefined): string {
  return type ? type.replace(/_/g, " ") : "transaction";
}

// ── 1. Case Classification ────────────────────────────────────────────────────

function classifyCaseType(signals: ExtractedSignals): CaseType {
  // Safety first — but SKIP phishing classification if prompt injection is
  // detected, because the pin/otp keywords come from the injected text, not
  // from a genuine phishing complaint. Real financial signals take precedence.
  if (!signals.hasPromptInjectionSignal && (signals.hasScamSignal || signals.hasPinOtpPasswordSignal)) {
    return "phishing_or_social_engineering";
  }
  if (signals.hasDuplicateSignal) return "duplicate_payment";
  if (signals.hasMerchantSignal) return "merchant_settlement_delay";
  if (signals.hasAgentCashInSignal) return "agent_cash_in_issue";
  if (signals.hasWrongTransferSignal) return "wrong_transfer";
  // Refund checked BEFORE payment_failed: "I want refund for my failed payment"
  // has both signals but refund intent is more specific.
  if (signals.hasRefundSignal) return "refund_request";
  if (signals.hasFailedPaymentSignal) return "payment_failed";
  return "other";
}

// ── Multi-transaction Pattern Detector ───────────────────────────────────────
// Looks for suspicious patterns across ALL transactions that a single best-score
// pick would miss. Returns a structured anomaly report for the agent summary.

interface MultiTxnAnomaly {
  type: "multiple_same_amount_different_recipients" | "failed_after_completed" | "none";
  transactions: TransactionEntry[];
  description: string;
}

function detectMultiTransactionAnomalies(
  transactions: TransactionEntry[],
  caseType: CaseType
): MultiTxnAnomaly {
  if (!transactions || transactions.length < 2) {
    return { type: "none", transactions: [], description: "" };
  }

  // ── Pattern 1: Same amount, transfers, different recipients on the same day ─
  // Catches TKT-008: "sent 1000 to brother" but 2 different recipients received 1000
  const transfers = transactions.filter((t) => t.type === "transfer" || t.type === "payment");
  if (transfers.length >= 2) {
    // Group by amount
    const byAmount: Map<number, TransactionEntry[]> = new Map();
    for (const t of transfers) {
      if (t.amount === undefined) continue;
      const existing = byAmount.get(t.amount) ?? [];
      existing.push(t);
      byAmount.set(t.amount, existing);
    }
    for (const [, group] of byAmount) {
      if (group.length >= 2) {
        // Check if they have different counterparties
        const counterparties = [...new Set(group.map((t) => t.counterparty).filter(Boolean))];
        if (counterparties.length >= 2) {
          return {
            type: "multiple_same_amount_different_recipients",
            transactions: group,
            description:
              `Found ${group.length} transfers of ${fmt(group[0]?.amount)} to ` +
              `${counterparties.length} different recipients: ${counterparties.join(", ")}. ` +
              `This pattern suggests a possible wrong transfer or unintended duplicate.`,
          };
        }
      }
    }
  }

  // ── Pattern 2: Completed transfer followed by a failed retry to same recipient ─
  // Catches: completed TXN → failed TXN to same counterparty → customer confused
  const completedTransfers = transfers.filter((t) => t.status === "completed");
  const failedTransfers = transfers.filter((t) => t.status === "failed");
  for (const failed of failedTransfers) {
    const matchingCompleted = completedTransfers.find(
      (c) => c.counterparty === failed.counterparty && Math.abs((c.amount ?? 0) - (failed.amount ?? 0)) < 1
    );
    if (matchingCompleted) {
      return {
        type: "failed_after_completed",
        transactions: [matchingCompleted, failed],
        description:
          `A transfer of ${fmt(failed.amount)} to ${failed.counterparty} was completed (${matchingCompleted.transaction_id}) ` +
          `but a subsequent retry (${failed.transaction_id}) failed. ` +
          `The original transfer likely went through — the failed retry may have caused confusion.`,
      };
    }
  }

  return { type: "none", transactions: [], description: "" };
}

// ── 2. Transaction Matching ───────────────────────────────────────────────────

// Maps case types to their "natural" transaction types
const TYPE_ALIGNMENT: Partial<Record<CaseType, TransactionEntry["type"][]>> = {
  wrong_transfer: ["transfer"],
  payment_failed: ["payment"],
  duplicate_payment: ["payment"],
  merchant_settlement_delay: ["settlement"],
  agent_cash_in_issue: ["cash_in"],
  refund_request: ["refund", "payment", "transfer"],
  phishing_or_social_engineering: ["transfer", "payment", "cash_out"],
};

// Maps case types to their "natural" transaction statuses
const STATUS_ALIGNMENT: Partial<Record<CaseType, TransactionEntry["status"][]>> = {
  wrong_transfer: ["completed", "pending"],  // money sent (wrong transfer) OR still in-flight
  payment_failed: ["failed", "pending"],
  duplicate_payment: ["completed", "pending"],
  merchant_settlement_delay: ["pending", "failed"],
  agent_cash_in_issue: ["pending", "failed"],
  refund_request: ["completed", "failed", "pending"],
};

function scoreTransaction(
  txn: TransactionEntry,
  signals: ExtractedSignals,
  caseType: CaseType
): number {
  let score = 0;
  const txnId = txn.transaction_id?.toUpperCase() ?? "";

  // ── Highest signal: TXN-ID directly mentioned in complaint ───────────────
  if (signals.mentionedTransactionIds.some((id) => id.toUpperCase() === txnId)) {
    score += 6;
  }

  // ── Amount match ──────────────────────────────────────────────────────────
  if (txn.amount !== undefined && signals.mentionedAmounts.length > 0) {
    if (signals.mentionedAmounts.some((amt) => Math.abs(amt - txn.amount!) < 1)) {
      score += 3; // exact match
    } else if (signals.mentionedAmounts.some((amt) => Math.abs(amt - txn.amount!) / txn.amount! < 0.1)) {
      score += 1; // ~10% tolerance
    }
    // Large contradiction penalty
    const maxMentioned = Math.max(...signals.mentionedAmounts);
    if (txn.amount > maxMentioned * 5 || txn.amount < maxMentioned * 0.1) {
      score -= 2;
    }
  }

  // ── Counterparty / phone number match ────────────────────────────────────
  if (signals.mentionedCounterparties.length > 0 && txn.counterparty) {
    const normTxnCp = txn.counterparty.replace(/\s/g, "").toLowerCase();
    if (
      signals.mentionedCounterparties.some((cp) => {
        const c = cp.replace(/\s/g, "").toLowerCase();
        return c === normTxnCp || normTxnCp.includes(c) || c.includes(normTxnCp);
      })
    ) {
      score += 3;
    }
  }

  // ── Type alignment ────────────────────────────────────────────────────────
  if (txn.type) {
    if (TYPE_ALIGNMENT[caseType]?.includes(txn.type)) {
      score += 2;
      // Extra bonus for the most specific type in refund_request
      if (caseType === "refund_request" && txn.type === "refund") score += 1;
    } else {
      // Strong contradiction: type clearly does not belong to this case
      const contradictions: Partial<Record<CaseType, TransactionEntry["type"][]>> = {
        wrong_transfer: ["settlement", "refund"],
        payment_failed: ["cash_in", "settlement", "refund"],
        agent_cash_in_issue: ["settlement", "payment", "cash_out"],
        merchant_settlement_delay: ["cash_in", "cash_out", "refund"],
      };
      if (contradictions[caseType]?.includes(txn.type)) score -= 2;
    }

    // For "other" case: match by activity type using extracted signals
    if (caseType === "other") {
      if (signals.hasCashOutSignal && txn.type === "cash_out") score += 2;
      if (signals.hasRefundSignal && txn.type === "refund") score += 2;
    }
  }

  // ── Status alignment ──────────────────────────────────────────────────────
  if (txn.status && STATUS_ALIGNMENT[caseType]?.includes(txn.status)) {
    score += 2;
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

  // ── Duplicate payment: look for same-amount same-counterparty pair ────────
  if (caseType === "duplicate_payment") {
    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        const a = transactions[i]!;
        const b = transactions[j]!;
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
    // No real duplicate pair found — fall through to best-score matching
    // so we still pick the most relevant single transaction (verdict = inconsistent)
  }

  let bestTxn: TransactionEntry | null = null;
  let bestScore = -Infinity;

  for (const txn of transactions) {
    const s = scoreTransaction(txn, signals, caseType);
    if (s > bestScore) {
      bestScore = s;
      bestTxn = txn;
    }
  }

  // ── Adaptive threshold ────────────────────────────────────────────────────
  // Phishing: only match if TXN-ID or amount+counterparty explicitly reference it (score≥6)
  // because phishing complaints normally have no directly related transaction.
  if (caseType === "phishing_or_social_engineering") {
    return { txn: bestScore >= 6 ? bestTxn : null, score: Math.max(0, bestScore), isDuplicate: false };
  }

  // Vague complaint (no amounts, no TXN-IDs): lower threshold so type+status alone matches.
  // merchant_settlement_delay: also match when complaint is specific but txn has wrong status
  // (e.g. settlement completed but complaint says not received — we want to return it as inconsistent).
  const isVague = signals.mentionedAmounts.length === 0 && signals.mentionedTransactionIds.length === 0;
  // For merchant/agent/wrong_transfer: lower threshold to 1 so that type-only match works
  // even when counterparty is not extractable (e.g. "MRC-4040" doesn't parse as phone).
  const THRESHOLD = isVague ? 1 : 2;

  return {
    txn: bestScore >= THRESHOLD ? bestTxn : null,
    score: Math.max(0, bestScore),
    isDuplicate: false,
  };
}

// ── 3. Evidence Verdict ───────────────────────────────────────────────────────

function determineEvidenceVerdict(
  txn: TransactionEntry | null,
  caseType: CaseType,
  signals: ExtractedSignals,
  transactions: TransactionEntry[],
  isDuplicate: boolean
): EvidenceVerdict {
  if (transactions.length === 0 || !txn) return "insufficient_data";

  // ── INCONSISTENT checks ───────────────────────────────────────────────────

  // payment_failed: complained payment actually went through
  if (caseType === "payment_failed" && txn.status === "completed") return "inconsistent";

  // wrong_transfer: claimed money was sent, but it never went through
  if (caseType === "wrong_transfer" && (txn.status === "failed" || txn.status === "reversed")) return "inconsistent";

  // agent_cash_in_issue: claimed cash-in not reflected, but it completed fine
  if (caseType === "agent_cash_in_issue" && txn.status === "completed") return "inconsistent";

  // merchant_settlement_delay: Complaint says merchant didn't receive but settlement is completed
  if (caseType === "merchant_settlement_delay" && txn.status === "completed") return "inconsistent";

  // duplicate_payment: complaint says double-charged, but no actual duplicate pair found
  if (caseType === "duplicate_payment" && !isDuplicate) return "inconsistent";

  // Complaint says refund not received but reversed already, OR matched a completed refund txn
  if (caseType === "refund_request") {
    if (txn.type === "refund" && txn.status === "completed") return "inconsistent";
    if (txn.status === "reversed") return "inconsistent";
  }

  // Amount mentioned in complaint but wildly different from matched txn
  if (
    signals.mentionedAmounts.length > 0 &&
    txn.amount !== undefined &&
    !signals.mentionedAmounts.some((a) => Math.abs(a - txn.amount!) / Math.max(txn.amount!, 1) < 0.15)
  ) {
    const maxMentioned = Math.max(...signals.mentionedAmounts);
    if (Math.abs(maxMentioned - txn.amount) / Math.max(txn.amount, 1) > 0.5) return "inconsistent";
  }

  // ── CONSISTENT checks ─────────────────────────────────────────────────────

  // wrong_transfer: transfer that completed (or is still pending) supports the claim
  if (caseType === "wrong_transfer") {
    if (txn.status === "completed" || txn.status === "pending") return "consistent";
  }

  // payment_failed: failed/pending payment supports the complaint
  if (caseType === "payment_failed") {
    if (txn.status === "failed" || txn.status === "pending") return "consistent";
  }

  // duplicate_payment: only consistent if a genuine duplicate pair was confirmed
  if (caseType === "duplicate_payment" && isDuplicate) return "consistent";

  // merchant_settlement_delay: pending/failed settlement supports the complaint
  if (caseType === "merchant_settlement_delay") {
    if (txn.status === "pending" || txn.status === "failed") return "consistent";
    if (txn.type === "settlement") return "consistent"; // completed-late is still consistent
  }

  // agent_cash_in_issue: pending/failed cash-in supports the complaint
  if (caseType === "agent_cash_in_issue") {
    if (txn.status === "pending" || txn.status === "failed") return "consistent";
    if (txn.type === "cash_in") return "consistent";
  }

  // refund_request: transaction exists, not yet reversed/completed-refund → consistent
  if (caseType === "refund_request") {
    return "consistent"; // we've already excluded the inconsistent cases above
  }

  // phishing: verdict is signal-based, not transaction-based
  if (caseType === "phishing_or_social_engineering") {
    return txn.status === "completed" || txn.status === "pending" ? "consistent" : "insufficient_data";
  }

  // other: any matched transaction is evidence
  if (caseType === "other") return "consistent";

  // Fallback: type alignment gives partial support
  if (txn.type && TYPE_ALIGNMENT[caseType]?.includes(txn.type)) return "consistent";

  return "insufficient_data";
}

// ── 4. Severity ───────────────────────────────────────────────────────────────

function determineSeverity(
  caseType: CaseType,
  evidenceVerdict: EvidenceVerdict,
  signals: ExtractedSignals,
  txn: TransactionEntry | null
): Severity {
  if (caseType === "phishing_or_social_engineering") return "critical";

  // Prompt injection + credential/scam signal together = critical (active attack attempt)
  if (
    signals.hasPromptInjectionSignal &&
    (signals.hasPinOtpPasswordSignal || signals.hasScamSignal)
  ) {
    return "critical";
  }

  // Use complaint-mentioned amounts for severity decisions (not txn amounts).
  // This avoids inflating severity when the customer didn't mention a high amount.
  // Exception: for merchant settlements, use txn amount since merchants rarely
  // state it verbally in complaints.
  const mentionedMax = signals.mentionedAmounts.length > 0 ? Math.max(...signals.mentionedAmounts) : 0;

  // ── wrong_transfer ────────────────────────────────────────────────────────
  if (caseType === "wrong_transfer") {
    // No evidence means uncertain scope → medium; any evidence present → high
    return evidenceVerdict === "insufficient_data" ? "medium" : "high";
  }

  // ── Global high-value threshold (complaint explicitly mentions ≥10 000) ───
  if (mentionedMax >= 10000) return "high";

  // ── payment_failed ────────────────────────────────────────────────────────
  if (caseType === "payment_failed") {
    return mentionedMax >= 5000 ? "high" : "medium";
  }

  // ── duplicate_payment ─────────────────────────────────────────────────────
  if (caseType === "duplicate_payment") {
    return mentionedMax >= 5000 ? "high" : "medium";
  }

  // ── merchant_settlement_delay ─────────────────────────────────────────────
  if (caseType === "merchant_settlement_delay") {
    // Failed settlement is more urgent; also escalate if large explicit amount
    if (txn?.status === "failed") return "high";
    if (mentionedMax >= 10000) return "high";
    return "medium";
  }

  // ── agent_cash_in_issue ───────────────────────────────────────────────────
  if (caseType === "agent_cash_in_issue") {
    if (mentionedMax >= 10000) return "high";
    return "medium";
  }

  // ── refund_request ────────────────────────────────────────────────────────
  if (caseType === "refund_request") {
    return mentionedMax >= 5000 ? "high" : "medium";
  }

  // ── other ─────────────────────────────────────────────────────────────────
  if (caseType === "other") {
    if (signals.hasBalanceIssueSignal || signals.hasCashOutSignal) return "medium";
    return "low";
  }

  return "medium";
}

// ── 5. Department Routing ─────────────────────────────────────────────────────

function determineDepartment(
  caseType: CaseType,
  severity: Severity,
  evidenceVerdict: EvidenceVerdict
): Department {
  switch (caseType) {
    case "wrong_transfer": return "dispute_resolution";
    case "payment_failed": return "payments_ops";
    case "duplicate_payment": return "payments_ops";
    case "merchant_settlement_delay": return "merchant_operations";
    case "agent_cash_in_issue": return "agent_operations";
    case "phishing_or_social_engineering": return "fraud_risk";
    case "refund_request":
      return severity === "high" || severity === "critical" || evidenceVerdict === "inconsistent"
        ? "dispute_resolution"
        : "customer_support";
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
  if (caseType === "merchant_settlement_delay") return true;
  if (caseType === "agent_cash_in_issue") return true;
  if (severity === "high" || severity === "critical") return true;
  if (evidenceVerdict === "inconsistent") return true;
  if (evidenceVerdict === "insufficient_data" && caseType !== "other") return true;
  if (txn?.amount !== undefined && txn.amount >= 5000) return true;
  if (caseType === "payment_failed") return true;
  if (caseType === "refund_request") return true;
  // "other" with financial signals warrants human review
  if (caseType === "other" && (signals.hasBalanceIssueSignal || signals.hasCashOutSignal)) return true;
  return false;
}

// ── 7. Agent Summary (DATA-RICH) ──────────────────────────────────────────────

function generateAgentSummary(
  caseType: CaseType,
  evidenceVerdict: EvidenceVerdict,
  department: Department,
  txn: TransactionEntry | null,
  signals: ExtractedSignals,
  transactions: TransactionEntry[],
  anomaly: MultiTxnAnomaly,
  isBuyersRemorse: boolean
): string {
  const caseLabel = caseType.replace(/_/g, " ");
  const dept = department.replace(/_/g, " ");

  // ── Multi-transaction anomaly: always surface the full picture ───────────
  if (anomaly.type !== "none" && anomaly.transactions.length > 0) {
    const txnList = anomaly.transactions
      .map((t) => `${t.transaction_id} (${fmtType(t.type)}, ${fmt(t.amount ?? 0)} → ${t.counterparty ?? "unknown"}, ${t.status})`)
      .join(" | ");
    return (
      `Customer reports a ${caseLabel} issue. ANOMALY DETECTED — ${anomaly.description} ` +
      `Affected transactions: [${txnList}]. ` +
      `Evidence verdict: ${evidenceVerdict}. Manual investigation required — case routed to ${dept}.`
    );
  }

  // ── Buyer's remorse: flag it explicitly for the agent ────────────────────
  if (isBuyersRemorse && caseType === "refund_request" && txn) {
    return (
      `Customer requests a refund of ${fmt(txn.amount)} for transaction ${txn.transaction_id} ` +
      `(${fmtType(txn.type)} to ${txn.counterparty ?? "merchant"}, status: ${txn.status ?? "unknown"}). ` +
      `BUYER\'S REMORSE DETECTED — customer explicitly states they changed their mind / no longer want the product. ` +
      `This is a voluntary cancellation, not a system failure. Platform refund policy likely does not apply. ` +
      `Agent should advise customer to contact the merchant directly. Case routed to ${dept}.`
    );
  }

  if (txn) {
    const txnAmount = fmt(txn.amount);
    const txnType = fmtType(txn.type);
    const txnStatus = txn.status ?? "unknown";
    const txnCp = txn.counterparty ? ` to ${txn.counterparty}` : "";
    const txnTs = txn.timestamp ? ` on ${new Date(txn.timestamp).toUTCString()}` : "";

    let verdictNote: string;
    if (evidenceVerdict === "consistent") {
      verdictNote = "Transaction evidence is consistent with the complaint";
    } else if (evidenceVerdict === "inconsistent") {
      verdictNote = `Transaction evidence contradicts the complaint — ${txnType} of ${txnAmount} is marked ${txnStatus}, which conflicts with the reported issue`;
    } else {
      verdictNote = "Evidence is present but additional verification is needed";
    }

    return (
      `Customer reports a ${caseLabel} issue. Matched transaction: ${txn.transaction_id} ` +
      `(${txnType}, ${txnAmount}${txnCp}, status: ${txnStatus}${txnTs}). ` +
      `${verdictNote}. Case routed to ${dept}.`
    );
  }

  // ── Vague/other case: enumerate recent transaction history ───────────────
  if (caseType === "other" && transactions.length > 0) {
    const recentTxns = transactions
      .slice(-3) // last 3 transactions at most
      .map((t) => `${t.transaction_id} (${fmtType(t.type)}, ${fmt(t.amount)}, ${t.status})`)
      .join("; ");
    const amountHint =
      signals.mentionedAmounts.length > 0
        ? ` Customer mentioned approximately ${fmt(Math.max(...signals.mentionedAmounts))}.`
        : "";
    return (
      `Customer reports an unspecified financial concern.${amountHint} ` +
      `No specific keywords matched a known case type. ` +
      `Recent account activity on file: [${recentTxns}]. ` +
      `Agent should review these transactions with the customer and probe for the exact issue. Case routed to ${dept}.`
    );
  }

  const amountHint =
    signals.mentionedAmounts.length > 0
      ? ` involving approximately ${fmt(Math.max(...signals.mentionedAmounts))}`
      : "";
  const cpHint =
    signals.mentionedCounterparties.length > 0
      ? ` with counterparty ${signals.mentionedCounterparties[0]}`
      : "";

  return (
    `Customer reports a ${caseLabel} issue${amountHint}${cpHint}. ` +
    `No transaction in the provided history could be matched to this complaint. ` +
    `Manual investigation required — case routed to ${dept}.`
  );
}

// ── 8. Recommended Next Action ────────────────────────────────────────────────

function generateRecommendedNextAction(
  caseType: CaseType,
  evidenceVerdict: EvidenceVerdict,
  txn: TransactionEntry | null
): string {
  const txnRef = txn ? ` (reference: ${txn.transaction_id})` : "";

  switch (caseType) {
    case "wrong_transfer":
      return `Verify the matched transfer${txnRef} using approved internal tools. Confirm the intended recipient vs actual counterparty${txn?.counterparty ? ` (${txn.counterparty})` : ""}. Do not promise reversal before authorization from dispute_resolution.`;
    case "payment_failed":
      return `Check the ledger status for transaction${txnRef}. Confirm debit vs credit posting. If balance was deducted but merchant did not receive, follow the official failed-payment recovery workflow.`;
    case "refund_request":
      return `Review transaction${txnRef} eligibility against refund policy. Verify current status${txn ? ` (currently: ${txn.status})` : ""}. Do not confirm refund before supervisor authorization.`;
    case "duplicate_payment":
      return `Pull full payment records${txnRef ? " around " + txnRef : ""} and compare amount, counterparty, and timestamp for duplicate entries. Escalate to payments_ops if confirmed double debit.`;
    case "merchant_settlement_delay":
      return `Check settlement batch status${txnRef}. Verify merchant ID and expected settlement window. Current status${txn ? `: ${txn.status}` : " unknown"}. Escalate to merchant_operations if overdue.`;
    case "agent_cash_in_issue":
      return `Verify cash-in transaction${txnRef} against ledger posting. Confirm agent ID and balance credit. Status${txn ? `: ${txn.status}` : " unknown"}. Escalate to agent_operations if credit not reflected.`;
    case "phishing_or_social_engineering":
      return `Escalate immediately to fraud_risk. Log any suspicious phone number, link, or account mentioned. Advise customer through official channels only — do not share internal data.`;
    default:
      return evidenceVerdict === "insufficient_data"
        ? `Request non-sensitive clarifying details: approximate time, amount${txnRef ? "" : ", or transaction reference"}. Do not request PIN, OTP, password, or card details.`
        : `Review available information${txnRef} and follow standard support workflow. Escalate if issue persists.`;
  }
}

// ── 9. Customer Reply (Language-Aware, Dynamic, Humanized) ───────────────────
// Generates a warm, empathetic, CONTEXT-SPECIFIC customer-facing reply.
// Every field (amount, txnId, counterparty, date, anomaly pattern) is woven
// directly into the sentence — no two tickets produce the same reply.

interface CustomerReplyContext {
  txnId?: string | null;
  amount?: number;
  counterparty?: string | null;
  isBuyersRemorse?: boolean;
  evidenceVerdict?: EvidenceVerdict;
  anomaly?: MultiTxnAnomaly;
}

// Formats a counterparty handle for human display
function fmtCp(cp: string | null | undefined): string {
  if (!cp) return "the recipient";
  if (cp.startsWith("+88") || cp.startsWith("01")) return `the number ${cp}`;
  if (cp.toUpperCase().startsWith("MERCHANT")) return `merchant ${cp}`;
  if (cp.toUpperCase().startsWith("AGENT")) return `agent ${cp}`;
  return cp;
}

function generateCustomerReply(
  caseType: CaseType,
  language: Language = "en",
  ctx: CustomerReplyContext = {}
): string {
  const { txnId, amount, counterparty, isBuyersRemorse, evidenceVerdict, anomaly } = ctx;

  // Shared building blocks
  const txnRef   = txnId   ? ` (${txnId})`          : "";
  const amtFmt   = amount  ? fmt(amount)             : null;
  const cpFmt    = fmtCp(counterparty);
  const amtSent  = amtFmt  ? `${amtFmt}`             : "the amount";
  const isInconsistent = evidenceVerdict === "inconsistent";

  // ─────────────────────────── ENGLISH ──────────────────────────────────────
  if (language === "en") {
    switch (caseType) {

      case "wrong_transfer": {
        const opening = amtFmt
          ? `We can see a transfer of ${amtFmt} was sent${counterparty ? ` to ${cpFmt}` : ""}${txnRef}.`
          : `We've received your report${txnRef} about the transfer.`;
        const status = isInconsistent
          ? `Our records currently show the transfer did not go through, but we're checking further to be sure.`
          : `Our records show the transfer was processed — our Dispute Resolution team will now investigate to confirm where the funds landed.`;
        return (
          `Hi there! We're really sorry to hear about this — we completely understand how stressful this must be. ` +
          `${opening} ${status} ` +
          `We'll keep you posted every step of the way and do everything possible to help. ` +
          `Please remember — our team will never ask for your PIN, OTP, or password. Don't share these with anyone.`
        );
      }

      case "payment_failed": {
        const opening = amtFmt
          ? `We can see a payment of ${amtFmt}${counterparty ? ` to ${cpFmt}` : ""}${txnRef} in your account.`
          : `We've received your report${txnRef} about the payment.`;
        const status = isInconsistent
          ? `Interestingly, our records indicate the payment may have gone through on our end — but we'll investigate further to make sure the full picture is clear.`
          : `The transaction appears to have encountered an issue on our end, and our Payments team is already on it.`;
        return (
          `We're really sorry to hear your payment didn't go through as expected. ${opening} ` +
          `${status} ` +
          `If any amount was deducted and the service wasn't delivered, rest assured it will be handled according to our policy. ` +
          `We'll get back to you very soon. Please don't share your PIN or OTP with anyone.`
        );
      }

      case "refund_request": {
        if (isBuyersRemorse) {
          const merchantLine = counterparty
            ? `to ${cpFmt}`
            : `to the merchant`;
          return (
            `Thank you for reaching out! We appreciate your honesty — we understand that sometimes plans change. ` +
            `However, we'd like to let you know that your payment of ${amtSent} ${merchantLine}${txnRef} was successfully completed, ` +
            `which means the funds have already been transferred to them. ` +
            `Unfortunately, our platform policy does not allow reversals based on a change of mind, since the merchant has already received the payment. ` +
            `We'd recommend reaching out directly to the merchant — they may be able to offer a refund or exchange. ` +
            `If you believe there was a technical error with the transaction itself, please let us know and we'll gladly look into it.`
          );
        }
        const opening = amtFmt
          ? `We've received your refund request for ${amtFmt}${counterparty ? ` paid to ${cpFmt}` : ""}${txnRef}.`
          : `We've received your refund request${txnRef}.`;
        return (
          `${opening} We truly understand how important this is for you, and we're treating it with priority. ` +
          `Our team is reviewing the transaction details right now and will verify eligibility as quickly as possible. ` +
          `Refund decisions are subject to our official policy and may require a brief verification window. ` +
          `We appreciate your patience — we'll keep you updated. Please do not share your PIN or OTP with anyone.`
        );
      }

      case "duplicate_payment": {
        const opening = amtFmt
          ? `We can see a payment of ${amtFmt}${counterparty ? ` to ${cpFmt}` : ""}${txnRef} in your records.`
          : `We've received your report${txnRef} about the possible duplicate.`;
        return (
          `We completely understand how worrying a double charge can be — and we want to sort this out for you right away! ` +
          `${opening} ` +
          `Our Payments team will now carefully review all relevant records to confirm whether a duplicate deduction actually occurred. ` +
          `If a double charge is confirmed, it will be corrected through our official process. We'll update you as soon as we have a finding.`
        );
      }

      case "merchant_settlement_delay": {
        const opening = amtFmt
          ? `We've noted your concern about the delayed settlement of ${amtFmt}${txnRef}.`
          : `We've noted your settlement concern${txnRef}.`;
        return (
          `We're sorry for the inconvenience — we know how critical timely settlements are for your business. ` +
          `${opening} ` +
          `Our Merchant Operations team will review the settlement batch status immediately and follow up through official channels. ` +
          `We appreciate your patience and will get back to you as soon as possible.`
        );
      }

      case "agent_cash_in_issue": {
        const opening = amtFmt
          ? `We can see a cash-in of ${amtFmt}${counterparty ? ` via ${cpFmt}` : ""}${txnRef} in your history.`
          : `We've received your cash-in report${txnRef}.`;
        return (
          `We're sorry your balance hasn't updated yet — that's definitely frustrating and we understand your concern. ` +
          `${opening} ` +
          `Our Agent Operations team will verify the transaction against our ledger right away. ` +
          `If there's any discrepancy, we'll follow the proper procedure to get it credited to your account. We'll be in touch shortly.`
        );
      }

      case "phishing_or_social_engineering":
        return (
          `Thank you for reporting this immediately — you absolutely did the right thing. ` +
          `We want to be very clear: our team will NEVER ask for your PIN, OTP, password, or any verification code — not through calls, messages, or any channel. ` +
          `Please do NOT share these details with anyone, even if they claim to be from our support team. ` +
          `We've flagged this incident for our Fraud & Risk team to investigate urgently. ` +
          `If you think your account may have been accessed without your permission, please change your PIN right now through the app.`
        );

      default: {
        // "other" case with anomaly — describe the pattern specifically
        if (anomaly && anomaly.type === "multiple_same_amount_different_recipients") {
          const txnCount = anomaly.transactions.length;
          const amountMentioned = anomaly.transactions[0]?.amount;
          const uniqueCps = [...new Set(anomaly.transactions.map(t => t.counterparty).filter(Boolean))];
          return (
            `Thank you for getting in touch — we understand something doesn't feel right about your account activity, and we take that very seriously. ` +
            `Looking at your recent history, we can see ${txnCount} transfer${txnCount > 1 ? "s" : ""} of ${amountMentioned ? fmt(amountMentioned) : "the same amount"} ` +
            `going to ${uniqueCps.length > 1 ? `${uniqueCps.length} different recipients (${uniqueCps.join(", ")})` : "the same recipient"}, which looks unusual. ` +
            `Our support team will review this carefully and get back to you with a clear explanation of what happened and what the next steps are. ` +
            `Please do not share your PIN or OTP with anyone while we investigate.`
          );
        }
        if (anomaly && anomaly.type === "failed_after_completed") {
          const completedTxn = anomaly.transactions[0];
          const failedTxn = anomaly.transactions[1];
          return (
            `Thank you for reaching out — we can see why this is confusing. ` +
            `Looking at your transaction history, it appears a transfer${completedTxn?.amount ? ` of ${fmt(completedTxn.amount)}` : ""} ` +
            `to ${fmtCp(completedTxn?.counterparty)} was successfully completed${completedTxn?.transaction_id ? ` (${completedTxn.transaction_id})` : ""}, ` +
            `but a follow-up attempt${failedTxn?.transaction_id ? ` (${failedTxn.transaction_id})` : ""} did not go through. ` +
            `This may be why the recipient appears not to have received the money — the original transfer likely did go through. ` +
            `Our team will investigate and confirm the exact status. Please do not share your PIN or OTP with anyone.`
          );
        }
        // Fully vague — ask for more info gracefully
        return (
          `Thank you for reaching out to us! We understand you have a concern about your account and we genuinely want to help. ` +
          `To make sure we look into the right transaction, could you share a bit more detail — ` +
          `such as the approximate date, the amount involved, or who you sent it to? ` +
          `This will help our team investigate much faster. In the meantime, please do not share your PIN or OTP with anyone.`
        );
      }
    }
  }

  // ─────────────────────────── BANGLA ───────────────────────────────────────
  if (language === "bn") {
    switch (caseType) {

      case "wrong_transfer": {
        const opening = amtFmt
          ? `আমরা দেখতে পাচ্ছি ${amtFmt} এর একটি ট্রান্সফার${counterparty ? ` ${cpFmt}-এ` : ""} সম্পন্ন হয়েছে${txnRef}।`
          : `আপনার অভিযোগ${txnRef} আমাদের কাছে পৌঁছেছে।`;
        return (
          `আপনার অভিযোগ পেয়ে আমরা সত্যিই দুঃখিত — এই পরিস্থিতি কতটা উদ্বেগজনক তা আমরা বুঝতে পারছি। ` +
          `${opening} আমাদের ডিসপিউট রেজোলিউশন দল এটি অগ্রাধিকারের ভিত্তিতে তদন্ত করবে। ` +
          `প্রতিটি পদক্ষেপে আপনাকে আপডেট জানানো হবে। ` +
          `মনে রাখবেন, আমাদের কোনো প্রতিনিধি আপনার পিন, ওটিপি বা পাসওয়ার্ড চাইবেন না।`
        );
      }

      case "payment_failed": {
        const opening = amtFmt
          ? `আমরা দেখতে পাচ্ছি ${amtFmt} এর একটি পেমেন্ট${txnRef} প্রক্রিয়াকরণের সময় সমস্যা হয়েছে।`
          : `আপনার পেমেন্ট অভিযোগ${txnRef} আমরা পেয়েছি।`;
        return (
          `আপনার পেমেন্ট সফল না হওয়ায় আমরা আন্তরিকভাবে দুঃখিত। ${opening} ` +
          `আমাদের পেমেন্টস দল এটি এখনই পর্যালোচনা করছেন। যদি আপনার অ্যাকাউন্ট থেকে টাকা কাটা হয়ে থাকে, আমাদের নীতিমালা অনুযায়ী তা সমাধান করা হবে। ` +
          `শীঘ্রই আপনাকে আপডেট জানানো হবে। পিন বা ওটিপি কারো সাথে শেয়ার করবেন না।`
        );
      }

      case "refund_request": {
        if (isBuyersRemorse) {
          return (
            `আপনার সাথে যোগাযোগ করার জন্য ধন্যবাদ। আমরা বুঝতে পারছি কখনো কখনো মন পরিবর্তন হয়। ` +
            `তবে জানাতে চাই, ${amtFmt ? `${amtFmt} এর` : "এই"} পেমেন্টটি${counterparty ? ` ${cpFmt}-কে` : " মার্চেন্টকে"} সফলভাবে পাঠানো হয়ে গেছে${txnRef}। ` +
            `শুধুমাত্র মন পরিবর্তনের কারণে আমাদের প্ল্যাটফর্মের পক্ষে এই লেনদেন বাতিল করা সম্ভব নয়। ` +
            `মার্চেন্টের সাথে সরাসরি যোগাযোগ করলে তারা সাহায্য করতে পারবেন। লেনদেনে কোনো প্রযুক্তিগত সমস্যা থাকলে আমাদের জানান।`
          );
        }
        const opening = amtFmt
          ? `${amtFmt} এর রিফান্ড অনুরোধ${txnRef} আমরা পেয়েছি।`
          : `আপনার রিফান্ড অনুরোধ${txnRef} পেয়েছি।`;
        return (
          `${opening} এটি আপনার জন্য কতটা গুরুত্বপূর্ণ তা আমরা বুঝি এবং এটিকে অগ্রাধিকার দিচ্ছি। ` +
          `আমাদের দল লেনদেনের বিবরণ যাচাই করে যত দ্রুত সম্ভব সিদ্ধান্ত নেবে। ` +
          `আপনার ধৈর্যের জন্য ধন্যবাদ — আমরা প্রতিটি আপডেট জানাব। পিন বা ওটিপি কারো সাথে শেয়ার করবেন না।`
        );
      }

      case "duplicate_payment": {
        const opening = amtFmt
          ? `আমরা দেখতে পাচ্ছি ${amtFmt} এর পেমেন্টটি${txnRef} নিয়ে আপনার উদ্বেগ রয়েছে।`
          : `দুইবার চার্জ হওয়ার অভিযোগ${txnRef} আমরা পেয়েছি।`;
        return (
          `দুইবার চার্জ হওয়ার বিষয়টি সত্যিই উদ্বেগজনক — এটি বুঝতে পারছি। ${opening} ` +
          `আমাদের পেমেন্টস দল সমস্ত প্রাসঙ্গিক রেকর্ড পর্যালোচনা করবেন। ডুপ্লিকেট চার্জ নিশ্চিত হলে প্রয়োজনীয় ব্যবস্থা নেওয়া হবে। ` +
          `শীঘ্রই আপনাকে আপডেট জানাব।`
        );
      }

      case "merchant_settlement_delay": {
        const opening = amtFmt
          ? `${amtFmt} এর সেটেলমেন্ট${txnRef} বিলম্বিত হওয়ার বিষয়টি আমরা নথিভুক্ত করেছি।`
          : `মার্চেন্ট সেটেলমেন্ট সংক্রান্ত অভিযোগ${txnRef} পেয়েছি।`;
        return (
          `সেটেলমেন্টে দেরির জন্য আমরা দুঃখিত — ব্যবসার জন্য সময়মতো সেটেলমেন্ট কতটা জরুরি তা আমরা জানি। ` +
          `${opening} আমাদের মার্চেন্ট অপারেশনস দল এটি এখনই পর্যালোচনা করবেন। দ্রুত আপডেট দেওয়া হবে।`
        );
      }

      case "agent_cash_in_issue": {
        const opening = amtFmt
          ? `আমরা দেখতে পাচ্ছি ${amtFmt} এর ক্যাশ ইন${counterparty ? ` (${cpFmt})` : ""}${txnRef} ব্যালেন্সে যোগ হয়নি।`
          : `ক্যাশ ইন সংক্রান্ত অভিযোগ${txnRef} পেয়েছি।`;
        return (
          `ব্যালেন্স আপডেট না হওয়াটা সত্যিই বিরক্তিকর — এজন্য আমরা আন্তরিকভাবে দুঃখিত। ` +
          `${opening} আমাদের এজেন্ট অপারেশনস দল লেজারের বিপরীতে এটি যাচাই করবেন এবং দ্রুত সমাধান করবেন। শীঘ্রই যোগাযোগ করা হবে।`
        );
      }

      case "phishing_or_social_engineering":
        return (
          `এটি রিপোর্ট করার জন্য আন্তরিক ধন্যবাদ — আপনি একদম সঠিক কাজ করেছেন। ` +
          `আমরা স্পষ্টভাবে জানাতে চাই: আমাদের কোনো প্রতিনিধি কখনো পিন, ওটিপি, পাসওয়ার্ড বা যাচাইকরণ কোড চাইবেন না। ` +
          `কোনো পরিস্থিতিতেই এই তথ্য কারো সাথে শেয়ার করবেন না। আমাদের ফ্রড ও রিস্ক দল এটি তদন্ত করছে। ` +
          `অ্যাকাউন্ট ক্ষতিগ্রস্ত মনে হলে এখনই অ্যাপ থেকে পিন পরিবর্তন করুন।`
        );

      default: {
        if (anomaly && anomaly.type === "multiple_same_amount_different_recipients") {
          const txnCount = anomaly.transactions.length;
          const amountMentioned = anomaly.transactions[0]?.amount;
          return (
            `আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ। আপনার অ্যাকাউন্টে সম্প্রতি কিছু অস্বাভাবিক লেনদেন দেখা যাচ্ছে — ` +
            `${amountMentioned ? `${fmt(amountMentioned)} টাকার ` : ""}${txnCount}টি ট্রান্সফার বিভিন্ন নম্বরে গেছে, যা আমাদের দৃষ্টিতে পড়েছে। ` +
            `আমাদের সাপোর্ট দল বিষয়টি বিস্তারিতভাবে পর্যালোচনা করবেন এবং আপনাকে একটি স্পষ্ট ব্যাখ্যা ও পরবর্তী পদক্ষেপ জানাবেন। ` +
            `তদন্তের সময় পিন বা ওটিপি কারো সাথে শেয়ার করবেন না।`
          );
        }
        if (anomaly && anomaly.type === "failed_after_completed") {
          const completedTxn = anomaly.transactions[0];
          return (
            `আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ — এই পরিস্থিতি বিভ্রান্তিকর হওয়াটাই স্বাভাবিক। ` +
            `আমরা দেখছি ${completedTxn?.amount ? `${fmt(completedTxn.amount)} টাকার` : "একটি"} ট্রান্সফার সফলভাবে সম্পন্ন হয়েছে${completedTxn?.transaction_id ? ` (${completedTxn.transaction_id})` : ""}, ` +
            `কিন্তু পরবর্তী একটি প্রচেষ্টা ব্যর্থ হয়েছে। মূল ট্রান্সফারটি সম্ভবত সফল হয়েছে। ` +
            `আমাদের দল বিস্তারিত যাচাই করবেন এবং সঠিক তথ্য জানাবেন। পিন বা ওটিপি কারো সাথে শেয়ার করবেন না।`
          );
        }
        return (
          `আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ। আপনার অ্যাকাউন্ট সম্পর্কিত উদ্বেগটি আমরা গুরুত্বের সাথে নিচ্ছি। ` +
          `দ্রুত সমাধানের জন্য অনুগ্রহ করে তারিখ, পরিমাণ বা লেনদেনের ধরন জানান — আমাদের দল তখন আরো দ্রুত সাহায্য করতে পারবেন। পিন বা ওটিপি কারো সাথে শেয়ার করবেন না।`
        );
      }
    }
  }

  // ──────────────────────── MIXED / BANGLISH ────────────────────────────────
  switch (caseType) {

    case "wrong_transfer": {
      const opening = amtFmt
        ? `${amtFmt} টা${counterparty ? ` ${cpFmt}-এ` : ""} transfer হয়ে গেছে${txnRef} — এটা আমরা দেখতে পাচ্ছি।`
        : `আপনার transfer এর complaint${txnRef} টা পেয়েছি।`;
      return (
        `আপনার complaint টা পেয়ে সত্যিই খারাপ লাগছে — এই situation এ আপনি কতটা stressed সেটা বুঝতে পারছি। ` +
        `${opening} আমাদের Dispute Resolution team এখনই এটা investigate করবে। ` +
        `প্রতিটা step এ আপনাকে update দেওয়া হবে। Please কখনো PIN বা OTP কারো সাথে share করবেন না।`
      );
    }

    case "payment_failed": {
      const opening = amtFmt
        ? `আমরা দেখতে পাচ্ছি ${amtFmt} এর payment${txnRef} expected ভাবে complete হয়নি।`
        : `আপনার payment complaint${txnRef} আমরা পেয়েছি।`;
      return (
        `Payment না হওয়াটা সত্যিই frustrating — এটা আমরা বুঝি। ${opening} ` +
        `আমাদের Payments team এটা এখনই review করছে। Balance deduct হলে সেটা policy অনুযায়ী handle করা হবে। ` +
        `Shortly আপনাকে update দেওয়া হবে। PIN বা OTP share করবেন না।`
      );
    }

    case "refund_request": {
      if (isBuyersRemorse) {
        return (
          `আপনার সাথে যোগাযোগের জন্য ধন্যবাদ। situation টা আমরা বুঝতে পারছি। ` +
          `কিন্তু একটু জানাই — ${amtFmt ? `${amtFmt} এর` : "এই"} payment${counterparty ? ` ${cpFmt}-কে` : " merchant কে"} successfully complete হয়ে গেছে${txnRef}। ` +
          `শুধু change of mind এর কারণে platform থেকে refund করা আমাদের policy তে নেই, কারণ টাকা চলে গেছে। ` +
          `Merchant এর সাথে directly কথা বললে তারা help করতে পারবে। Technical error থাকলে আমাদের জানান।`
        );
      }
      const opening = amtFmt
        ? `${amtFmt} এর refund request${txnRef} আমরা পেয়েছি।`
        : `Refund request${txnRef} পেয়েছি।`;
      return (
        `${opening} জানি এটা আপনার জন্য কতটা important। ` +
        `আমাদের team transaction details verify করবে এবং policy অনুযায়ী যত দ্রুত সম্ভব সমাধান করবে। ` +
        `একটু patience রাখুন — আমরা আপনাকে update রাখব। PIN বা OTP share করবেন না।`
      );
    }

    case "duplicate_payment": {
      const opening = amtFmt
        ? `${amtFmt} এর double charge${txnRef} এর বিষয়টা আমরা দেখছি।`
        : `Double charge এর complaint${txnRef} পেয়েছি।`;
      return (
        `Double charge হওয়াটা definitely concerning। ${opening} ` +
        `আমাদের Payments team সব transaction records review করবে এবং duplicate confirm হলে official process এ handle করা হবে। শীঘ্রই update আসবে।`
      );
    }

    case "merchant_settlement_delay": {
      const opening = amtFmt
        ? `${amtFmt} এর settlement${txnRef} delay হচ্ছে — এটা আমরা দেখছি।`
        : `Merchant settlement delay এর complaint${txnRef} পেয়েছি।`;
      return (
        `Merchant settlement এ দেরি হওয়াটা obviously business এর জন্য problem। ${opening} ` +
        `আমাদের Merchant Operations team এটা দেখবে এবং দ্রুত update দেওয়া হবে।`
      );
    }

    case "agent_cash_in_issue": {
      const opening = amtFmt
        ? `আমরা দেখতে পাচ্ছি ${amtFmt} এর cash in${counterparty ? ` (${cpFmt})` : ""}${txnRef} balance এ reflect হয়নি।`
        : `Cash in complaint${txnRef} পেয়েছি।`;
      return (
        `Balance update না হওয়াটা definitely inconvenient — এজন্য sorry। ${opening} ` +
        `আমাদের Agent Operations team এটা verify করবে এবং discrepancy থাকলে fix করা হবে। Shortly contact করা হবে।`
      );
    }

    case "phishing_or_social_engineering":
      return (
        `Report করার জন্য ধন্যবাদ — এটা করা একদম সঠিক ছিল। ` +
        `Clearly বলছি: আমাদের team কখনো PIN, OTP বা password চাইবে না — কেউ চাইলে সেটা definitely scam। Share করবেন না। ` +
        `আমাদের Fraud team এটা urgently investigate করবে। Account compromise হয়ে থাকলে এখনই app থেকে PIN change করুন।`
      );

    default: {
      if (anomaly && anomaly.type === "multiple_same_amount_different_recipients") {
        const txnCount = anomaly.transactions.length;
        const amountMentioned = anomaly.transactions[0]?.amount;
        const uniqueCps = [...new Set(anomaly.transactions.map(t => t.counterparty).filter(Boolean))];
        return (
          `আমাদের সাথে contact করার জন্য ধন্যবাদ। আপনার account এ কিছু unusual activity দেখা যাচ্ছে — ` +
          `${amountMentioned ? `${fmt(amountMentioned)} এর ` : ""}${txnCount}টা transfer ${uniqueCps.length > 1 ? `${uniqueCps.length}টা different number এ` : "same number এ"} গেছে${uniqueCps.length > 1 ? ` (${uniqueCps.join(", ")})` : ""}। ` +
          `এটা clearly investigate করা দরকার। আমাদের team পুরো history টা carefully দেখবে এবং আপনাকে exactly কী হয়েছে সেটা জানাবে। ` +
          `Please PIN বা OTP কারো সাথে share করবেন না।`
        );
      }
      if (anomaly && anomaly.type === "failed_after_completed") {
        const completedTxn = anomaly.transactions[0];
        return (
          `Confusing situation টার জন্য আমরা sorry। আমরা দেখতে পাচ্ছি ${completedTxn?.amount ? `${fmt(completedTxn.amount)} এর ` : ""}একটা transfer successfully complete হয়েছে${completedTxn?.transaction_id ? ` (${completedTxn.transaction_id})` : ""}, কিন্তু পরের attempt টা fail করেছে। ` +
          `Original transfer টা likely গেছে — আমাদের team confirm করবে। Update দেওয়া হবে। PIN বা OTP share করবেন না।`
        );
      }
      return (
        `আমাদের সাথে contact করার জন্য ধন্যবাদ! Account এর কোনো concern আছে — সেটা আমরা seriously নিচ্ছি। ` +
        `একটু বেশি detail দিলে — যেমন date, amount, বা কোন transaction — আমাদের team আরো দ্রুত help করতে পারবে। PIN বা OTP share করবেন না।`
      );
    }
  }
}

// ── 10. Confidence ────────────────────────────────────────────────────────────

function calculateConfidence(
  txn: TransactionEntry | null,
  txnScore: number,
  signals: ExtractedSignals,
  evidenceVerdict: EvidenceVerdict,
  caseType: CaseType
): number {
  let c = 0.5;

  if (txn) {
    if (txnScore >= 8) c += 0.30;
    else if (txnScore >= 6) c += 0.20;
    else if (txnScore >= 4) c += 0.15;
    else if (txnScore >= 2) c += 0.05;

    if (signals.mentionedAmounts.some((a) => txn.amount !== undefined && Math.abs(a - txn.amount!) < 1)) c += 0.10;
    if (signals.mentionedCounterparties.length > 0 && txn.counterparty) c += 0.05;
  } else {
    c -= 0.15;
  }

  if (caseType !== "other") c += 0.05; else c -= 0.10;

  if (evidenceVerdict === "consistent") c += 0.10;
  else if (evidenceVerdict === "inconsistent") c -= 0.15;
  else c -= 0.05;

  if (signals.mentionedAmounts.length === 0 && signals.mentionedTransactionIds.length === 0) c -= 0.05;

  return Math.min(0.95, Math.max(0.10, Math.round(c * 100) / 100));
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
  const codes: string[] = [caseType];

  if (txn) {
    codes.push("transaction_match");
    if (signals.mentionedAmounts.some((a) => txn.amount !== undefined && Math.abs(a - txn.amount!) < 1)) codes.push("amount_match");
    if (signals.mentionedCounterparties.length > 0 && txn.counterparty) codes.push("counterparty_match");
    if (txn.type && TYPE_ALIGNMENT[caseType]?.includes(txn.type)) codes.push("type_match");
    if (txn.status === "completed") codes.push("status_completed");
    if (txn.status === "failed") codes.push("status_failed");
    if (txn.status === "pending") codes.push("status_pending");
    if (txn.status === "reversed") codes.push("status_reversed");
  } else {
    codes.push("no_transaction_match");
    codes.push("insufficient_history");
  }

  if (evidenceVerdict === "inconsistent") codes.push("evidence_contradiction");
  if (signals.hasPromptInjectionSignal) codes.push("prompt_injection_detected");
  if (signals.hasPinOtpPasswordSignal) codes.push("credential_request_detected");
  if (signals.hasScamSignal) codes.push("phishing_signal");
  if (isDuplicate) { codes.push("duplicate_payment_detected"); codes.push("repeated_amount_counterparty"); }
  if (humanReview) codes.push("human_review_required");
  if (severity === "high" || severity === "critical") codes.push("high_value");
  if (signals.mentionedAmounts.length === 0 && signals.mentionedTransactionIds.length === 0) codes.push("ambiguous_complaint");

  return [...new Set(codes)];
}

// ── 12. Final Safety Guardrails ───────────────────────────────────────────────

const UNSAFE_PATTERNS = [
  "share your pin", "send otp", "give password", "send full card",
  "we will refund you", "refund confirmed", "reversal confirmed",
  "account recovery confirmed", "your refund has been processed",
];

function applySafetyGuardrails(
  response: AnalyzeTicketResponse,
  caseType: CaseType,
  evidenceVerdict: EvidenceVerdict,
  txn: TransactionEntry | null
): AnalyzeTicketResponse {
  const isUnsafe = UNSAFE_PATTERNS.some(
    (p) => response.customer_reply.toLowerCase().includes(p) || response.recommended_next_action.toLowerCase().includes(p)
  );

  if (isUnsafe) {
    response.customer_reply = generateCustomerReply(caseType);
    response.recommended_next_action = generateRecommendedNextAction(caseType, evidenceVerdict, txn);
    response.human_review_required = true;
    if (!response.reason_codes.includes("safety_guardrail_applied")) response.reason_codes.push("safety_guardrail_applied");
  }

  // Enum validation
  const V = {
    evidence_verdict: ["consistent", "inconsistent", "insufficient_data"],
    case_type: ["wrong_transfer", "payment_failed", "refund_request", "duplicate_payment", "merchant_settlement_delay", "agent_cash_in_issue", "phishing_or_social_engineering", "other"],
    severity: ["low", "medium", "high", "critical"],
    department: ["customer_support", "dispute_resolution", "payments_ops", "merchant_operations", "agent_operations", "fraud_risk"],
  };
  if (!V.evidence_verdict.includes(response.evidence_verdict)) response.evidence_verdict = "insufficient_data";
  if (!V.case_type.includes(response.case_type)) response.case_type = "other";
  if (!V.severity.includes(response.severity)) response.severity = "medium";
  if (!V.department.includes(response.department)) response.department = "customer_support";
  response.confidence = Math.min(0.95, Math.max(0.10, response.confidence));

  return response;
}

// ── Main Pipeline ─────────────────────────────────────────────────────────────

export function analyzeTicket(input: AnalyzeTicketRequest): AnalyzeTicketResponse {
  const transactions = input.transaction_history ?? [];
  const language: Language = input.language ?? "en";

  const signals = extractSignals(input.complaint);
  const caseType = classifyCaseType(signals);

  const { txn, score: txnScore, isDuplicate } = findRelevantTransaction(transactions, signals, caseType);

  // ── Multi-transaction anomaly detection ────────────────────────────────────
  // Run AFTER single-best-txn pick so we can cross-reference the winner.
  const anomaly = detectMultiTransactionAnomalies(transactions, caseType);

  // ── Buyer's remorse flag ───────────────────────────────────────────────────
  const isBuyersRemorse =
    caseType === "refund_request" && signals.hasBuyersRemorseSignal;

  const evidenceVerdict = determineEvidenceVerdict(txn, caseType, signals, transactions, isDuplicate);
  const severity = determineSeverity(caseType, evidenceVerdict, signals, txn);
  const department = determineDepartment(caseType, severity, evidenceVerdict);
  const humanReviewRequired = determineHumanReview(caseType, severity, evidenceVerdict, txn, signals);

  const agentSummary = generateAgentSummary(
    caseType, evidenceVerdict, department, txn, signals, transactions, anomaly, isBuyersRemorse
  );
  const recommendedNextAction = generateRecommendedNextAction(caseType, evidenceVerdict, txn);
  const customerReply = generateCustomerReply(caseType, language, {
    txnId: txn?.transaction_id ?? null,
    ...(txn?.amount !== undefined ? { amount: txn.amount } : {}),
    counterparty: txn?.counterparty ?? null,
    isBuyersRemorse,
    anomaly,
  } as Parameters<typeof generateCustomerReply>[2]);
  const confidence = calculateConfidence(txn, txnScore, signals, evidenceVerdict, caseType);
  const reasonCodes = buildReasonCodes(caseType, txn, signals, evidenceVerdict, humanReviewRequired, isDuplicate, severity);

  // Append anomaly reason code if detected
  if (anomaly.type !== "none") reasonCodes.push("multi_transaction_anomaly_detected");
  if (isBuyersRemorse) reasonCodes.push("buyers_remorse_detected");

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
    reason_codes: [...new Set(reasonCodes)],
  };

  return applySafetyGuardrails(response, caseType, evidenceVerdict, txn);
}
