# FACoP → AllasCode Integration Contract

FullAgenticCollab is designed so its reference conventions can be adopted directly by AllasCode without making GitHub part of the architecture.

## Atomic Action as evidence subject

The canonical unit is an AllasCode action:

```text
actions/<Entity>/<action>/
├── README.md
├── manifest.yml
├── config.yml
├── schema.yml
├── events.yml
├── implementation.<ext>
└── implementation.test.<ext>
```

`canonical_label = <Entity>.<action>` is the Evidence subject identity. A future AllasCode compiler SHOULD discover these folders and generate the semantic dependency/evidence graph from their manifests, schemas and configuration.

## File responsibilities

- `README.md`: human explanation, current scenario, examples and behavioral intent.
- `manifest.yml`: outward identity, dependencies and exposed events/capabilities.
- `config.yml`: inward execution/validation configuration.
- `schema.yml`: typed input/output contract.
- `events.yml`: success/error event contract.
- `implementation.*`: replaceable executable projection.
- `implementation.test.*`: contributor-visible unit evidence.

System-owned integration/E2E/security evidence lives outside the action folder so an action cannot silently redefine its own acceptance boundary.

## Everything as Code consequence

Because code, schemas, configs, workflows, policies and dependencies are explicit artifacts, AllasCode can calculate:

`Changed Artifact → Semantic Closure → Invalidated Evidence → Required Executions`.

The EvidenceKey MUST include every artifact capable of changing the meaning or execution environment of an Evidence predicate. The reference implementation includes action files, domain/runtime inputs, validation policy, characterizer, workflow and environment class.

## Compiler target

AllasCode SHOULD eventually compile a project-level declaration into:

- forge adapters (GitHub/GitLab/Forgejo);
- local/dev/stage/qualification pipelines;
- changed-action selectors;
- EvidenceKey calculators;
- Evidence Passport producers;
- SLSA/in-toto attestation hooks;
- CDEvents/CloudEvents lifecycle emitters;
- SARIF security result adapters;
- CycloneDX/SPDX BOM generation;
- review-observer adapters.

The generated pipeline becomes replaceable infrastructure. The semantic protocol remains stable.

## Action validation policy

Every action exposes all validation categories. Categories do not silently disappear. Example:

```yaml
validation:
  unit: required
  benchmark: characterize
  load: characterize
  stress: characterize
  chaos: characterize
```

A runtime result may still be `not-applicable`, but it MUST carry a reason. This distinction allows AllasCode to keep universal observability of validation while avoiding meaningless failure-injection requirements against pure deterministic functions.

## Version 1.0 implication

An immutable AllasCode release does not need to recompute unchanged evidence merely because another contribution exists. Evidence is reusable only if its complete EvidenceKey remains identical and policy has not expired or revoked it. A dependency, compiler, workflow, schema or configuration change can invalidate evidence even when the implementation file itself is unchanged.
