# Contribution and Agent Provenance

FACoP records **observable provenance**, not private model reasoning.

Under Validated Reason Development, prompt/context provenance is part of the contributed explanation of the problem, while the executable reproduction remains the normative authority for whether the claim is demonstrated.

## What SHOULD be recorded

For each contribution/attempt:

- contribution/issue identity;
- actor type and trust plane;
- agent/tool name and version when known;
- model provider/model identifier when known;
- prompt text after secret redaction, or a digest plus safe summary;
- context artifact digests;
- reproduction-test digest and expected failure identity;
- tool calls that materially changed upstream-generated artifacts;
- upstream generated-candidate revision/digest;
- validation result;
- acceptance/rejection reason.

A contributor production-patch digest is not required by VRD because contributor production code is not an authoritative contribution artifact.

## What MUST NOT be required

FACoP MUST NOT require hidden chain-of-thought, model private scratchpads, credentials, private repository content or secrets to be published.

`Validated Reason` therefore means externally inspectable engineering rationale backed by executable evidence — not disclosure or validation of a model's private reasoning process.

## Contribution prompt versus upstream generation prompt

FACoP distinguishes:

- `ContributorReasonPrompt`: safe/redacted prompt or instruction provenance explaining how the contributor formulated/reproduced the problem;
- `UpstreamGenerationPrompt`: the upstream-controlled instruction actually used to generate a candidate.

The upstream prompt MAY incorporate safe contributor provenance, but MUST remain independently controlled and MUST NOT require contributor implementation code.

## Prompt changelog

`docs/prompts/<ISSUE-ID>.md` remains the human-readable append-only maintainer/reference representation. A code-free external problem contribution MAY carry its prompt inside `contribution/` while it is under evaluation; after acceptance the upstream MAY archive the safe record into the canonical provenance store.

Implementations SHOULD additionally produce machine-readable Attempt/Generation records.

Because provenance logs can become append-only and public, redaction MUST be enforced by a blocking secret scan **before** acceptance — at a pre-commit hook, a pre-receive hook or push ruleset, and a required CI check — not by author discipline alone. The reference `test:secrets` gate scans the active `contribution/` package as well as canonical provenance locations.

A finding blocks the contribution and is treated as a credential-rotation event. See [`docs/security-model.md` §2](../security-model.md).

## Relationship to SLSA/in-toto

SLSA and in-toto answer questions about how artifacts and supply-chain steps were produced and verified. FACoP extends the semantic scope backward to the Claim/ValidatedReason and sideways to independent generation, agent attempts, review feedback and acceptance evidence.
