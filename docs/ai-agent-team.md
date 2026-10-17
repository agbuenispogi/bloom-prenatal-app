# Bloom build crew: AI agent team

Adapted from `~/.claude/templates/ai-agent-team-blueprint.md`. Bloom has no AI at runtime, so this team covers **how Bloom gets built and changed**: a feature or regimen change goes in, and a reviewed, tested, deployed change comes out.

## 1. Executive summary

- **Mission:** ship and maintain a reliable medication companion. A missed reminder is the costliest failure, and an ugly or naggy UI is the second.
- **Constraints:** the regimen comes only from her OB, so agents never change timing defaults on their own. No secrets or health data in the repo or in memory. All time logic is in Asia/Manila. Human approval is required for migrations, deploys and anything that sends real notifications.
- **KPIs:** engine tests 100% green. Reminder delivery ≤ 60 s after due. "Done" → next item scheduled in < 2 s. Lighthouse PWA/a11y ≥ 95. Zero RLS leaks (cross-household test). She stays signed in for weeks.
- **Four agents, no coordinator agent.** The main Claude Code session routes the work.

## 2. Team

| # | Agent | Model | Job | What breaks without it |
|---|---|---|---|---|
| 1 | **Builder** (main session) | `claude-opus-5-5` | Plans and writes code, migrations and edge functions | — |
| 2 | **schedule-engine-reviewer** | `claude-sonnet-5-5` | Checks engine changes against the regimen rules and runs the tests | Wrong dose times reach a pregnant patient |
| 3 | **ui-critic** | `claude-sonnet-5-5` | Checks screens against the design bar, a11y and copy tone | The app feels like a chore, so she stops using it |
| 4 | **Impeccable finish reviewer** (plugin) | plugin default | Final `/critique`, `/audit` and `/polish` passes per screen | Inconsistent polish |
| — | **Ag (human approver)** | — | Approves migrations, deploys and real sends; owns regimen changes | Unreviewed prod changes |

Left out on purpose: a separate "test writer" (the Builder writes tests, the reviewer checks coverage) and a "release manager" (Ag approves deploys).

## 3. Handoff schemas

```json
// change_request.json  (Ag or Builder → Builder)
{ "id": "CR-001", "kind": "feature | regimen_change | bugfix | design",
  "summary": "…", "source": "ag | ob_instruction | qa",
  "touches": ["engine", "db", "ui", "reminders", "email"],
  "needs_approval": ["migration", "deploy", "real_send"] }

// build_result.json  (Builder → reviewers)
{ "id": "CR-001", "files_changed": ["…"], "migrations": ["…"],
  "tests": { "unit": "pass | fail", "e2e": "pass | fail | not_run" },
  "screens": ["home"], "screenshots": ["docs/screens/home-390-light.png"] }

// review.json  (each reviewer → Builder): see the JSON blocks in .claude/agents/*.md
{ "verdict": "pass | revise", "issues": [] }

// approval_request.json  (Builder → Ag)
{ "id": "CR-001", "action": "supabase db push | vercel --prod | send test push",
  "risk": "low | medium | high", "rollback": "…" }
```

## 4. Workflow

```
change_request → Builder → build_result
   ├─ engine touched → schedule-engine-reviewer ─┐
   ├─ UI touched     → ui-critic + Impeccable ───┤→ all pass? → approval_request → Ag → apply/deploy
   └─ revise ◄────────────────────────────────────┘   (max 2 revise loops, then ask Ag)
```

## 5. Human-in-the-loop rules
- Always ask before: `supabase db push`, function deploys, `vercel --prod`, `git push`, and any send to real phone numbers or emails.
- A regimen change needs a `change_request` with `source: "ob_instruction"`. Agents may suggest changes but never apply them on their own.

## 6. 7-day plan
| Day | Work |
|---|---|
| 1 | Phase 1–2: setup, schema, RLS, auth |
| 2 | Phase 3: engine + tests, reviewer pass |
| 3 | Phase 4: Impeccable teach, Home, Done flow, timeline |
| 4 | Phase 4–5: remaining screens, reminders pipeline |
| 5 | Phase 5–6: push on a real iPhone, emails, summary |
| 6 | Phase 7: e2e, Lighthouse, polish |
| 7 | Phase 8: deploy, invite wife, install on her phone, watch day 1 |

## 7. Measuring success (weekly)
Reminder delay p95 · % doses on time · nag/escalation count · e2e pass rate · number of times she had to log in again (target 0).
