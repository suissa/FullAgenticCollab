# RFC-0003 — Contribution, Claim and Reason Identity

- Status: Experimental
- Category: Normative semantic

## Definitions

**Contribution** is the versioned package submitted for evaluation. **Claim** is its falsifiable assertion. **Reason** is the human- or agent-produced explanation of why change is warranted. A Reason is not itself proof.

## Identity

A canonical contribution identity MUST be derived from repository, base revision, claim, reproduction digest and declared scope. A Claim MUST remain stable while its proof is evaluated; revisions create a new contribution version.

## Invariants

- The base revision MUST be explicit.
- The claim MUST be falsifiable.
- The reason MUST NOT substitute for executable reproduction.
- A reproduction change MUST change the contribution identity.
- Two contributions with different reproduction digests MUST NOT be treated as identical.

## Example

`C = H(repository || base || claim || reproduction_digest || scope)`

The concrete hash algorithm follows FACoP configuration.

## Proof obligation

The system MUST reject a proof whose artifact identity does not match the contribution identity under evaluation.
