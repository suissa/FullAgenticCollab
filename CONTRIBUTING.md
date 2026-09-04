# Contributing with FACoP

This repository dogfoods the Full Agentic Collaboration Protocol.

## Required flow

1. Open an upstream Issue describing the problem, current behavior, intended behavior, acceptance criteria and non-goals.
2. Fork/clone as needed.
3. Create `issue-<ID>-<slug>-dev`.
4. For defect fixes, add an executable reproduction proving base=FAIL before implementing the fix.
5. Add/update the action README and machine-readable contracts before or with implementation.
6. Record agentic attempts in `docs/prompts/<ISSUE-ID>.md`; do not publish secrets or hidden chain-of-thought. This is enforced, not advisory: `npm run test:secrets` blocks any commit whose prompt log carries credential-shaped content, and it runs before the log becomes public and append-only. See [`docs/security-model.md` §2](docs/security-model.md).
7. Make an implementation-start marker commit (an empty commit is allowed by this repository's reference policy).
8. Implement and run the `local` profile over changed actions.
9. Push `-dev`; contributor CI validates changed/affected action evidence. **Contributor CI runs in your own repository/fork, under your repository's own token; it holds no upstream write credential and no `pull_request_target` step.** The upstream PR is created by the upstream plane (or by you, by hand) after evidence has been received — never by CI executing contributor code. See [`docs/security-model.md` §1](docs/security-model.md).
10. Promote the same revision to the `stage` profile; upstream-controlled unit/integration/E2E/security suites run.
11. Promote to `tests`/qualification; all required evidence must be current. Content-Addressed Evidence may be reused only when its EvidenceKey matches **and** it arrives inside an attestation signed by a producer trusted for that profile (`config/trusted-keys.json`). An EvidenceKey proves nothing changed; the signature is what vouches that the original run was honest. See [`docs/security-model.md` §3](docs/security-model.md).
12. Open the upstream PR with the evidence summary and exact revision digest.
13. Observe reviews/comments/checks; every code-changing response creates a new revision and invalidates affected evidence.
14. Record the final Decision.

## Branches versus profiles

`-dev`, `-stage` and `-tests` are GitHub adapter conventions only. FACoP semantics are execution profiles over a contribution revision. Implementations MUST prevent silent drift between promoted revisions.

## Tests owned by contributors versus upstream

Action folders contain contributor-visible unit evidence. Repository `tests/integration`, `tests/e2e` and security policies are project-owned acceptance evidence. A contribution changing these files is valid, but those changes require explicit review and cannot be treated as independent proof of the same patch without policy approval.
