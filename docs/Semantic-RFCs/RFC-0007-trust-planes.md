# RFC-0007 — Contributor Plane and Upstream Plane

- Status: Experimental
- Category: Normative semantic

## Definitions

The Contributor Plane is untrusted input and evidence generation. The Upstream Plane is the trusted acceptance and generation environment.

## Boundary

Contributor artifacts MAY include claims, reproductions, provenance and evidence. They MUST NOT receive upstream mutation credentials or secret-bearing environment variables.

The Upstream Plane independently regenerates candidates and controls acceptance.

## Invariants

- Trust MUST NOT be inferred from authorship.
- Contributor production code MUST NOT become acceptance code solely by submission.
- Secret access MUST be denied by default in contributor execution.
- Promotion requires independent verification.

## Proof obligation

The adapter MUST demonstrate credential separation, artifact provenance and isolated execution for untrusted reproduction input.
