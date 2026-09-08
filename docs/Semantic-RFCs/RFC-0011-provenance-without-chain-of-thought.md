# RFC-0011 — Provenance Without Chain-of-Thought

- Status: Experimental
- Category: Normative semantic

## Purpose

FACoP requires reproducible formulation context, not disclosure of private hidden reasoning.

## Permitted provenance

Provenance MAY include prompt or request text supplied for contribution, repository revision, selected files, tools or commands used, model and version, timestamps, policy versions, input and output digests, and human decisions.

It MUST NOT require hidden chain-of-thought, private scratchpad or confidential internal reasoning.

## Invariants

- Provenance MUST be sufficient to reproduce the declared artifact.
- Secrets and personal data MUST be filtered according to policy.
- Redaction MUST be recorded without pretending the original is public.
- Provenance MUST be append-only or content-addressed.

## Proof obligation

An independent reviewer MUST be able to understand how an artifact was produced without receiving private chain-of-thought.
