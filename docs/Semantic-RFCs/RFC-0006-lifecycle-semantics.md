# RFC-0006 — Lifecycle States and Transitions

- Status: Experimental
- Category: Normative semantic

## Lifecycle

Issue → Claim → ReproductionSubmitted → ProblemProven → ReasonValidated → IndependentRegeneration → CandidateGenerated → SolutionProven → Characterize → Validate → Attest → Qualify → Propose → Review → Observe → Repair → Accept.

## Semantics

A state is a fact about an identified contribution. A transition is an assertion that requires evidence. Implementations MAY collapse operational steps but MUST preserve their semantic distinction.

## Invariants

- No transition may erase prior proof identity.
- ProblemProven MUST precede SolutionProven.
- Accept MUST require valid qualification and review policy.
- Repair MUST create a new observable contribution or revision.
- Reopening a contribution MUST preserve historical evidence.

## Proof obligation

Every transition MUST name its authorizing evidence and predecessor state.
