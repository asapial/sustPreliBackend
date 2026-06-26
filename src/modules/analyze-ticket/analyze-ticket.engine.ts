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

// ── 9. Customer Reply (Language-Aware, Humanized) ─────────────────────────────
// Generates a warm, empathetic customer-facing reply.
// Language: "en" = English, "bn" = native Bangla, "mixed" = Banglish

interface CustomerReplyContext {
  txnId?: string | null;
  amount?: number;
  counterparty?: string | null;
  isBuyersRemorse?: boolean;
  anomaly?: MultiTxnAnomaly;
}

function generateCustomerReply(
  caseType: CaseType,
  language: Language = "en",
  ctx: CustomerReplyContext = {}
): string {
  const ref = ctx.txnId ? ` (Ref: ${ctx.txnId})` : "";
  const amtStr = ctx.amount ? ` ${fmt(ctx.amount)}` : "";

  // ── English replies ────────────────────────────────────────────────────────
  if (language === "en") {
    switch (caseType) {
      case "wrong_transfer":
        return (
          `Hi there! We're really sorry to hear about this — we completely understand how stressful it must be to have a transfer go to the wrong place. ` +
          `We've logged your concern${ref} and our Dispute Resolution team will look into it right away. ` +
          `We'll do everything we can to help resolve this as quickly as possible. ` +
          `In the meantime, please remember that our team will never ask for your PIN, OTP, or password — please don't share these with anyone.`
        );
      case "payment_failed":
        return (
          `We're sorry to hear your payment didn't go through as expected! We know how frustrating that can be. ` +
          `We've received your report${ref} and our Payments team is already reviewing the transaction details. ` +
          `If any amount was deducted from your account, rest assured it will be handled as per our policy. ` +
          `We'll get back to you with an update shortly. Please don't share your PIN or OTP with anyone.`
        );
      case "refund_request":
        if (ctx.isBuyersRemorse) {
          return (
            `Thank you for reaching out to us. We understand that sometimes plans change, and we appreciate your honesty. ` +
            `However, we'd like to let you know that once a payment is successfully completed to a merchant${amtStr}, ` +
            `our platform is unfortunately unable to process a reversal on the basis of a change of mind, as the funds have already been transferred to the merchant. ` +
            `We'd recommend reaching out directly to the merchant to discuss a possible refund or exchange at their discretion. ` +
            `If you believe there was an error with the transaction itself, please let us know and we'll be happy to investigate further.`
          );
        }
        return (
          `We've received your refund request${ref} and we truly understand how important this is to you. ` +
          `Our team is reviewing the transaction details and will verify eligibility as quickly as possible. ` +
          `Please note that refund decisions are subject to our official policy and may require a short verification period. ` +
          `We appreciate your patience and will keep you updated. Please do not share your PIN or OTP with anyone.`
        );
      case "duplicate_payment":
        return (
          `We completely understand how worrying it is to see what looks like a double charge — and we want to sort this out for you right away. ` +
          `We've flagged your concern${ref} and our Payments team will review all relevant transaction records to confirm whether a duplicate charge occurred. ` +
          `If a duplicate deduction is confirmed, it will be addressed through our official process. We'll update you as soon as we have more information.`
        );
      case "merchant_settlement_delay":
        return (
          `We're sorry to hear about the delay in your merchant settlement. We know how important timely settlements are to your business. ` +
          `We've noted your concern${ref} and our Merchant Operations team will review your settlement status immediately. ` +
          `We'll follow up with you through official channels as soon as we have an update.`
        );
      case "agent_cash_in_issue":
        return (
          `We're sorry to hear your cash-in hasn't reflected in your account yet — that must be really inconvenient. ` +
          `We've received your report${ref} and our Agent Operations team will verify the transaction record right away. ` +
          `If there's any discrepancy, we'll follow the proper procedure to get it resolved. We'll be in touch shortly.`
        );
      case "phishing_or_social_engineering":
        return (
          `Thank you for alerting us — you did the right thing by reporting this immediately. ` +
          `Please do NOT share your PIN, OTP, password, or any verification code with anyone, even if they claim to be from our support team. ` +
          `Our team will NEVER ask for these details. We've flagged this incident for our Fraud & Risk team to review. ` +
          `If you believe your account may have been compromised, please change your PIN immediately through the app.`
        );
      default:
        if (ctx.anomaly && ctx.anomaly.type !== "none") {
          return (
            `Thank you for reaching out to us. We can see there are a few transactions on your account that we'd like to look into more carefully on your behalf. ` +
            `We've logged your concern and our support team will review your recent transaction history to understand exactly what happened. ` +
            `We'll get back to you with a clear explanation and any next steps. Please do not share your PIN or OTP with anyone.`
          );
        }
        return (
          `Thank you for reaching out to us! We understand you have a concern about your account and we want to make sure we get to the bottom of it. ` +
          `Could you please share a bit more detail — such as the approximate date, amount, or transaction type you're referring to? ` +
          `This will help our team look into it much faster. In the meantime, please do not share your PIN or OTP with anyone.`
        );
    }
  }

  // ── Bangla replies (native Bangla script) ─────────────────────────────────
  if (language === "bn") {
    switch (caseType) {
      case "wrong_transfer":
        return (
          `আপনার অভিযোগ আমাদের কাছে পৌঁছে গেছে। ভুল নম্বরে টাকা চলে যাওয়া সত্যিই অনেক চিন্তার বিষয় — আমরা বুঝতে পারছি আপনি এখন কতটা উদ্বিগ্ন।` +
          `${ref ? ` আপনার লেনদেন${ref}` : " আপনার বিষয়টি"} আমাদের ডিসপিউট রেজোলিউশন দলে পাঠানো হয়েছে, যারা এটি অগ্রাধিকারের ভিত্তিতে দেখবেন। ` +
          `আমরা দ্রুত সমাধানের জন্য সব ধরনের সহায়তা করব। ` +
          `মনে রাখবেন, আমাদের কোনো প্রতিনিধিই আপনার পিন, ওটিপি বা পাসওয়ার্ড জানতে চাইবেন না — এই তথ্য কারো সাথে শেয়ার করবেন না।`
        );
      case "payment_failed":
        return (
          `আপনার পেমেন্টটি সফল না হওয়ায় আমরা দুঃখিত। এটি সত্যিই বিরক্তিকর অভিজ্ঞতা, এবং আমরা বুঝতে পারছি আপনি কতটা হতাশ হয়েছেন। ` +
          `আপনার অভিযোগ${ref} আমাদের পেমেন্টস দল পর্যালোচনা করছেন। ` +
          `যদি আপনার অ্যাকাউন্ট থেকে কোনো পরিমাণ কেটে নেওয়া হয়ে থাকে, নিশ্চিত থাকুন — আমাদের নীতিমালা অনুযায়ী তা সঠিকভাবে সমাধান করা হবে। শীঘ্রই আপনাকে আপডেট জানানো হবে।`
        );
      case "refund_request":
        if (ctx.isBuyersRemorse) {
          return (
            `আপনার সাথে যোগাযোগ করার জন্য ধন্যবাদ। আমরা বুঝতে পারছি যে কখনো কখনো মন পরিবর্তন হতে পারে। ` +
            `তবে আমরা জানাতে চাই যে, মার্চেন্টকে${amtStr} সফলভাবে পেমেন্ট সম্পন্ন হয়ে গেলে, শুধুমাত্র মন পরিবর্তনের কারণে আমাদের প্ল্যাটফর্মের পক্ষে সেই লেনদেন বাতিল করা সম্ভব নয়, কারণ টাকাটি মার্চেন্টের কাছে চলে গেছে। ` +
            `আপনি সরাসরি মার্চেন্টের সাথে যোগাযোগ করে রিফান্ড বা বিনিময়ের বিষয়ে আলোচনা করতে পারেন। ` +
            `যদি লেনদেনে কোনো প্রযুক্তিগত সমস্যা হয়ে থাকে, আমাদের জানান — আমরা সেক্ষেত্রে সাহায্য করতে প্রস্তুত।`
          );
        }
        return (
          `আপনার রিফান্ড অনুরোধ${ref} আমরা পেয়েছি এবং বুঝতে পারছি এটি আপনার জন্য কতটা গুরুত্বপূর্ণ। ` +
          `আমাদের দল লেনদেনের তথ্য যাচাই করে যত দ্রুত সম্ভব আপনাকে জানাবে। ` +
          `রিফান্ড প্রক্রিয়াটি আমাদের অফিশিয়াল নীতিমালা অনুযায়ী সম্পন্ন হবে। আপনার ধৈর্যের জন্য ধন্যবাদ। পিন বা ওটিপি কারো সাথে শেয়ার করবেন না।`
        );
      case "duplicate_payment":
        return (
          `দুইবার চার্জ হওয়ার বিষয়টি সত্যিই উদ্বেগজনক — আমরা এটি বুঝতে পারছি। ` +
          `আপনার অভিযোগ${ref} আমাদের পেমেন্টস দল পর্যালোচনা করবেন এবং ডুপ্লিকেট চার্জ নিশ্চিত হলে প্রয়োজনীয় ব্যবস্থা নেওয়া হবে। ` +
          `আমরা শীঘ্রই আপনাকে আপডেট জানাব।`
        );
      case "merchant_settlement_delay":
        return (
          `মার্চেন্ট সেটেলমেন্টে দেরি হওয়ায় আমরা দুঃখিত। আমরা জানি ব্যবসার জন্য সময়মতো সেটেলমেন্ট কতটা জরুরি। ` +
          `আপনার বিষয়টি${ref} আমাদের মার্চেন্ট অপারেশনস দলে পাঠানো হয়েছে। দ্রুত আপডেট দেওয়া হবে।`
        );
      case "agent_cash_in_issue":
        return (
          `ক্যাশ ইন ব্যালেন্সে না আসাটা সত্যিই অসুবিধাজনক — আমরা ক্ষমাপ্রার্থী। ` +
          `আপনার অভিযোগ${ref} আমাদের এজেন্ট অপারেশনস দল তদন্ত করবেন এবং দ্রুত সমাধান করা হবে। শীঘ্রই আপনার সাথে যোগাযোগ করা হবে।`
        );
      case "phishing_or_social_engineering":
        return (
          `এটি রিপোর্ট করার জন্য আপনাকে ধন্যবাদ — আপনি একদম সঠিক কাজ করেছেন। ` +
          `অনুগ্রহ করে কাউকে আপনার পিন, ওটিপি, পাসওয়ার্ড বা যেকোনো যাচাইকরণ কোড শেয়ার করবেন না, এমনকি যদি কেউ আমাদের প্রতিনিধি বলে দাবি করে। ` +
          `আমাদের ফ্রড ও রিস্ক দল এই বিষয়টি তদন্ত করবে। যদি মনে হয় অ্যাকাউন্ট ক্ষতিগ্রস্ত হয়েছে, এখনই অ্যাপ থেকে পিন পরিবর্তন করুন।`
        );
      default:
        return (
          `আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ। আপনার অ্যাকাউন্ট সম্পর্কিত উদ্বেগটি আমরা গুরুত্বের সাথে নিচ্ছি। ` +
          `আমাদের সাপোর্ট দল বিষয়টি পর্যালোচনা করবেন। দ্রুত সমাধানের জন্য অনুগ্রহ করে তারিখ, পরিমাণ বা লেনদেনের ধরন উল্লেখ করুন। পিন বা ওটিপি কারো সাথে শেয়ার করবেন না।`
        );
    }
  }

  // ── Mixed / Banglish replies ───────────────────────────────────────────────
  // (language === "mixed") — casual Banglish, warm & relatable
  switch (caseType) {
    case "wrong_transfer":
      return (
        `আপনার complaint টা আমরা পেয়েছি এবং বুঝতে পারছি এই ধরনের situation এ আপনি কতটা worried হয়ে পড়েছেন। ` +
        `আপনার case${ref} আমাদের Dispute Resolution team এ পাঠানো হয়েছে, তারা এটা priority basis এ দেখবেন। ` +
        `যত তাড়াতাড়ি সম্ভব আপনাকে update দেওয়া হবে। Please কখনো আপনার PIN বা OTP কারো সাথে share করবেন না।`
      );
    case "payment_failed":
      return (
        `আপনার payment টা expected ভাবে complete হয়নি — এটা সত্যিই frustrating, আমরা বুঝতে পারছি। ` +
        `আমাদের Payments team আপনার transaction${ref} review করছে। ` +
        `Balance deduct হলে সেটা policy অনুযায়ী handle করা হবে। Shortly আপনাকে update দেওয়া হবে।`
      );
    case "refund_request":
      if (ctx.isBuyersRemorse) {
        return (
          `আপনার সাথে যোগাযোগের জন্য ধন্যবাদ। আমরা বুঝতে পারছি situation টা। ` +
          `কিন্তু একটু জানাই — merchant কে${amtStr} payment successfully complete হয়ে গেলে, ` +
          `শুধু change of mind এর কারণে platform এর পক্ষ থেকে refund করা আমাদের policy তে নেই, কারণ টাকা merchant এর কাছে চলে গেছে। ` +
          `সরাসরি merchant এর সাথে কথা বললে তারা হয়তো help করতে পারবেন। ` +
          `যদি transaction এ কোনো technical error থেকে থাকে, আমাদের জানান।`
        );
      }
      return (
        `আপনার refund request${ref} আমরা পেয়েছি। আমরা জানি এটা আপনার জন্য কতটা important। ` +
        `আমাদের team টা transaction details verify করবে এবং policy অনুযায়ী যত দ্রুত সম্ভব সমাধান করবে। ` +
        `একটু patience রাখুন — আমরা আপনাকে update রাখব। PIN বা OTP share করবেন না।`
      );
    case "duplicate_payment":
      return (
        `Double charge হওয়াটা সত্যিই concerning — আপনার worry টা আমরা বুঝতে পারছি। ` +
        `আমাদের Payments team আপনার transaction records${ref} দেখবে এবং duplicate confirm হলে সেটা official process এ handle করা হবে। শীঘ্রই update আসবে।`
      );
    case "merchant_settlement_delay":
      return (
        `Merchant settlement এ দেরি হচ্ছে — এটা obviously business এর জন্য problem। আমরা সেটা বুঝি। ` +
        `আপনার case${ref} আমাদের Merchant Operations team দেখবে। দ্রুত update দেওয়া হবে।`
      );
    case "agent_cash_in_issue":
      return (
        `Cash in balance এ reflect না করাটা definitely inconvenient। এজন্য আমরা sorry। ` +
        `আমাদের Agent Operations team আপনার transaction${ref} verify করবে এবং discrepancy থাকলে সেটা fix করা হবে। Shortly আপনার সাথে contact করা হবে।`
      );
    case "phishing_or_social_engineering":
      return (
        `এটা report করার জন্য ধন্যবাদ — এটা করা একদম সঠিক ছিল। ` +
        `Please কাউকে আপনার PIN, OTP বা password share করবেন না, even যদি কেউ বলে সে আমাদের support team থেকে। আমরা কখনো এটা চাই না। ` +
        `আমাদের Fraud team এটা investigate করবে। Account compromise হয়ে থাকলে এখনই app থেকে PIN change করুন।`
      );
    default:
      return (
        `আমাদের সাথে contact করার জন্য ধন্যবাদ! আপনার account related concern টা আমরা সিরিয়াসলি নিচ্ছি। ` +
        `একটু বেশি detail দিলে — যেমন date, amount, বা কোন transaction এর কথা বলছেন — আমাদের team আরো দ্রুত help করতে পারবে। PIN বা OTP share করবেন না।`
      );
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
