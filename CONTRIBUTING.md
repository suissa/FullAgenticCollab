# Contributing with FACoP

This repository dogfoods the Full Agentic Collaboration Protocol.

## Contribution authority in FACoP v0.2

FACoP uses **Validated Reason Development (VRD)** for problem contributions.

A contributor does not ask the project to trust or merge their production patch. The contributor provides:

1. a claim;
2. the exact canonical base/revision against which the claim is made;
3. an executable reproduction test;
4. the expected failure identity;
5. prompt/context provenance explaining how the problem was formulated.

The executable test is the authority for the claim. Contributor-produced production code is not an accepted contribution artifact.

> **The contributor proves the problem. The upstream proves the solution.**

## Required problem-contribution package

A VRD branch carries a `contribution/` package only:

```text
contribution/
├── contribution.json
├── reproduction.test.ts   # or another executable test declared by the manifest
├── prompt.md              # safe/redacted externally shareable prompt provenance
└── context/               # optional safe context artifacts referenced by the manifest
```

`contribution.json` declares the claim, base revision, reproduction source, injection target, execution command, expected failure identity and reason-provenance paths.

The reference `contribution-guard` rejects files outside the contribution package on a contributor `-dev` branch. A contributor MAY describe an observed solution in prose, but MUST NOT attach production source, a patch/diff or candidate implementation for upstream acceptance.

## Required flow

1. Open an upstream Issue describing the problem or missing behavior, expected behavior, acceptance criteria and non-goals.
2. Fork/clone as needed.
3. Create `issue-<ID>-<slug>-dev`.
4. Create the code-free `contribution/` package.
5. Write the executable reproduction before any upstream implementation work. For a defect, the reproduction MUST fail on the declared base for the claimed reason.
6. Record the safe prompt/context provenance that led to the claim. Hidden chain-of-thought, credentials and private scratchpads are neither required nor accepted.
7. Push `-dev`. Contributor CI runs the code-free contribution guard, secret scan and trust-plane checks under the contributor repository's own read-only authority.
8. The upstream plane evaluates the reproduction as untrusted executable input and establishes `ProblemProof`: `CanonicalBase + Reproduction => FAIL(claimed failure)`.
9. Only after the problem is accepted as reproduced does the upstream generation plane create its own candidate from the Issue, validated reproduction, repository context and safe prompt/context provenance. It MUST NOT copy or trust a contributor production patch.
10. Promote the upstream-generated candidate to `stage`; upstream-owned unit/integration/E2E/security suites run.
11. Promote to `tests`. The `tests` profile injects the exact same contributor reproduction bytes into isolated base and candidate worktrees and requires:
    - control: base => expected FAIL;
    - treatment: upstream candidate => PASS;
    - identical reproduction digest in both executions.
12. Promote to `qualification`; all policy-required evidence must be current and attested. Valid Content-Addressed Evidence may be reused only under the configured trust policy.
13. Open/update the upstream solution PR with `ProblemProof`, `SolutionProof`, evidence closure and exact generated candidate revision.
14. Observe review/comments/checks. Any candidate change invalidates affected solution evidence; any reproduction change invalidates both problem and solution proof and restarts reproduction validation.
15. Record the final Decision.
16. After acceptance, the project MAY promote the exact verified reproduction to an upstream-owned canonical regression test.

## Branches versus profiles

`-dev`, `-stage`, `-tests` and `-qualification` are GitHub adapter conventions only. FACoP semantics are execution profiles over immutable contribution/base/candidate identities.

The `tests` profile is special: it is the causal comparison point, not merely "more tests".

```text
                  SAME REPRODUCTION R
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        Canonical Base B       Upstream Candidate Cᵤ
              │                     │
              ▼                     ▼
         FAIL(claim)               PASS
              └──────────┬──────────┘
                         ▼
                 FACoP SolutionProof
```

## Contributor tests versus upstream regression tests

Before acceptance, the reproduction is contributor-authored and untrusted. It is executed without upstream write credentials or secret-bearing environment variables.

After acceptance, the exact verified reproduction MAY be promoted to a canonical upstream regression test. Its bytes need not change; its **authority** changes because the project has independently reproduced the problem and qualified an upstream-generated solution against it.

## Governance changes to FACoP itself

Maintainer changes to FACoP specifications, trust roots, workflows, acceptance gates or reference implementations are governance/maintainer changes, not external VRD problem contributions. They remain protected paths and require the escalation rules in `docs/security-model.md`.
