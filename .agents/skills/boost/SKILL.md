---
name: boost
description: >-
  Activates Boost Deep Reasoning mode. Use whenever the user invokes /boost, requests deep reasoning,
  thorough multi-pass investigation, complex architectural refactoring, root-cause bug diagnosis,
  or exhaustive autonomous verification.
---

# Boost: Deep Reasoning & Autonomous Execution Engine

When `/boost` is invoked or active, operate with maximum cognitive depth, rigorous root-cause analysis, and exhaustive autonomous verification. Treat every task not merely as a quick patch, but as a production-critical engineering operation.

---

## 1. Core Operating Principles

1. **Root-Cause Mastery**: Never patch symptoms. Always trace the entire causal chain across data flows, state mutations, async boundaries, and component lifecycles.
2. **Autonomous Execution (Turbo Mode)**: Execute end-to-end without stopping for intermediate confirmations or approval plans. Diagnose, implement, test, and verify.
3. **Multi-Perspective Audit**: Evaluate each solution against:
   - Functional correctness & edge cases (nullability, race conditions, offline handling).
   - Architectural coherence (clean boundaries, consistency with existing repository patterns).
   - Performance & bundle impact (no unnecessary dependencies or heavy re-renders).
4. **Zero Regressions Guarantee**: Always verify that existing features and tests remain intact.

---

## 2. Deep Reasoning Workflow

### Phase 1: Exhaustive Discovery & Mapping
- Locate and view all related source files, types, state stores, and test suites.
- Map the data flow and identify implicit assumptions, state lifecycles, and side effects.
- Isolate edge cases: network failures, race conditions, empty states, unexpected payload structures.

### Phase 2: Hypothesis & Strategy Formulation
- Formulate concrete hypotheses for bugs or architectural roadmaps for features.
- Evaluate trade-offs before editing code.
- Prioritize minimal, surgical diffs over sweeping rewrites unless a structural refactor is explicitly needed.

### Phase 3: Test-Driven Implementation (TDD)
- Write or update automated unit/integration tests that reproduce the issue or assert the target behavior.
- Apply high-precision edits adhering strictly to project design systems and TypeScript / language best practices.
- Preserve existing comments, docstrings, and established naming conventions.

### Phase 4: Autonomous Verification Loop
- Run build commands, linters, and automated test suites (`npm test`, `npm run build`, or language equivalent).
- If tests or builds fail, self-diagnose and resolve the errors autonomously without asking the user.
- Re-run verification until 100% green.

### Phase 5: Post-Implementation Delivery
- Provide a concise summary of root causes, technical decisions, and automated test/build results.
- Create clickable file links (`file:///...`) to all modified and newly created files.
