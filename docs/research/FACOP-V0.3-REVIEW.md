# FACoP v0.3 Semantic Review Plan

This document records the implementation boundary for the current v0.2 semantic layer. It is not a v0.3 normative specification.

## Resolved by the semantic RFC collection

- A contribution is a validated reason package, not an accepted patch.
- ProblemProof and SolutionProof are distinct causal properties.
- Control and treatment MUST use identical reproduction bytes.
- Evidence reuse is keyed by semantically relevant inputs.
- Contributor and upstream planes have different authority.
- Provenance excludes any requirement to disclose hidden chain-of-thought.
- Acceptance requires evidence qualification and policy authorization.

## Open questions for v0.3

1. Should contribution identities use a protocol-wide canonical serialization before hashing?
2. Which event envelope fields are mandatory for CloudEvents and CDEvents projections?
3. How should partial or flaky reproductions be classified?
4. What is the minimum trusted execution environment for untrusted reproductions?
5. Which invariants should receive TLA+, Alloy or Prolog models?
6. How should evidence revocation propagate through derived passports?
7. Which acceptance properties are universal and which remain project policy?

## Required v0.3 discipline

A v0.3 proposal MUST distinguish protocol invariants, adapter requirements, project policy and research hypotheses. No open question becomes normative merely by appearing in this document.
