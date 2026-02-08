# FPF Session

## Status
Phase: DEFERRED
Started: 2026-02-07
Deferred: 2026-02-07
Problem: Convert fancy-planties from web app to iOS app — evaluate framework choice, repo strategy, backend reuse, and migration approach
Resume-when: Web app reaches steady state

## Active Hypotheses
| ID | Hypothesis | Status | Deduction | Research | Audit |
|----|------------|--------|-----------|----------|-------|
| ID | Hypothesis | Status | Deduction | Research | Audit |
| H1 | Expo + Monorepo | L1 | ⚠ CONDITIONAL | ✓ Supported | ⚠ Superseded by H3 (drop monorepo) |
| H2 | Capacitor Wrapper | invalid | ✗ FAIL | — | — |
| H3 | Expo + Separate Repo | L1 | ⚠ CONDITIONAL | ✓ Supported | ✓ Zod blocker RESOLVED (v4.0.17+) |
| H4 | SwiftUI Native | L1 | ⚠ CONDITIONAL | ⚠ Partial | ✓ No Zod/CSRF/vendor risk |
| H5 | Expo Router Universal | invalid | ✗ FAIL | — | — |

## Audit Summary
- **Blockers found:** 0 (Zod v4 + Hermes resolved post-audit — all issues fixed in v4.0.17+, project uses ^4.1.5)
- **Warnings:** 5 (CSRF bypass, timeline 2-3x optimistic, Lucia deprecation, image pipeline, App Store 4.2)
- **Accepted risks:** 4 (Lucia unpatched, monorepo overhead, EAS vendor lock, Unraid fragility)
- **WLNK R_eff:** H1=MEDIUM (superseded by H3), H3=MEDIUM (Zod resolved, type drift is weakest link), H4=MEDIUM (learning curve is known-known)
- **Bias detected:** Confirmation, sunk cost, availability, anchoring, survivorship
- **Recommendation:** H3 vs H4 — decision deferred until web app reaches steady state

## Key Audit Findings
1. ~~Zod v4 throws errors in Hermes engine~~ → **RESOLVED** (GitHub #5070, #4690, #4148, #4989 all CLOSED, fixed in v4.0.17)
2. CSRF middleware will reject ALL mobile POST/PUT/DELETE → unverified in any evidence
3. Timeline 8-12 wks → realistic 20-30 wks for solo dev at ~15 hrs/wk
4. Actual code reuse web↔mobile is ~2-5% (schemas + types only)
5. H4's realistic timeline (16-24 wks) OVERLAPS with corrected H3 (20-30 wks)
6. "Drop the monorepo" recommendation: H3 gives 90% of H1's benefit, none of the overhead

## Phase Transitions Log
| Timestamp | From | To | Trigger |
|-----------|------|-----|---------|
| 2026-02-06 | — | INITIALIZED | (auto after DRR-001) |
| 2026-02-07 | INITIALIZED | ABDUCTION_COMPLETE | /q1-hypothesize |
| 2026-02-07 | ABDUCTION_COMPLETE | DEDUCTION_COMPLETE | /q2-check |
| 2026-02-07 | DEDUCTION_COMPLETE | INDUCTION_COMPLETE | /q3-research |
| 2026-02-07 | INDUCTION_COMPLETE | AUDIT_COMPLETE | /q4-audit |
| 2026-02-07 | AUDIT_COMPLETE | DEFERRED | /q5-decide (human: defer until steady state) |

## Previous Cycle
- **Completed:** 2026-02-06
- **Decision:** DRR-001 — Image thumbnail generation (H1 + H4)
- **Archive:** `.fpf/sessions/2026-02-06-image-thumbnails.md`

## Next Step
Resume with `/q5-decide` when web app reaches steady state. Zod blocker is resolved. Decision is between H3 (Expo separate repo) and H4 (SwiftUI native).
