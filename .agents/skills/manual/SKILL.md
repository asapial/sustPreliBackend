# SKILL.md — Hackathon API Build & Submission Guide

## Purpose

Use this skill when working on the **SUST CSE Carnival 2026: Codex Community Hackathon — AI/API Challenge preliminary round** project.

This skill guides the project from reading the challenge documents to building, testing, deploying, documenting, and submitting a judgeable API service.

The main goal is to produce a **simple, reliable, safe, schema-correct API**. API correctness matters more than UI, styling, or flashy features.

---

## Source Documents to Read First

Before coding, read these documents together:

1. **Problem Statement**
   - Defines the actual challenge.
   - Contains the required input schema, output schema, endpoint name, enum values, and expected behavior.

2. **Evaluation Rubric**
   - Explains scoring categories, hidden tests, penalties, safety requirements, and tie-breakers.

3. **Team Instructions Manual**
   - Explains build flow, deployment rules, secrets policy, testing, Docker fallback, and submission requirements.

Never guess the schema from memory. Always follow the official Problem Statement exactly.

---

## Core Deliverables

The project must include:

| Deliverable | Requirement |
|---|---|
| Backend API service | Build the preliminary challenge API as a backend service. |
| `GET /health` | Must return exactly `{"status":"ok"}`. |
| Main POST endpoint | Must accept the required JSON input and return the required structured JSON output. |
| Valid JSON response | Must use exact field names, types, enum values, and nesting from the Problem Statement. |
| `README.md` | Must explain setup, run command, AI/model usage, safety logic, sample request/response, and known limitations. |
| `.env.example` | Include variable names only; no real secrets. |
| Optional Docker fallback | Include only if public deployment is not possible or as a backup. |

Frontend/UI is optional and should not distract from the API.

---

## Development Priority Order

Build in this order:

1. **Schema first**
   - Identify exact request and response structure.
   - Define validation rules.
   - Define enums and required fields exactly.

2. **API routes second**
   - Implement `GET /health`.
   - Implement the official main POST endpoint.
   - Return `application/json`.

3. **Reasoning/logic third**
   - Implement deterministic decision logic.
   - Handle priority, routing, matching, classification, or analysis rules required by the Problem Statement.

4. **Safety fourth**
   - Add guardrails for sensitive data, credentials, restricted authentication details, unauthorized decisions, and unsafe actions.

5. **Testing fifth**
   - Test sample cases, malformed input, missing optional fields, edge cases, timeout behavior, and schema accuracy.

6. **Deployment last**
   - Deploy only after local tests pass.
   - Test the public endpoint from outside the development environment.

---

## Suggested Team Roles

For a team, split work like this:

| Role | Responsibility |
|---|---|
| API/Backend Lead | Endpoints, request parsing, validation, response formatting, deployment setup. |
| Reasoning/Logic Lead | Core decision logic, data matching, output selection, routing, priority handling. |
| AI/Safety/Docs Lead | AI integration if used, safety guardrails, edge-case testing, README. |

For a solo developer, follow the same order: **schema → reasoning → safety → deployment**.

---

## API Rules

The judges must be able to call the API directly.

Required behavior:

```http
GET https://your-service-url.com/health
POST https://your-service-url.com/<main-endpoint>
```

Rules:

- No login required.
- No dashboard required.
- No manual approval required.
- No private network access required.
- Must accept JSON input.
- Must return JSON output.
- Must use the exact endpoint names from the official Problem Statement.
- Must stay reachable during the evaluation window.
- Must not print logs or extra text inside the JSON response body.

If the Problem Statement specifies `/analyze-ticket`, use `/analyze-ticket` exactly. Otherwise, use the official endpoint name from the Problem Statement.

---

## Recommended Project Structure

A clean TypeScript/Express structure is recommended:

```text
project-root/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── routes/
│   │   ├── health.route.ts
│   │   └── analysis.route.ts
│   ├── controllers/
│   │   └── analysis.controller.ts
│   ├── services/
│   │   └── analysis.service.ts
│   ├── validators/
│   │   └── analysis.validator.ts
│   ├── types/
│   │   └── analysis.types.ts
│   ├── safety/
│   │   └── guardrails.ts
│   └── utils/
│       └── response.ts
├── tests/
│   └── analysis.test.ts
├── .env.example
├── Dockerfile
├── README.md
├── package.json
└── SKILL.md
```

This structure is optional, but the project must remain easy to run and judge.

---

## Environment Variables

Use environment variables for all configuration.

Example `.env.example`:

```env
PORT=8000
NODE_ENV=production

# Only if an external AI API is used:
OPENAI_API_KEY=
GOOGLE_API_KEY=
ANTHROPIC_API_KEY=
MODEL_NAME=
AI_PROVIDER=
```

Rules:

- Never commit real API keys.
- Never commit `.env`.
- Never include real secrets in README.
- Never include real secrets in screenshots.
- Never bake secrets into Docker images.
- Use temporary, limited-quota keys if secrets must be shared privately for judging.
- Revoke or rotate shared keys after evaluation.

---

## AI and Model Usage Policy

Allowed:

- Rule-based logic.
- External AI APIs using the team's own keys.
- Lightweight local models that run without GPU and fit within runtime/image limits.
- Hybrid rule + AI systems.

Recommended:

- Use deterministic rules for validation, safety, schema correctness, and fallback logic.
- Use AI only where it improves understanding, classification, or explanation.

Not allowed or unsafe:

- Huge local LLMs.
- GPU dependency.
- Multi-GB model downloads during evaluation.
- Runtime model training.
- Hard dependency on a paid API without fallback.
- Unhandled quota or rate-limit failure.

If an external API fails, return a controlled JSON response instead of crashing.

---

## Safety Requirements

The system must not:

- Ask users for passwords, OTPs, API keys, private tokens, or restricted authentication details.
- Ask for sensitive private information that is not necessary.
- Use real customer, user, business, financial, or production data.
- Trigger real production actions.
- Promise unauthorized approvals.
- Promise irreversible account changes.
- Promise guaranteed outcomes outside the system’s authority.
- Act like it has authority to make decisions when it is only a support copilot.

The system should:

- Use only synthetic data for testing.
- Handle unsafe or sensitive requests with safe fallback responses.
- Clearly separate recommendation from authority.
- Avoid exposing internal logs, secrets, stack traces, or private data.

---

## Validation Rules

Before returning a response:

1. Confirm the request body is valid JSON.
2. Check required fields.
3. Safely handle optional or missing non-critical fields.
4. Validate enum values exactly.
5. Normalize input only if allowed by the Problem Statement.
6. Ensure the output contains all required fields.
7. Ensure every field has the correct type.
8. Ensure no extra unauthorized fields are added if the schema is strict.
9. Return `application/json`.

Common mistake: returning a good explanation but with the wrong schema. In this hackathon, wrong schema can fail hidden tests.

---

## Error Handling

The API should not crash on imperfect input.

Recommended error response pattern:

```json
{
  "error": true,
  "message": "Invalid request body",
  "details": [
    "Required field 'exampleField' is missing"
  ]
}
```

Only use this if the Problem Statement does not require a different error format.

For production-style safety:

- Avoid returning raw stack traces.
- Avoid leaking environment variables.
- Avoid leaking AI provider errors directly.
- Log internally, respond safely.

---

## Docker Fallback Rules

Docker is a fallback if public deployment is not possible.

Rules:

| Rule | Requirement |
|---|---|
| Recommended image size | Under 500MB |
| Hard image size limit | 1GB |
| GPU | Not allowed |
| Large local model weights | Not allowed |
| Multi-GB downloads during evaluation | Not allowed |
| Runtime training | Not allowed |
| Port binding | Must bind to `0.0.0.0` |
| Health readiness | `/health` must respond within 60 seconds |
| Secrets | Must be passed through environment variables only |

Example commands:

```bash
docker build -t hackathon-team .
docker run -p 8000:8000 --env-file judging.env hackathon-team
```

The Dockerfile must expose the correct port and run the app without manual steps.

---

## Deployment Rules

Preferred submission path:

1. Public working endpoint URL.
2. GitHub repository URL.

Allowed platforms include:

- Poridhi Labs
- Poridhi VM
- AWS through Poridhi Labs
- Render
- Railway
- Fly.io
- Vercel
- AWS EC2
- Any reachable hosting platform

Deployment requirements:

- Bind service to `0.0.0.0`.
- Use documented port.
- Set real secrets in hosting environment variables.
- Test from outside the deployment environment.
- Keep endpoint reachable during evaluation.

---

## README.md Requirements

The README must include:

1. Project name.
2. Short description.
3. Tech stack.
4. API endpoints.
5. Setup instructions.
6. Local run command.
7. Environment variables.
8. Sample request.
9. Sample response.
10. AI/model usage explanation.
11. Safety logic explanation.
12. Known limitations.
13. Deployment URL, if available.
14. Docker build/run instructions, if Docker fallback is used.
15. Confirmation that no real customer data is used.
16. Confirmation that no secrets are committed.

---

## Testing Checklist

Before submission, verify:

- [ ] `GET /health` returns exactly `{"status":"ok"}`.
- [ ] Main endpoint accepts sample JSON.
- [ ] Response contains all required fields.
- [ ] Field names match the Problem Statement.
- [ ] Data types match the Problem Statement.
- [ ] Enum values match exactly.
- [ ] Empty optional input is handled safely.
- [ ] Malformed or incomplete input does not crash the server.
- [ ] Sensitive-data requests are handled safely.
- [ ] Unauthorized-action requests are handled safely.
- [ ] External AI failures are handled safely.
- [ ] Endpoint responds within timeout.
- [ ] Public endpoint is reachable from outside the environment.
- [ ] README is complete.
- [ ] `.env.example` exists if env vars are needed.
- [ ] No real secrets are committed.

---

## Submission Checklist

The submission form should include:

- [ ] Team name.
- [ ] Team ID.
- [ ] GitHub repository URL.
- [ ] Submission path: endpoint, Docker fallback, or code-only.
- [ ] Public endpoint base URL, if deployed.
- [ ] Docker build/run command, if Docker fallback is used.
- [ ] Required environment variable names, if applicable.
- [ ] Secrets for judging only through the private field, if needed.
- [ ] Sample request and sample response.
- [ ] AI/model usage explanation.
- [ ] Safety logic explanation.
- [ ] Known limitations.
- [ ] No real customer data confirmation.
- [ ] No secrets committed confirmation.

---

## What Not to Do

Do not:

- Build only a UI or screenshots.
- Submit an endpoint that requires login.
- Use real customer, user, business, financial, or production data.
- Integrate real production APIs that can trigger live actions.
- Ask for sensitive private information or secret credentials.
- Promise unauthorized approvals or guaranteed outcomes.
- Commit API keys.
- Commit `.env` files.
- Rely on huge models, GPU, or multi-GB downloads.
- Leave hidden tests to chance by ignoring schema details.

---

## Troubleshooting Guide

| Problem | What to check |
|---|---|
| `404` on `/health` | Confirm route name and base URL. |
| `404` on main endpoint | Confirm exact endpoint from Problem Statement. |
| Invalid JSON response | Set `Content-Type: application/json`; do not include logs in response body. |
| Schema error | Check required fields, types, enum spelling, and null handling. |
| Timeout | Reduce model calls, add fallback logic, avoid large downloads, cache safe results. |
| External API failure | Handle quota/rate limits and return controlled JSON. |
| Docker works locally but not for judges | Bind to `0.0.0.0`, expose correct port, document run command. |
| Private repo inaccessible | Add organizer GitHub handles before the deadline. |
| Missing secrets | Use hosting env vars or private submission field for Docker/code fallback. |

---

## Definition of Done

The project is ready when:

- The Problem Statement schema is fully implemented.
- `GET /health` works.
- The main POST endpoint works.
- The response schema is exact.
- Safety guardrails are implemented.
- All sample and edge cases pass.
- The endpoint is publicly reachable or Docker fallback is ready.
- GitHub repository is accessible to organizers.
- README is complete.
- `.env.example` is included.
- No real secrets are committed.
- Submission form is complete before the deadline.

---

## Final Principle

Build the API first. Make the schema correct. Add robust reasoning and decision logic. Add safety guardrails. Test it. Deploy it. Submit clearly.

A simple, reliable, safe API is better than a flashy but broken product.
