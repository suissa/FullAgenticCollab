# FullAgenticCollab

FullAgenticCollab is an open initiative for reproducible, evidence-driven collaboration among humans, AI agents and open-source projects.

The normative specification is **FACoP — Full Agentic Collaboration Protocol**.

FACoP treats a contribution as more than a diff:

`Contribution = Intent + Reproduction + Specification + Attempts + Patch + Evidence + Validation + Review + Decision`

## Why

Agentic software development introduces actors, artifacts and failure modes that conventional issue → code → pull-request workflows do not model explicitly. FACoP adds machine-readable contribution provenance, proof-of-fix, technical characterization, content-addressed evidence, independent upstream validation and continuous review observation.

## Lifecycle

`Issue → Claim → Fork → Reproduce → Specify → Prompt → Implement → Characterize → Validate → Attest → Qualify → Propose → Review → Observe → Repair → Accept`

## Repository map

- `docs/spec/` — normative FACoP specification.
- `docs/research/` — scientific proposal and bibliography.
- `docs/prompts/` — append-only prompt/attempt provenance per issue.
- `schemas/` — machine-readable FACoP contracts.
- `config/` — Everything-as-Code validation policies.
- `examples/ecommerce/` — executable reference domain.
- `tests/` — upstream-controlled acceptance and characterization suites.
- `.github/workflows/` — GitHub adapter for FACoP execution profiles.

## Execution profiles

FACoP models `local`, `dev`, `stage`, `qualification` and `upstream` as execution profiles over the **same contribution commit/artifact identity**. A platform adapter may materialize them as branches, but branch naming is not part of FACoP semantics.

## Evidence rule

An expensive test is not rerun merely because a pipeline started. It is rerun when its `EvidenceKey` changes. The key covers the source, tests, dependency lock, compiler/runtime, flags, configuration, contracts, schemas, workflow and relevant environment class.

Qualification therefore means **prove that valid evidence exists for every required property**, not blindly execute every historical test.

## Reference example

The e-commerce example contains six entities: Users, Consumers, Products, Stock, Payment and Delivery. Each behavior follows the AllasCode-style independent action structure:

- `README.md`
- `manifest.yml`
- `config.yml`
- `schema.yml`
- `events.yml`
- `implementation.ts`
- `implementation.test.ts`

## Status

Experimental specification, v0.1.0. The repository bootstraps itself through Issue #1.
