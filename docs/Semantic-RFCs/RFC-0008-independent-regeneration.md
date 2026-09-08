# RFC-0008 — Independent Regeneration

- Status: Experimental
- Category: Normative semantic

## Definition

Independent Regeneration is upstream-controlled generation of a candidate from the validated claim, repository context and permitted provenance, without accepting the contributor's production patch as the solution.

## Rules

The generated candidate MUST identify its generator, inputs, base revision and output digest. The upstream MUST be able to reproduce or attest the generation context.

## Invariants

- Regeneration MUST use the validated claim.
- Candidate generation MUST be separated from contributor mutation authority.
- Candidate acceptance MUST use the unchanged reproduction.
- A contributor patch MAY be used as diagnostic context but MUST NOT be treated as independently generated.

## Proof obligation

The system MUST link candidate identity to generation inputs and SolutionProof.
