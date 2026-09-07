```markdown
# STATEMENT OF WORK

## PRODUCT 001

# SafiChat NATS → Redpanda Event Mirror

**6 HOURS MAXIMUM — DELIVER OR NOTHING**

---

## 1. FINISHED PRODUCT

Continuously mirror selected durable semantic events from our existing SafiChat NATS/JetStream infrastructure into Redpanda on our AWS infrastructure.

**SafiChat → NATS → JetStream → Redpanda Connect → Redpanda**

**Invariant:** Redpanda is NEVER in the SafiChat/Product critical path.

If Redpanda or Redpanda Connect is unavailable, SafiChat and NATS continue normally. When Redpanda returns, missed durable events catch up automatically.

---

## 2. STARTING POINT

- Existing NATS and JetStream are installed and working.
- Developer already knows NATS; prior Redpanda experience is not required.
- SafiChat code, company Git repositories, AWS dev/staging infrastructure, and required access are provided.
- Maximum practical use of AI is expected; reasonable AI/API development spend is reimbursed.
- Unlimited use of suitable open-source software is encouraged. Reuse existing infrastructure wherever possible.

---

## 3. TECHNOLOGY DECISION — ALREADY MADE

Use Redpanda + Redpanda Connect. Do not write a custom NATS-to-Redpanda bridge.

- **Input:** Redpanda Connect `nats_jetstream` with a durable consumer.
- **Output:** Redpanda Connect unified `redpanda` output.
- **Redpanda topic:** `platform-events-v1`.
- **Redpanda record key:** `context_id` so events for one Context remain ordered within a partition.

---

## 4. EVENT CONTRACT

| Field | Requirement |
|---|---|
| `event_id` | Preserve existing globally unique ID. If absent, create deterministic ID from JetStream stream + stream sequence; never generate a new random ID on redelivery. |
| `timestamp` | Original event timestamp where available. |
| `tenant_id` | Tenant identity from existing SafiChat event/context. |
| `context_id` | SafiChat Context ID; also the Redpanda record key. |
| `subject` | Original NATS subject, preserved exactly. |
| `event_type` | Semantic event type, e.g. `user.message` or `product.completed`. |
| `payload` | Original semantic payload; avoid unnecessary transformation. |

---

## 5. WHAT GETS MIRRORED

### MIRROR — DURABLE / SEMANTIC

- `user.message`
- `assistant.message`
- `product.requested` / `started` / `completed` / `failed`
- `artifact.created` / `updated`
- `approval.requested` / `completed`
- `error` / `audit` / `usage`

### DO NOT MIRROR — EPHEMERAL

- `token.delta`
- `typing`
- `presence`
- `heartbeat`
- `temporary progress`

---

## 6. HOW TO BUILD IT — AI-FIRST EXECUTION PLAN

The SOW author has already chosen the shortest credible path to DONE. The developer executes this path, uses AI to compress discovery/debugging/testing, and does not expand scope.

| Time | Phase | Do / Use AI For | Exit Gate |
|---|---|---|---|
| **0:00–0:30** | **AI Discovery** | Give AI the relevant repo/config. Have it identify NATS URL/config, JetStream stream(s), SafiChat subject conventions, event shape, credentials pattern, AWS deploy method, durable vs transient subjects, and the minimum-change plan. Do not redesign. | By 0:30 all dependencies and exact integration points are known. |
| **0:30–1:30** | **Redpanda Up** | Use the company’s existing AWS deployment pattern. Use AI to generate the smallest working Redpanda deployment/config. Create `platform-events-v1`. Verify immediately with `rpk` or equivalent: produce one event and consume it. | Redpanda is running in AWS and topic read/write works. |
| **1:30–2:30** | **Connect JetStream** | Configure Redpanda Connect `nats_jetstream` input with a durable consumer and unified `redpanda` output. Reuse existing NATS auth and AWS secrets. Never commit secrets. | A real JetStream event arrives in Redpanda. |
| **2:30–3:15** | **Normalize Event** | Preserve existing event envelope. Add only missing required fields. Preserve original `nats_subject`. Use deterministic event ID from stream + sequence if no `event_id` exists. Use `context_id` as key. | One event in Redpanda has the exact required contract. |
| **3:15–4:00** | **Automated Proof** | Ask AI to generate a small test script in the repo’s standard language: 10 Contexts × 10 numbered events = 100; consume and verify count, required fields, subject preservation and per-Context ordering. Produce clear PASS/FAIL. | 100/100 received; fields, subject and ordering PASS. |
| **4:00–4:45** | **Failure Test** | Stop/make Redpanda unavailable. Keep SafiChat in use and publish durable events. Verify NATS/SafiChat remain normal. Restart Redpanda and confirm missed events catch up. Use AI on logs/state only if needed. | Outage does not affect SafiChat; catch-up succeeds. |
| **4:45–5:30** | **Dogfood SafiChat** | At least two team members use SafiChat for real work: send messages, receive responses, start a Context, continue a Context. Verify corresponding semantic events in Redpanda. Include some use while Redpanda is down. | Two users confirm SafiChat works normally; real events verified. |
| **5:30–6:00** | **AI Review + Deliver** | NO NEW FEATURES. Give AI the implementation, Git diff, logs and test results. Ask only for SOW-blocking defects, security mistakes, leaked secrets, unnecessary complexity or unproven acceptance criteria. Fix blockers; rerun tests; commit/push. | AWS deployment matches Git; all acceptance tests pass by Hour 6. |

---

## 7. AI OPERATING RULES

- Inspect before generating. AI must work from the actual repository/configuration, not assumptions.
- Reuse before coding. Ask AI to identify existing components, scripts, deployment patterns and libraries first.
- Generate the boring parts: configuration, mappings, test harnesses, log analysis, review and README.
- Developer remains responsible for correctness. “AI generated it” is never an excuse for defective delivery.
- If stuck, give AI the exact error, relevant config/logs and expected acceptance criterion; do not wander into broad research.
- At 5:30 stop feature work. AI review is limited to defects that block this SOW.

---

## 8. MINIMUM CONFIGURATION SHAPE

```yaml
input:
  nats_jetstream:
    urls: [${NATS_URL}]
    stream: ${SAFICHAT_STREAM}
    subject: ${SAFICHAT_SUBJECT}
    durable: safichat-redpanda-v1

output:
  redpanda:
    seed_brokers: [${REDPANDA_BROKERS}]
    topic: platform-events-v1
    key: ${! json("context_id") }
```

This is a configuration shape, not a blind copy/paste contract. AI must adapt it to the actual SafiChat event structure, authentication and current Redpanda Connect version.

---

## 9. ACCEPTANCE TESTS


| ID     | Test                 | PASS Condition                                                                    |
| ------ | -------------------- | --------------------------------------------------------------------------------- |
| **A1** | 100 Event Test       | 100/100 semantic test events arrive in `platform-events-v1`.                      |
| **A2** | Context Ordering     | Numbered events for each Context are consumed in the same order.                  |
| **A3** | Subject Preservation | Original NATS subject is visible and correct in Redpanda.                         |
| **A4** | Redpanda Failure     | Stop Redpanda; SafiChat and NATS continue working normally.                       |
| **A5** | Catch-Up             | Durable events generated during outage arrive automatically after recovery.       |
| **A6** | Connector Restart    | Restart Redpanda Connect; processing resumes without manual data repair.          |
| **A7** | Real User Test       | At least two team members use SafiChat successfully for actual work.              |
| **A8** | Git / AWS            | Running AWS version is produced from code/configuration committed to company Git. |


---

## 10. SAFICHAT DOGFOOD / USER TESTING

A Product that passes technical tests but has not been used by our own team is NOT DONE.

- At least two team users must use SafiChat for real conversations, not synthetic-only tests.
- Run part of user testing with Redpanda deliberately unavailable; SafiChat must remain normal.
- Verify real user/assistant/Context/subject events and post-recovery catch-up. Fix dogfood defects inside six hours or split them into a separate Product.

---

## 11. DELIVERABLES BY HOUR 6

- Redpanda and Redpanda Connect running on our AWS infrastructure.
- Continuous JetStream → Redpanda mirroring operating, with real SafiChat semantic events verified.
- Redpanda outage proven not to interrupt SafiChat/NATS; catch-up and connector restart proven.
- Configuration/source committed and pushed to company Git.
- Acceptance tests A1–A8 demonstrated successfully.
- Short README: what it does, how it runs, status check, test, restart, configuration location.

---

## 12. OUT OF SCOPE / DO NOT BUILD

- NATS/SafiChat redesign; new specialized Redpanda topics; exactly-once application semantics.
- Custom NATS-to-Redpanda connector if Redpanda Connect works.
- Dashboards, search, data warehouse, Schema Registry or training pipelines.
- A new AWS deployment architecture just for this Product.
- Changes that make existing backend Products know Redpanda exists.

---

## 13. DEFINITION OF DONE

**REAL USER → SafiChat → NATS → JetStream → Redpanda Connect → platform-events-v1 → VERIFIED EVENT**

Redpanda down: SafiChat + NATS still work. Redpanda returns: missed durable events catch up.

Two team members have actually used SafiChat.

**Technical PASS without real team use = NOT DONE.**

---

## 14. SIX-HOUR RULE

The six hours include understanding, AI work, implementation, AWS deployment, automated testing, failure testing, user testing, fixing, Git commit/push and final delivery.

**AT HOUR 6: DELIVERED OR: FAILED**

**NO SEVENTH HOUR. NO “ALMOST DONE.” NO UNFINISHED PRODUCT.**

```

```



This is based directly on the uploaded 3 page PDF, including its section order and technical terminology. :contentReference[oaicite:1]{index=1}

```

```

