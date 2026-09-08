# RFC-0005 — Evidence, EvidenceKey and EvidencePassport

- Status: Experimental
- Category: Normative semantic

## Definitions

**Evidence** is an artifact supporting a property. **EvidenceKey** is the deterministic identity of the inputs that can affect that property. **EvidencePassport** is a signed or integrity-protected portable summary of evidence.

## Rules

Evidence MAY be reused only when its EvidenceKey is unchanged and its status is valid. For VRD, the key MUST include reproduction digest, base revision and candidate revision when applicable.

Statuses are pass, fail, not-applicable, missing, expired or revoked.

## Invariants

- Evidence MUST be content-addressed.
- Reuse MUST be explainable from the key.
- Expired or revoked evidence MUST NOT authorize qualification.
- A passport MUST identify issuer, subject, evidence references and verification status.

## Proof obligation

Qualification MUST prove evidence closure for every required property; it MUST NOT rely on execution count alone.
