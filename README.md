# QueueStorm Investigator

Professional SupportOps complaint investigation API for digital finance. QueueStorm Investigator analyzes customer support tickets, compares complaint signals with supplied transaction history, classifies the case, routes it to the right operations team, and returns a safe structured response for support agents and customers.

The core analysis path is deterministic and local. It does not require an LLM, external payment gateway, or a live database to return an analysis result. PostgreSQL logging is optional and intentionally non-blocking.

## Project Context

Built for the **SUST CSE Carnival 2026 Codex Community Hackathon** AI/API SupportOps Challenge.

Primary goal:

- Accept one support ticket and transaction history payload.
- Extract financial and safety signals from the complaint.
- Match the most relevant transaction when evidence exists.
- Produce a consistent verdict, case type, severity, department, agent summary, next action, customer reply, confidence score, and reason codes.
- Apply support safety guardrails so the API never asks for sensitive credentials or confirms unauthorized reversals/refunds.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 20 |
| Language | TypeScript, ESM |
| HTTP Framework | Express.js |
| Validation | Zod |
| ORM | Prisma 7 with PostgreSQL adapter |
| Auth Module | Better Auth with Prisma adapter |
| Build Tool | tsup |
| Local Execution | tsx |
| Optional AI Utility | OpenRouter helper, not used by the core analysis endpoint |

## AI Approach

QueueStorm Investigator uses a deterministic rules engine for the production `/analyze-ticket` path instead of calling an LLM. This choice keeps the API predictable, low-latency, testable, and safe for financial-support workflows.

The engine performs:

- Text normalization and keyword-based signal extraction for English, Bangla, and mixed complaints.
- Pattern extraction for transaction IDs, BDT amounts, phone numbers, counterparties, and credential-risk terms.
- Case classification across supported SupportOps categories.
- Transaction scoring based on ID match, amount match, counterparty match, type alignment, and status alignment.
- Evidence verdict calculation using deterministic business rules.
- Severity, department routing, human-review, confidence, and reason-code generation.
- Final safety guardrails before returning the response.

An optional OpenRouter helper exists in `src/utils/aiResponse.ts`, but it is not used by the core challenge endpoint.

## Model and Cost Reasoning

| Item | Decision |
| --- | --- |
| Core model | No hosted AI model is used for `/analyze-ticket`. |
| Analysis cost | Zero per request, excluding normal server and database infrastructure costs. |
| Latency profile | Local CPU-bound processing, suitable for fast hidden-test execution. |
| Reliability | Deterministic outputs avoid model drift, rate limits, provider downtime, and non-JSON responses. |
| Safety | No customer complaint data is sent to an external LLM provider in the core flow. |
| Optional AI cost | OpenRouter usage applies only if developers call the optional utility separately. |

## High-Level Architecture

```mermaid
flowchart LR
    Client["API Client / Support Tool"] --> Express["Express App"]
    Express --> Middleware["Core Middleware\ncookie-parser, JSON body parser, CORS"]
    Middleware --> Routes["Route Layer"]

    Routes --> Health["GET /health"]
    Routes --> Root["GET /"]
    Routes --> Auth["/api/auth/*\nBetter Auth"]
    Routes --> Analyze["POST /analyze-ticket"]

    Analyze --> Controller["Analyze Ticket Controller"]
    Controller --> Validation["Zod Request Validation"]
    Validation --> Engine["Deterministic Analysis Engine"]

    Engine --> Signals["Signal Extraction\namounts, TXN IDs, phones, keywords, safety signals"]
    Engine --> Match["Transaction Matching\nscore by ID, amount, counterparty, type, status"]
    Engine --> Decision["Case Classification\nEvidence Verdict\nSeverity\nDepartment Routing"]
    Engine --> Safety["Safety Guardrails\ncredential and refund/reversal protection"]

    Controller --> Response["Structured JSON Response"]
    Controller -. fire and forget .-> Logging["Optional Prisma Logging"]
    Logging -.-> Database[("PostgreSQL")]
    Auth --> Database
    Response --> Client
```

## Request Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant Client as API Client
    participant App as Express App
    participant Route as Analyze Route
    participant Controller as Controller
    participant Validator as Zod Validator
    participant Engine as Analysis Engine
    participant Prisma as Prisma Logging
    participant DB as PostgreSQL

    Client->>App: POST /analyze-ticket
    App->>App: Parse cookies, JSON body, apply CORS
    App->>Route: Forward request
    Route->>Controller: analyzeTicketController(req, res, next)
    Controller->>Validator: safeParse(request body)

    alt Invalid required fields
        Validator-->>Controller: validation issues
        Controller-->>Client: 400 Invalid request body
    else Empty or whitespace complaint
        Validator-->>Controller: complaint too small or blank
        Controller-->>Client: 422 Complaint cannot be empty
    else Valid request
        Validator-->>Controller: typed input
        Controller->>Engine: analyzeTicket(input)
        Engine->>Engine: Normalize complaint and extract signals
        Engine->>Engine: Classify case type
        Engine->>Engine: Score and match transaction history
        Engine->>Engine: Determine evidence verdict
        Engine->>Engine: Determine severity and department
        Engine->>Engine: Generate agent/customer messages
        Engine->>Engine: Calculate confidence and reason codes
        Engine->>Engine: Apply final safety guardrails
        Engine-->>Controller: AnalyzeTicketResponse
        Controller-->>Prisma: Fire-and-forget saveTicketAnalysisLog(input, result)
        opt Prompt injection detected
            Controller-->>Prisma: Fire-and-forget saveSafetyEventLog(ticketId, eventType, detail)
        end
        Prisma-->>DB: Insert logs if database is available
        Controller-->>Client: 200 Structured analysis JSON
    end
```

## Architectural Flow

1. **HTTP Entry Point**
   `src/server.ts` loads environment variables, attempts a Prisma connection, and starts the Express app on `PORT` or `8000`. Database connection failure is logged as a warning and does not stop the analysis API.

2. **Application Composition**
   `src/app.ts` configures JSON parsing, cookies, permissive CORS for judging, Better Auth routes, challenge endpoints, a root status endpoint, API namespace placeholder, 404 handling, and a compact error handler.

3. **Route Layer**
   `src/modules/analyze-ticket/analyze-ticket.route.ts` exposes `POST /analyze-ticket` and delegates the request to the controller.

4. **Controller Layer**
   `src/modules/analyze-ticket/analyze-ticket.controller.ts` validates the request with Zod, handles expected validation status codes, runs the analysis engine, triggers optional persistence, and returns the response.

5. **Domain Engine**
   `src/modules/analyze-ticket/analyze-ticket.engine.ts` contains the core business rules: classification, transaction scoring, evidence verdict calculation, severity mapping, department routing, human review decisions, response generation, confidence scoring, reason code construction, and final safety checks.

6. **Signal Extraction**
   `src/utils/normalize.ts` normalizes complaint text and extracts structured signals such as transaction IDs, amounts, counterparties, payment issue keywords, duplicate-payment intent, merchant/agent terms, phishing signals, credential requests, and prompt-injection attempts.

7. **Persistence**
   `src/modules/analyze-ticket/analyze-ticket.service.ts` writes optional `TicketAnalysisLog` and `SafetyEventLog` records through Prisma. Logging is fire-and-forget and must never break the API response.

## Directory Structure

```text
src/
  app.ts                         Express app composition
  server.ts                      Runtime entry point
  index.ts                       /api/v1 router placeholder
  config/                        Environment and third-party config
  errorHelpers/                  AppError and Zod error formatting helpers
  interfaces/                    Shared error interfaces
  lib/                           Prisma and Better Auth integrations
  middleware/                    Reusable auth, validation, and error middleware
  modules/
    analyze-ticket/              Main QueueStorm feature module
      analyze-ticket.route.ts
      analyze-ticket.controller.ts
      analyze-ticket.validation.ts
      analyze-ticket.engine.ts
      analyze-ticket.service.ts
      analyze-ticket.types.ts
    demo/                        Demo module scaffold
  scripts/                       Local/manual test scripts
  utils/                         Shared helpers

prisma/
  schema/                        Prisma schema split by domain
  migrations/                    Database migrations
  generated/prisma/              Generated Prisma client

samples/
  sample-output.json             Example analysis output
```

## Core Analysis Pipeline

```mermaid
flowchart TD
    A["Validated AnalyzeTicketRequest"] --> B["Normalize complaint text"]
    B --> C["Extract signals"]
    C --> D["Classify case type"]
    D --> E["Score transaction history"]
    E --> F["Select relevant transaction"]
    F --> G["Determine evidence verdict"]
    G --> H["Determine severity"]
    H --> I["Route department"]
    I --> J["Decide human review"]
    J --> K["Generate agent summary"]
    K --> L["Generate recommended next action"]
    L --> M["Generate customer reply"]
    M --> N["Calculate confidence"]
    N --> O["Build reason codes"]
    O --> P["Apply safety guardrails"]
    P --> Q["AnalyzeTicketResponse"]
```

### Supported Case Types

| Case Type | Typical Department |
| --- | --- |
| `wrong_transfer` | `dispute_resolution` |
| `payment_failed` | `payments_ops` |
| `refund_request` | `customer_support` or `dispute_resolution` |
| `duplicate_payment` | `payments_ops` |
| `merchant_settlement_delay` | `merchant_operations` |
| `agent_cash_in_issue` | `agent_operations` |
| `phishing_or_social_engineering` | `fraud_risk` |
| `other` | `customer_support` |

### Evidence Verdicts

| Verdict | Meaning |
| --- | --- |
| `consistent` | Provided transaction history supports the complaint. |
| `inconsistent` | Provided transaction history contradicts the complaint. |
| `insufficient_data` | No reliable transaction evidence is available. |

## API Reference

### `GET /health`

Returns service readiness.

```json
{
  "status": "ok"
}
```

### `GET /`

Returns API metadata, environment, uptime, and timestamp.

### `POST /analyze-ticket`

Analyzes one complaint against the transaction history supplied in the request body.

#### Request Body

```json
{
  "ticket_id": "TKT-001",
  "complaint": "I sent 5000 taka to a wrong number around 2pm today",
  "language": "en",
  "channel": "in_app_chat",
  "user_type": "customer",
  "campaign_context": "boishakh_bonanza_day_1",
  "transaction_history": [
    {
      "transaction_id": "TXN-9101",
      "timestamp": "2026-04-14T14:08:22Z",
      "type": "transfer",
      "amount": 5000,
      "counterparty": "+8801719876543",
      "status": "completed"
    }
  ],
  "metadata": {
    "source": "support_console"
  }
}
```

#### Response Body

```json
{
  "ticket_id": "TKT-001",
  "relevant_transaction_id": "TXN-9101",
  "evidence_verdict": "consistent",
  "case_type": "wrong_transfer",
  "severity": "high",
  "department": "dispute_resolution",
  "agent_summary": "Customer reports a wrong transfer issue. Matched transaction: TXN-9101 (transfer, 5,000 BDT to +8801719876543, status: completed on Tue, 14 Apr 2026 14:08:22 GMT). Transaction evidence is consistent with the complaint. Case routed to dispute resolution.",
  "recommended_next_action": "Verify the matched transfer (reference: TXN-9101) using approved internal tools. Confirm the intended recipient vs actual counterparty (+8801719876543). Do not promise reversal before authorization from dispute_resolution.",
  "customer_reply": "We have noted your concern about the transfer. Our support team will review the transaction details through official channels. Please do not share your PIN, OTP, password, or sensitive credentials with anyone.",
  "human_review_required": true,
  "confidence": 0.85,
  "reason_codes": [
    "wrong_transfer",
    "transaction_match",
    "amount_match",
    "status_completed",
    "human_review_required",
    "high_value"
  ]
}
```

#### Validation Behavior

| Scenario | Status |
| --- | --- |
| Missing required fields or invalid enum values | `400` |
| Empty complaint | `422` |
| Valid analysis request | `200` |
| Unknown route | `404` |

## Local Setup

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL if you want auth and persistence

### Install

```bash
npm install
```

### Configure Environment

```bash
cp .env.example .env
```

Minimum useful values for local development:

```env
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://user:password@host:5432/queuestorm
BETTER_AUTH_SECRET=replace_me
BETTER_AUTH_URL=http://localhost:8000
```

The core analysis engine can still return responses when the database is unavailable, but Prisma generation and auth/database features require a valid `DATABASE_URL`.

### Generate Prisma Client

```bash
npm run generate
```

### Run Migrations

```bash
npm run migrate
```

### Start Development Server

```bash
npm run dev
```

Expected local endpoints:

```text
GET  http://localhost:8000/health
POST http://localhost:8000/analyze-ticket
```

### Build and Start

```bash
npm run build
npm start
```

## Run Commands

| Task | Command |
| --- | --- |
| Install dependencies | `npm install` |
| Generate Prisma client | `npm run generate` |
| Run database migrations | `npm run migrate` |
| Start local development server | `npm run dev` |
| Build production bundle | `npm run build` |
| Start production server | `npm start` |
| Run QueueStorm test suite | `npx tsx src/scripts/runTests.ts` |
| Run optional AI utility tests | `npm run test:ai` |

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the TypeScript server with watch mode. |
| `npm run build` | Generate Prisma client and bundle `src/server.ts` to `dist/server.js`. |
| `npm start` | Run the production build. |
| `npm run generate` | Generate the Prisma client. |
| `npm run migrate` | Run Prisma development migrations. |
| `npm run test:ai` | Manually test the optional OpenRouter utility. |

There is also a broader local test runner at `src/scripts/runTests.ts` that can be executed with:

```bash
npx tsx src/scripts/runTests.ts
```

## Sample cURL

```bash
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

## Persistence Model

```mermaid
erDiagram
    User ||--o{ Session : has
    User ||--o{ Account : has

    User {
        string id PK
        string name
        string email
        boolean emailVerified
        string image
        datetime createdAt
        datetime updatedAt
    }

    Session {
        string id PK
        datetime expiresAt
        string token
        string userId FK
        string ipAddress
        string userAgent
    }

    Account {
        string id PK
        string accountId
        string providerId
        string userId FK
        string accessToken
        string refreshToken
        string password
    }

    Verification {
        string id PK
        string identifier
        string value
        datetime expiresAt
    }

    TicketAnalysisLog {
        string id PK
        string ticketId
        string complaintPreview
        string caseType
        string evidenceVerdict
        string severity
        string department
        boolean humanReviewRequired
        float confidence
        datetime createdAt
    }

    SafetyEventLog {
        string id PK
        string ticketId
        string eventType
        string detail
        datetime createdAt
    }
```

The analysis endpoint stores only a sanitized complaint preview. Sensitive-looking values such as OTP, PIN, password, and card number patterns are redacted before logging.

## Safety Logic

- The core response generation never asks customers for PIN, OTP, password, or full card details.
- The engine detects prompt-injection phrases and adds `prompt_injection_detected` to reason codes.
- Refunds, reversals, and account recovery are never confirmed automatically.
- High-risk cases and ambiguous financial cases are routed to human review.
- Safety events are logged separately when prompt injection is detected.
- Optional database logging failure is non-fatal by design.
- Complaint previews are sanitized before optional database logging.
- Prompt-injection text is treated as untrusted complaint content, not as an instruction to the system.
- Customer-facing replies are generated from approved templates rather than free-form model output.
- Recommended actions instruct agents to verify through approved internal tools before taking financial action.

## Assumptions

- Each request contains one support ticket and an optional transaction history array.
- Transaction history in the request is treated as the only available evidence source for the analysis.
- Amounts are interpreted as BDT values when the complaint mentions taka, tk, or BDT.
- The engine assumes transaction IDs follow the `TXN-...` pattern used in the challenge data.
- Bangla and mixed-language support is keyword-based.
- The database is useful for audit logging and auth, but the core analysis response must still work without persistence.
- Human agents remain the final authority for refunds, reversals, fraud actions, and account recovery.

## Known Limitations

- The analysis engine is rule-based, so unusual wording or unseen slang may be missed.
- Bangla handling is keyword-driven and does not perform full morphological or semantic NLP.
- The API does not integrate with a real ledger, payment switch, merchant system, or fraud-monitoring system.
- Transaction matching is limited to the transaction history supplied in the request.
- The confidence score is heuristic, not a calibrated probability.
- Optional OpenRouter utilities require network access and API credentials if used outside the core endpoint.
- `npm test` remains a placeholder; use `npx tsx src/scripts/runTests.ts` for the included local test suite.

## Optional Modules

### Better Auth

Better Auth is mounted at:

```text
/api/auth/*splat
```

It uses the Prisma adapter and the auth tables defined in `prisma/schema/auth.prisma`.

### OpenRouter Utility

`src/utils/aiResponse.ts` contains a reusable helper for JSON-style OpenRouter calls with model fallback and retry behavior. This utility is not part of the `/analyze-ticket` decision path.

## Deployment Notes

Recommended production steps:

```bash
npm install
npm run build
npm start
```

Required production environment variables:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`

Additional values are required only when using JWT auth helpers, email, Google OAuth, Cloudinary, or OpenRouter.

## Engineering Notes

- The application uses strict TypeScript settings and ESM imports.
- `POST /analyze-ticket` is intentionally independent from database availability.
- The route is suitable for deterministic hidden tests because no network AI call is made in the core path.
- The generated Prisma client lives under `prisma/generated/prisma`.
- `vercel.json` currently points to `api/server.js`; this repository's active build output is `dist/server.js`, so deployment configuration should be reviewed before deploying to Vercel.
- `npm test` is still the default placeholder script; use `npx tsx src/scripts/runTests.ts` for the included QueueStorm test suite.

## License

ISC
