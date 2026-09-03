# Evidence, EvidenceKey and Evidence Passport

## Evidence

Evidence is a reproducible claim about an exact subject. Example predicates:

- `unit.tests.pass`
- `integration.contracts.pass`
- `security.sast.no-high-findings`
- `benchmark.p95_ns`
- `load.sustainable_ops_per_sec`
- `stress.breaking_point_ops_per_sec`
- `chaos.degradation_under_dependency_failure`

## EvidenceKey

The default v0.1 key is conceptually:

```text
BLAKE3(
  canonical(subject_sources)
  || canonical(test_or_spec)
  || dependency_lock
  || toolchain_identity
  || compiler_flags
  || runtime_identity
  || canonical(config)
  || canonical(contracts)
  || canonical(schemas)
  || workflow_identity
  || environment_class
)
```

Implementations MAY use SHA-256 when BLAKE3 is unavailable. The algorithm MUST be recorded.

## Reuse

Existing Evidence MAY be reused when:

- key matches exactly;
- evidence has not expired;
- evidence has not been revoked;
- project policy still accepts its producer/trust class;
- no higher-level dependency closure invalidates the claim.

## Not applicable

Every registered validation category has one of `pass`, `fail`, `not-applicable`, `missing`, `expired`, `revoked`.

`not-applicable` MUST include a reason code. Example: `pure-deterministic-no-external-failure-surface` for infrastructure chaos against a pure function.

## Evidence Passport

A release MAY publish an Evidence Passport containing:

- artifact digest;
- source revision;
- environment classes;
- correctness evidence;
- security evidence;
- benchmark distributions;
- sustainable load envelope;
- stress/failure threshold;
- chaos/fault-degradation observations;
- resource consumption;
- provenance/attestation references.

A performance number without its environment class is non-conformant.
