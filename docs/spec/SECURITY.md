# Security Model

This file states the requirements. [`docs/security-model.md`](../security-model.md) states where each one is enforced and by what mechanism, and is normative alongside it.

## Primary boundary

Contributor/fork execution is **untrusted**. Upstream mutation authority is **trusted**. A conforming adapter MUST separate these planes.

## Requirements

- Least-privilege CI tokens.
- No upstream write secrets exposed to workflows executing untrusted fork code.
- Pin third-party CI actions by immutable revision in hardened deployments.
- Treat prompt/context logs as potentially sensitive; redact secrets before persistence.
- Evidence MUST bind to exact source/artifact digests.
- Security scanner output SHOULD use SARIF where possible.
- Dependency/software inventories SHOULD use CycloneDX or SPDX.
- Build artifacts SHOULD carry SLSA/in-toto-compatible provenance/attestations.
- Review approval MUST be invalidated or policy-rechecked when approved code changes.
- Workflows executing untrusted code MUST NOT use `pull_request_target` or `workflow_run`, MUST declare an explicit permissions block with no write scope, and MUST check out with `persist-credentials: false`. Conformance is machine-checked (`npm run test:workflows`).
- Prompt/context logs MUST pass a blocking secret scan before they are persisted as public append-only records (`npm run test:secrets`).
- Reusable Evidence MUST carry a signature from a producer trusted for the consuming profile; content addressing alone is insufficient (`npm run attest:verify`).

## Threats addressed

- fabricated test evidence;
- stale evidence reused after semantic inputs change;
- agent-generated patch diverging from reviewed revision;
- fork CI stealing upstream credentials;
- prompt logs leaking secrets;
- performance claims detached from the environment that produced them;
- contributor-authored tests falsely serving as independent acceptance proof;
- forged first-run evidence replayed through a matching EvidenceKey;
- an evidence passport valid for one revision replayed onto another.
