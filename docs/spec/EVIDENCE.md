# Evidence, EvidenceKey and Evidence Passport v0.2

## Evidence

Evidence is a reproducible claim about an exact subject. Example predicates:

- `vrd.problem.proven`
- `vrd.solution.proven`
- `unit.tests.pass`
- `integration.contracts.pass`
- `security.sast.no-high-findings`
- `benchmark.p95_ns`
- `load.sustainable_ops_per_sec`
- `stress.breaking_point_ops_per_sec`
- `chaos.degradation_under_dependency_failure`

## VRD problem and solution evidence

For Validated Reason Development, FACoP distinguishes two proofs.

### ProblemProof

Binds:

- contribution ID;
- canonical base revision;
- claim semantic ID;
- reproduction digest;
- expected failure identity;
- observed result/output digest;
- execution environment.

It proves only that the contributed executable claim reproduces against the declared base.

### SolutionProof

Binds:

- the current ProblemProof/reproduction digest;
- upstream-generated candidate revision;
- candidate execution result/output digest;
- equality of control/treatment reproduction digests.

It proves only that the upstream-generated candidate resolves the contributed executable claim. Final acceptance still depends on independent upstream evidence closure.

## EvidenceKey

The default v0.2 key is conceptually:

```text
BLAKE3(
  canonical(subject_sources)
  || canonical_base_revision
  || generated_candidate_revision_when_applicable
  || reproduction_digest_when_applicable
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

Changing a contributor reproduction invalidates all ProblemProof/SolutionProof evidence derived from its previous digest. Changing only the generated candidate invalidates SolutionProof and candidate-dependent evidence but MAY preserve a still-current ProblemProof.

## Reuse

Existing Evidence MAY be reused when:

- key matches exactly;
- evidence has not expired;
- evidence has not been revoked;
- project policy still accepts its producer/trust class;
- no higher-level dependency closure invalidates the claim.

The EvidenceKey establishes only that no semantically relevant input changed. It does not establish that the original execution was honest. Producer/trust class therefore MUST be established cryptographically, not by assertion: reusable Evidence MUST arrive inside a signed attestation envelope whose key is trusted for the consuming profile, and the verifier MUST fail closed on an unknown, revoked, expired, wrong-profile or wrong-revision key. See [`docs/security-model.md` §3](../security-model.md).

A SolutionProof for generated candidate A MUST NOT be reused to qualify candidate B merely because the reproduction digest is unchanged.

## Not applicable

Every registered validation category has one of `pass`, `fail`, `not-applicable`, `missing`, `expired`, `revoked`.

`ProblemProof` and `SolutionProof` are not `not-applicable` for a VRD behavior-changing contribution. Characterization categories MAY be `not-applicable` only with an explicit reason code.

## Evidence Passport

A VRD release/candidate Evidence Passport MAY contain:

- artifact/generated-candidate digest;
- canonical base revision;
- reproduction digest;
- ProblemProof;
- SolutionProof;
- environment classes;
- correctness evidence;
- security evidence;
- benchmark distributions;
- sustainable load envelope;
- stress/failure threshold;
- chaos/fault-degradation observations;
- resource consumption;
- prompt/generation provenance references;
- attestation references.

A performance number without its environment class is non-conformant. A VRD qualification without ProblemProof/SolutionProof bound to the exact candidate is non-conformant.
