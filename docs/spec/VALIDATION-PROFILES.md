# Validation Profiles v0.2

FACoP v0.2 separates proving the contributor's problem from proving the upstream-generated solution.

## local

Purpose: fast contributor feedback while constructing the code-free contribution package.

Recommended:

- execute the reproduction locally against the contributor's declared base when practical;
- validate contribution manifest shape;
- compute reproduction digest;
- redact/scan prompt and context provenance.

A local pass/fail is contributor evidence only. The upstream still reproduces independently.

## dev

Purpose: contributor-repository CI over a **code-free problem contribution**.

Required reference gates:

- contribution bundle structure;
- no production-source/diff changes outside the declared contribution package;
- secret/provenance scan;
- trust-plane workflow guard;
- optional contributor-side reproduction result.

The dev plane holds no upstream mutation credentials.

## stage

Purpose: upstream-controlled candidate generation/integration and conventional acceptance suites.

The generated candidate is owned by the upstream generation/maintainer plane. Mandatory reference suites remain unit + integration + E2E + security over affected scope.

The contributor reproduction MAY be used as context, but its causal proof belongs to the `tests` profile.

## tests

Purpose: **causal validation of the contributed reason and the independently generated solution**.

The profile MUST use the same reproduction bytes for both executions:

```text
Control:   CanonicalBase + R            => FAIL(claimed failure)
Treatment: CanonicalBase + Candidate + R => PASS
Constraint: hash(R_control) == hash(R_treatment)
```

Reference adapters SHOULD inject the reproduction into isolated worktrees rather than permanently modifying the base revision.

The contributor reproduction is untrusted executable input. The test execution environment MUST NOT receive upstream write credentials, generation secrets or merge authority. The reference runner also strips credential-shaped environment variables before starting the reproduction command.

The profile emits machine-readable `ProblemProof` and `SolutionProof` evidence.

## qualification

Purpose: complete evidence closure after `tests` has produced a valid SolutionProof.

The qualifier enumerates every Evidence requirement. Valid cached evidence is reused only when its EvidenceKey and attestation remain valid. Qualification fails if any required node is failed, missing, expired, revoked or unjustifiably `not-applicable`.

For a VRD change, required closure SHOULD include:

- ProblemProof;
- SolutionProof;
- upstream stage acceptance evidence;
- relevant characterization evidence;
- attestation/provenance evidence.

## upstream

Purpose: canonical generated-solution proposal lifecycle.

Creates/updates the upstream-owned PR, attaches ProblemProof/SolutionProof and evidence summary, observes comments/reviews/checks and re-enters generation/validation on actionable change requests.

## Recommended order

`local → dev → stage → tests → qualification → upstream`

A project MAY prove the problem earlier than `stage` to avoid spending generation resources on an invalid claim. That early execution does not weaken the requirement that the `tests` profile later performs the immutable control/treatment comparison used by SolutionProof.

## Why characterization is separate

Benchmark/load/stress/chaos answer “how does this generated component behave?” rather than only “does it satisfy the contributed reproduction?”. A candidate that passes the reproduction can still be rejected for regressions, security, performance, resource or resilience reasons.
