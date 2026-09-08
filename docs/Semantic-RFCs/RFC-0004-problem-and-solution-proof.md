# RFC-0004 — ProblemProof and SolutionProof

- Status: Experimental
- Category: Normative semantic

## Definitions

Let B be the canonical base, R the exact reproduction bytes, P the expected failure identity and Cu an upstream candidate.

Problem proof requires: `R(B) = FAIL(P)`.

Solution proof requires: `R(B + Cu) = PASS` and `hash(R_control) = hash(R_treatment)`.

## Invariants

- Control and treatment MUST use identical reproduction bytes.
- The base revision MUST be pinned.
- The candidate revision MUST be recorded.
- A test that passes on B does not prove the problem.
- A test failing for an unrelated cause does not prove P.
- SolutionProof MUST NOT be accepted without a valid ProblemProof.

## Evidence

Both proofs MUST record command, environment identity, exit result, logs or structured output, timestamps and content digests.

## Proof obligation

The verifier MUST establish failure identity, reproduction equality and candidate attribution before declaring solution success.
