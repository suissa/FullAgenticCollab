# RFC-0010 — FACoP Events and Interoperability

- Status: Experimental
- Category: Normative semantic

## Event meaning

A FACoP event records a semantic fact or transition about a contribution. Event names MUST identify the protocol domain and semantic occurrence; payloads MUST identify contribution, revision and evidence references.

Events are compatible with CloudEvents and MAY be projected to CDEvents, but projection MUST preserve identity, causality and timestamps.

## Invariants

- Events MUST NOT claim a transition without its authorizing evidence.
- Event IDs MUST be unique and stable.
- Retries MUST be idempotent.
- A projected event MUST preserve the source event identity and digest.

## Proof obligation

Consumers MUST be able to reconstruct causal order and correlate every acceptance-relevant event to a contribution.
