# RFC-0001 — Semantic RFC Conventions

- Status: Experimental
- Category: Normative semantic
- Applies to: FACoP v0.2

## Purpose

Define how semantic RFCs are written, versioned and interpreted.

## Rules

1. Every RFC has a stable identifier and title.
2. Normative terms use MUST, MUST NOT, SHOULD, SHOULD NOT and MAY.
3. Definitions precede rules that depend on them.
4. A semantic RFC MUST identify affected schemas, events and proof obligations.
5. A later RFC MAY refine an earlier one, but MUST state compatibility impact.
6. Ambiguous prose MUST NOT override an executable schema or proof invariant.

## Required sections

Status, scope, definitions, relations, invariants, forbidden interpretations, examples, proof obligations and compatibility impact.

## Proof obligation

A validator MUST be able to determine whether each machine-checkable invariant is satisfied from repository artifacts and declared digests.
