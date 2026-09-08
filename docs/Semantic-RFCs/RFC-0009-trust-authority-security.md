# RFC-0009 — Trust, Authority and Security Boundaries

- Status: Experimental
- Category: Normative semantic

## Authority model

Authority is scoped: the contributor can assert a claim and submit evidence; the reproduction can demonstrate a failure; the upstream can generate a candidate; the verifier can attest a property; the acceptance policy can authorize promotion.

No artifact has authority beyond its declared property.

## Invariants

- A passing reproduction authorizes only the property it tests.
- An issuer MUST NOT attest its own unverified solution where independent verification is required.
- Credentials, secrets and protected paths MUST be policy-controlled.
- Evidence provenance MUST be tamper-evident.

## Proof obligation

The security model MUST map every privileged operation to an authorized plane, identity and policy decision.
