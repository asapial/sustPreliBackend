# QueueStorm Investigator

> **SUST CSE Carnival 2026 Codex Community Hackathon**
> AI/API SupportOps Challenge for Digital Finance

Internal SupportOps complaint investigation API for digital finance. Analyzes customer support tickets against transaction history using a rule-based deterministic engine.

---

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma (PostgreSQL)
- **Validation**: Zod
- **Build**: tsup

---

## Endpoints

### `GET /health`

Returns service readiness status.

```json
{ "status": "ok" }
```

### `POST /analyze-ticket`

Analyzes one customer support ticket and returns a structured JSON analysis.

**Request Body:**
```json
{
  "ticket_id": "TKT-001",
  "complaint": "I sent 5000 taka to a wrong number around 2pm today",
  "language": "en",
  "channel": "in_app_chat",
  "user_type": "customer",
  "transaction_history": [
    {
      "transaction_id": "TXN-9101",
      "timestamp": "2026-04-14T14:08:22Z",
      "type": "transfer",
      "amount": 5000,
      "counterparty": "+8801719876543",
      "status": "completed"
    }
  ]
}
```

**Response:**
```json
{
  "ticket_id": "TKT-001",
  "relevant_transaction_id": "TXN-9101",
  "evidence_verdict": "consistent",
  "case_type": "wrong_transfer",
  "severity": "high",
  "department": "dispute_resolution",
  "agent_summary": "Customer reports a wrong transfer issue related to transaction TXN-9101. Provided transaction evidence appears consistent, and the case is routed to dispute resolution.",
  "recommended_next_action": "Verify the matched transfer details using approved internal checks and escalate to dispute resolution. Do not promise reversal before authorization.",
  "customer_reply": "We have noted your concern about the transfer. Our support team will review the transaction details through official channels. Please do not share your PIN, OTP, password, or sensitive credentials with anyone.",
  "human_review_required": true,
  "confidence": 0.85,
  "reason_codes": ["wrong_transfer", "transaction_match", "amount_match", "status_completed", "human_review_required"]
}
```

---

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env
# Fill in DATABASE_URL and other variables
```

### 3. Prisma

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Run Locally

```bash
npm run dev
```

### 5. Build

```bash
npm run build
```

### 6. Start Production

```bash
npm start
```

---

## Sample cURL

```bash
# Health check
curl -X GET http://localhost:8000/health

# Analyze ticket
curl -X POST http://localhost:8000/analyze-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "TKT-001",
    "complaint": "I sent 5000 taka to a wrong number around 2pm today",
    "language": "en",
    "channel": "in_app_chat",
    "user_type": "customer",
    "transaction_history": [
      {
        "transaction_id": "TXN-9101",
        "timestamp": "2026-04-14T14:08:22Z",
        "type": "transfer",
        "amount": 5000,
        "counterparty": "+8801719876543",
        "status": "completed"
      }
    ]
  }'
```

---

## Docker

```bash
docker build -t queuestorm-investigator .
docker run -p 8000:8000 --env-file .env queuestorm-investigator
```

---

## MODELS Section

| Component | Details |
|-----------|---------|
| **Model Name** | None — Rule-based deterministic engine |
| **Runs** | Local server, no external API calls |
| **Why Chosen** | Fast, safe, no API cost, reliable under hidden tests, responds well under 30s |
| **Optional LLM** | OpenRouter API (disabled by default) |

---

## Analysis Pipeline

1. Normalize complaint text
2. Extract signals (amounts, TXN IDs, keywords, phone numbers)
3. Detect prompt injection attempts
4. Classify `case_type` (8 categories)
5. Score and match relevant transaction
6. Determine `evidence_verdict`
7. Determine `severity`
8. Route to `department`
9. Determine `human_review_required`
10. Generate `agent_summary`
11. Generate `recommended_next_action`
12. Generate `customer_reply`
13. Calculate `confidence`
14. Build `reason_codes`
15. Apply final safety guardrails

---

## Safety Logic

- **Never** asks for PIN, OTP, password, or full card number
- **Never** confirms refund, reversal, or account recovery without authority
- **Detects** and ignores prompt injection in complaint text
- **Escalates** all phishing, fraud, and high-risk cases
- **Sanitizes** complaint before logging — strips sensitive patterns

---

## Known Limitations

- Rule-based language matching may miss unusual phrasing
- No real payment system integration
- Transaction history is limited to the provided input
- Human review required for all ambiguous / high-risk cases
- Bangla NLP is keyword-based, not morphologically aware

---

## Deployment

Preferred platforms: **Render**, **Railway**, **Fly.io**, **Vercel**

**Render build command:**
```bash
npm install && npx prisma generate && npm run build
```

**Render start command:**
```bash
npm start
```

**Environment variables required:**
- `PORT`
- `DATABASE_URL`
- `NODE_ENV`

---

## Confirmations

- ✅ No real customer data used
- ✅ No secrets committed to repository
- ✅ `.env` is in `.gitignore`
