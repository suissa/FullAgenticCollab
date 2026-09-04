# FACoP Lifecycle v0.2

## State machine

```text
SUBMITTED
  → CLAIMED
  → REPRODUCTION_SUBMITTED
  → PROBLEM_PROVEN
  → REASON_VALIDATED
  → REGENERATING
  → CANDIDATE_GENERATED
  → SOLUTION_PROVING
  → SOLUTION_PROVEN
  → CHARACTERIZING
  → UPSTREAM_VALIDATING
  → ATTESTED
  → QUALIFIED
  → PROPOSED_FOR_MERGE
  → UNDER_REVIEW
  ├→ CHANGES_REQUESTED → REGENERATING
  ├→ REJECTED
  └→ ACCEPTED
```

A state is evidence-backed. Merely naming a branch `tests` does not place a contribution in `SOLUTION_PROVING`.

## Transition invariants

1. Every transition references `contribution_id` and immutable contribution/base/reproduction identities.
2. `REPRODUCTION_SUBMITTED` requires a code-free contribution package containing Claim, ReproductionArtifact and ExpectedFailure.
3. `PROBLEM_PROVEN` requires execution of the contributor reproduction against the declared canonical base and observation of the claimed failure identity.
4. `REASON_VALIDATED` requires a current ProblemProof plus safe, externally shareable prompt/context provenance. Hidden chain-of-thought is not part of the state.
5. `CANDIDATE_GENERATED` requires an upstream-controlled candidate identity. Contributor production patch bytes MUST NOT be the authoritative candidate.
6. `SOLUTION_PROVEN` requires the unchanged reproduction to fail as claimed on the control base and pass on the generated candidate, with identical reproduction digest in both executions.
7. Changing the reproduction after `PROBLEM_PROVEN` invalidates both ProblemProof and SolutionProof and returns to `REPRODUCTION_SUBMITTED`.
8. Changing only the generated candidate invalidates SolutionProof and candidate-dependent evidence but MAY preserve ProblemProof.
9. `QUALIFIED` requires all policy-required Evidence nodes to be current, passing or explicitly accepted as `not-applicable`.
10. A review against candidate revision A does not automatically approve candidate revision B.
11. An accepted decision MUST reference the exact generated revision/artifact merged.

## Authority transition of the test

```text
ContributorReproductionTest (untrusted)
        │
        │ base execution proves claim
        ▼
VerifiedReproductionTest
        │
        │ upstream candidate accepted
        ▼
CanonicalRegressionTest (optional promotion)
```

The byte content MAY remain identical. What changes is project ownership and evidentiary authority.

## Branch adapter recommendation

A GitHub adapter MAY expose:

- `issue-<id>-<slug>-dev` — contributor code-free package;
- `issue-<id>-<slug>-stage` — upstream-generated candidate plus upstream suites;
- `issue-<id>-<slug>-tests` — causal base/candidate reproduction proof;
- `issue-<id>-<slug>-qualification` — evidence closure/attestation.

These are views/materializations. The normative identity remains the contribution ID plus canonical base, reproduction digest, generated-candidate digest and evidence keys.
