# Contribution and Agent Provenance

FACoP records **observable provenance**, not private model reasoning.

## What SHOULD be recorded

For each attempt:

- contribution/issue identity;
- actor type;
- agent/tool name and version when known;
- model provider/model identifier when known;
- prompt text after secret redaction, or a digest plus safe summary;
- context artifact digests;
- tool calls that materially changed artifacts;
- produced patch/commit digest;
- validation result;
- acceptance/rejection reason.

## What MUST NOT be required

FACoP MUST NOT require hidden chain-of-thought, model private scratchpads, credentials, private repository content or secrets to be published.

## Prompt changelog

`docs/prompts/<ISSUE-ID>.md` is the human-readable append-only representation. Implementations SHOULD additionally produce a machine-readable Attempt record.

Because the changelog is append-only and public, redaction MUST be enforced by a blocking secret scan **before** the commit is accepted — at a pre-commit hook, a pre-receive hook or push ruleset, and a required CI check — not by author discipline alone. The reference gate is `npm run test:secrets`; gitleaks or trufflehog substitute at the same positions. A finding blocks the contribution and is treated as a credential-rotation event. See [`docs/security-model.md` §2](../security-model.md).

## Relationship to SLSA/in-toto

SLSA and in-toto answer questions about how artifacts and supply-chain steps were produced and verified. FACoP extends the semantic scope backward to the contribution intent/problem and sideways to agent attempts, review feedback and acceptance evidence.
