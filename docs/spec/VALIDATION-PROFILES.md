# Validation Profiles

## local

Purpose: fast contributor feedback plus technical characterization of newly created/changed units.

Recommended: unit, property, mutation where appropriate, fuzz for parsers, benchmark, focused load/stress, focused fault injection/chaos when a failure surface exists.

## dev

Purpose: contributor-repository CI.

Runs tests owned by the contribution and affected upstream tests. Produces portable evidence artifacts. No upstream mutation credentials.

## stage

Purpose: upstream-compatible acceptance.

Mandatory reference profile: unit + integration + E2E + security. The upstream project owns these suites/policies; contributor changes to acceptance tests MUST be reviewed as first-class changes.

## qualification

Purpose: complete evidence closure.

The qualifier enumerates every Evidence requirement. Valid cached evidence is reused; invalid/missing evidence is executed. Qualification fails if any required node is failed, missing, expired or unjustifiably not-applicable.

## upstream

Purpose: proposal lifecycle.

Creates/updates the canonical PR, attaches evidence summary/attestations, observes comments/reviews/checks and re-enters implementation on actionable change requests.

## Why characterization is separate

Benchmark/load/stress/chaos answer “how does this component behave?” rather than only “may this merge?”. This distinction allows rich technical passports without making unstable runner performance an unconditional merge gate.
