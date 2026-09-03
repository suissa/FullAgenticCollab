# Security Model

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

## Threats addressed

- fabricated test evidence;
- stale evidence reused after semantic inputs change;
- agent-generated patch diverging from reviewed revision;
- fork CI stealing upstream credentials;
- prompt logs leaking secrets;
- performance claims detached from the environment that produced them;
- contributor-authored tests falsely serving as independent acceptance proof.
