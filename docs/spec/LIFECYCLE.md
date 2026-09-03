# FACoP Lifecycle

## State machine

```text
PROPOSED
  → CLAIMED
  → REPRODUCING
  → REPRODUCED
  → SPECIFIED
  → IMPLEMENTING
  → CHARACTERIZING
  → CONTRIBUTOR_VALIDATED
  → UPSTREAM_VALIDATING
  → QUALIFIED
  → PROPOSED_FOR_MERGE
  → UNDER_REVIEW
  ├→ CHANGES_REQUESTED → IMPLEMENTING
  ├→ REJECTED
  └→ ACCEPTED
```

A state is evidence-backed. Merely naming a branch `stage` does not place a contribution in `UPSTREAM_VALIDATING`.

## Transition invariants

1. Every transition references `contribution_id` and immutable `subject_revision`.
2. `REPRODUCED` requires a reproduction artifact or an explicit `not_reproducible` justification approved by policy.
3. `CONTRIBUTOR_VALIDATED` requires contributor-profile evidence for the affected scope.
4. `QUALIFIED` requires all policy-required Evidence nodes to be current, passing or explicitly accepted as `not-applicable`.
5. A review against revision A does not automatically approve revision B.
6. An accepted decision MUST reference the exact revision merged.

## Branch adapter recommendation

A GitHub adapter MAY expose:

- `issue-<id>-<slug>-dev`
- `issue-<id>-<slug>-stage`
- `issue-<id>-<slug>-tests`

but these are views/materializations. The normative identity remains the commit/artifact hash plus Contribution ID.
