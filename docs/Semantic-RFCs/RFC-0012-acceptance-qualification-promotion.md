# RFC-0012 — Acceptance, Qualification and Promotion

- Status: Experimental
- Category: Normative semantic

## Definitions

**Characterize** establishes behavior and boundaries. **Validate** checks required properties. **Attest** records verified results. **Qualify** proves evidence closure. **Accept** is the upstream decision to incorporate a result. **Promote** moves a verified reproduction into upstream-owned regression coverage.

## Invariants

- Acceptance MUST NOT be inferred from a passing individual test.
- Qualification MUST include all required properties and policy checks.
- Promotion MUST preserve the exact verified reproduction digest.
- Promotion MAY occur only after SolutionProof and policy authorization.
- Rejection MUST preserve evidence and reason.

## Proof obligation

The acceptance record MUST identify contribution, candidate, proof artifacts, policy version, verifier and final decision.

## Compatibility

This RFC governs semantic interpretation; it does not require a particular CI provider, branch layout or programming language.
