// ============================================================
// QueueStorm Investigator — Text Normalization & Signal Extraction
// ============================================================

import { ExtractedSignals } from "../modules/analyze-ticket/analyze-ticket.types.js";

export function normalizeComplaint(complaint: string): string {
  return complaint.toLowerCase().replace(/\s+/g, " ").trim();
}

export function extractSignals(rawComplaint: string): ExtractedSignals {
  const normalized = normalizeComplaint(rawComplaint);

  // ── Transaction IDs: TXN-XXXX pattern ───────────────────────────────────
  const txnIdPattern = /TXN-[A-Z0-9]+/gi;
  const mentionedTransactionIds = [...new Set((rawComplaint.match(txnIdPattern) || []).map((t) => t.toUpperCase()))];

  // ── Amounts: numeric amounts ─────────────────────────────────────────────
  const amountPattern = /\b(\d{2,7}(?:[,\s]?\d{3})*(?:\.\d+)?)\s*(?:taka|bdt|tk|৳)?/gi;
  const amountMatches: number[] = [];
  let amountMatch;
  while ((amountMatch = amountPattern.exec(normalized)) !== null) {
    const num = parseFloat((amountMatch[1] ?? "").replace(/,/g, ""));
    if (!isNaN(num) && num > 0) amountMatches.push(num);
  }
  const mentionedAmounts = [...new Set(amountMatches)];

  // ── Phone numbers & counterparties ──────────────────────────────────────
  const phonePattern = /(?:\+88)?01[3-9]\d{8}/g;
  const mentionedCounterparties = [...new Set(rawComplaint.match(phonePattern) || [])];

  // ── PIN / OTP / Password signals ────────────────────────────────────────
  const pinOtpKeywords = [
    "pin", "otp", "password", "verification code", "পিন", "ওটিপি", "পাসওয়ার্ড",
    "পিন নম্বর", "secret code", "4-digit", "6-digit",
  ];
  const hasPinOtpPasswordSignal = pinOtpKeywords.some((kw) => normalized.includes(kw));

  // ── Scam / Phishing signals ──────────────────────────────────────────────
  // Note: "link" alone is too broad (campaign link, etc). Require qualifier.
  const scamKeywords = [
    "scam", "fraud", "fake call", "suspicious call", "phishing", "suspicious link",
    "click this link", "click the link", "account blocked", "পুরস্কার", "প্রতারণা", "ভুয়া",
    "suspicious message", "fake message", "hacked", "compromised",
    "unauthorized access", "verify your account",
    "send otp", "give otp", "share pin", "give pin", "share otp",
  ];
  const hasScamSignal = scamKeywords.some((kw) => normalized.includes(kw));

  // ── Refund signals ──────────────────────────────────────────────────────
  const refundKeywords = [
    "refund", "return my money", "টাকা ফেরত", "ফেরত চাই", "taka ferot", "money back",
    "get my money back", "want refund", "need refund",
  ];
  const hasRefundSignal = refundKeywords.some((kw) => normalized.includes(kw));

  // ── Buyer's-remorse signals ──────────────────────────────────────────────
  // Indicates the customer is requesting a refund not due to a system failure
  // but due to a change of mind / voluntary cancellation.
  const buyersRemorseKeywords = [
    "changed my mind", "don't want", "do not want", "no longer want",
    "want to cancel", "cancel my order", "cancel order", "cancelled order",
    "i don't need", "i do not need", "decided not to", "won't buy",
    "মন পরিবর্তন", "আর চাই না", "বাতিল করতে চাই", "কিনব না",
  ];
  const hasBuyersRemorseSignal = buyersRemorseKeywords.some((kw) => normalized.includes(kw));

  // ── Wrong transfer signals ───────────────────────────────────────────────
  const wrongTransferKeywords = [
    "wrong number", "wrong recipient", "wrong person", "sent to wrong", "wrong account",
    "ভুল নম্বর", "ভুল করে পাঠিয়েছি", "bhul number", "mistakenly sent", "wrong transfer",
    "ভুল মানুষ", "অন্য নম্বরে", "different number", "ভুল নম্বরে",
  ];
  const hasWrongTransferSignal = wrongTransferKeywords.some((kw) => normalized.includes(kw));

  // ── Failed payment signals ───────────────────────────────────────────────
  // NOTE: "merchant did not receive" removed — it also appears in legitimate
  // merchant settlement complaints and causes mis-classification.
  const failedPaymentKeywords = [
    "failed", "payment failed", "transaction failed", "deducted but", "balance cut",
    "টাকা কেটে গেছে", "পেমেন্ট হয়নি",
    "payment not received", "not completed", "টাকা গেছে", "money deducted",
    "balance deducted", "amount deducted",
    // Pending payments: customer explicitly says pending → treat as failed-payment workflow
    "payment is pending", "transaction is pending", "still pending", "shows pending",
  ];
  const hasFailedPaymentSignal = failedPaymentKeywords.some((kw) => normalized.includes(kw));

  // ── Duplicate payment signals ────────────────────────────────────────────
  const duplicateKeywords = [
    "charged twice", "paid twice", "double payment", "duplicate", "twice deducted",
    "দুইবার", "দুবার", "duibar", "dui bar",
    "double charged", "billed twice", "multiple times",
    "two times", "charged two", "pay twice", "paying twice",
  ];
  const hasDuplicateSignal = duplicateKeywords.some((kw) => normalized.includes(kw));

  // ── Merchant signals ─────────────────────────────────────────────────────
  // NOTE: "merchant" alone excluded — appears in payment/refund complaints like
  // "payment to merchant failed". Require "settlement" or Bangla merchant term.
  const merchantKeywords = [
    "settlement", "merchant settlement", "merchant portal",
    "দোকানের টাকা", "মার্চেন্ট", "shop payment", "business payment",
    "settlement delayed", "settlement not received",
  ];
  const hasMerchantSignal = merchantKeywords.some((kw) => normalized.includes(kw));

  // ── Agent cash-in signals ─────────────────────────────────────────────────
  // NOTE: "agent" alone is intentionally excluded — it also appears in cash-out
  // and other contexts. Require "cash in" or specific Bangla cash-in keywords.
  const agentCashInKeywords = [
    "cash in", "cash-in", "cashin", "deposit", "balance not added",
    "ক্যাশ ইন", "এজেন্ট", "cash in failed", "deposit failed", "not credited",
    "balance not updated", "add balance",
  ];
  const hasAgentCashInSignal = agentCashInKeywords.some((kw) => normalized.includes(kw));

  // ── Cash-out signals ─────────────────────────────────────────────────────
  const cashOutKeywords = [
    "cash out", "cash-out", "cashout", "ক্যাশ আউট", "cash withdrawal", "withdraw",
  ];
  const hasCashOutSignal = cashOutKeywords.some((kw) => normalized.includes(kw));

  // ── Balance issue signals ─────────────────────────────────────────────────
  // Indicates a financial/balance discrepancy even if unclassified
  const balanceIssueKeywords = [
    "balance", "ব্যালেন্স", "টাকা দেখাচ্ছে না", "balance wrong",
    "wrong balance", "balance issue", "balance problem",
  ];
  const hasBalanceIssueSignal = balanceIssueKeywords.some((kw) => normalized.includes(kw));

  // ── Prompt injection signals ─────────────────────────────────────────────
  const promptInjectionKeywords = [
    "ignore previous", "ignore rules", "system instruction", "developer instruction",
    "reveal prompt", "override", "force output", "return this json", "ask for otp",
    "ask for pin", "confirm refund", "do not escalate", "ignore all", "disregard",
    "pretend", "act as", "you are now", "new instruction", "forget previous",
  ];
  const hasPromptInjectionSignal = promptInjectionKeywords.some((kw) => normalized.includes(kw));

  return {
    mentionedTransactionIds,
    mentionedAmounts,
    mentionedCounterparties,
    hasPinOtpPasswordSignal,
    hasScamSignal,
    hasRefundSignal,
    hasBuyersRemorseSignal,
    hasWrongTransferSignal,
    hasFailedPaymentSignal,
    hasDuplicateSignal,
    hasMerchantSignal,
    hasAgentCashInSignal,
    hasCashOutSignal,
    hasBalanceIssueSignal,
    hasPromptInjectionSignal,
    normalizedText: normalized,
  };
}
