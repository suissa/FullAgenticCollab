# Validated Reason Development (VRD)

Status: **normative for FACoP v0.2 problem contributions**.

## 1. Definition

Validated Reason Development is a collaboration model in which the submitted unit of value is a **falsifiable reason for change**, not a production patch.

A Validated Reason consists of:

- a Claim;
- a canonical base identity;
- an executable ReproductionArtifact;
- an ExpectedFailure identity;
- safe Prompt/Context provenance;
- upstream-observed evidence that the reproduction actually demonstrates the claim.

The phrase "reason" refers to externally shareable engineering rationale and provenance. It MUST NOT require private model chain-of-thought or hidden scratchpads.

## 2. Authority hierarchy

For a problem contribution, authority is ordered as follows:

1. **Executable reproduction** — normative authority for whether the stated problem is demonstrated.
2. **Expected failure identity** — classifies what the reproduction is expected to prove.
3. **Claim/specification** — gives semantic meaning to the observed failure.
4. **Prompt/context provenance** — records how the contributor formulated the problem and gives the upstream generator useful context.
5. **Contributor implementation code** — no acceptance authority; it is not part of the VRD contribution contract.

A persuasive prompt with no reproduction is not a proven problem. A reproduction that fails for an unrelated reason is not a proven claim. A contributor patch that passes the reproduction is not the upstream solution.

## 3. Core responsibilities

### Contributor responsibility

The contributor MUST prove that there is something concrete to solve.

For a defect:

`CanonicalBase + ContributorReproduction => FAIL(claimed failure)`

For a missing behavior/feature, the same structure applies: the executable expectation MUST demonstrate that the declared base lacks the requested behavior according to the project-approved oracle.

### Upstream responsibility

The upstream MUST independently produce and qualify the solution.

`CanonicalBase + UpstreamCandidate + SAME ContributorReproduction => PASS`

The upstream remains responsible for regression, integration, security, performance and other project policy. Passing the contributor test alone never grants final acceptance.

## 4. Formal model

Let:

- `B` be the exact canonical base revision;
- `R` be the contributor reproduction bytes;
- `h(R)` be their cryptographic digest;
- `P` be the expected failure identity;
- `Cᵤ` be an upstream-generated candidate.

### Problem proof

`ProblemProven(B,R,P) := Execute(B ⊕ R) = Fail(P)`

### Solution proof

`SolutionProven(B,Cᵤ,R,P) := ProblemProven(B,R,P) ∧ Execute(B ⊕ Cᵤ ⊕ R) = Pass ∧ h(R_control) = h(R_treatment)`

A project MAY strengthen the predicate with mutation testing, invariant checks, differential execution, hidden tests or formal properties.

## 5. Why the same test must be immutable

If the test changes after candidate generation, the experiment no longer has one independent variable.

FACoP models:

```text
Control   = B + R
Treatment = B + Cᵤ + R
Variable  = Cᵤ
Constant  = R
```

Therefore:

`h(R_control) MUST equal h(R_treatment)`

Any reproduction edit after ProblemProof invalidates both problem and solution evidence.

## 6. Test injection

The ReproductionArtifact does not need to exist in the canonical base tree. The `tests` profile MAY inject it into a temporary worktree/container at the manifest-declared path.

Reference algorithm:

1. resolve canonical base revision `B`;
2. resolve generated candidate revision `Cᵤ`;
3. read contributor reproduction once and compute `h(R)`;
4. create an isolated base worktree;
5. inject `R` and execute the declared reproduction command;
6. require failure matching `P`;
7. create an isolated candidate worktree;
8. inject the same bytes `R`;
9. require PASS;
10. assert both injected digests equal `h(R)`;
11. emit ProblemProof and SolutionProof evidence.

No upstream test rewrite is required to understand what the contributor meant. The contributor's executable claim is evaluated directly.

## 7. Code-free contribution package

The reference package is:

```text
contribution/
├── contribution.json
├── <reproduction source>
├── <prompt provenance>
└── context/* (optional)
```

The contributor-plane diff MUST be limited to this package under the reference policy. Production source, patches, diffs and candidate implementations are rejected by the contribution guard.

The manifest declares at least:

- contribution/issue identity;
- canonical base revision;
- semantic claim identity and statement;
- reproduction source;
- injection target;
- execution command;
- expected failure exit/result identity;
- prompt path;
- safe context references.

## 8. Independent regeneration

The upstream generator receives:

- Issue/Claim;
- verified ProblemProof;
- reproduction bytes/digest;
- repository architecture/contracts/source as controlled upstream context;
- safe prompt/context provenance supplied by the contributor;
- upstream generation policies.

It MUST NOT require contributor production code.

Multiple independent candidates MAY be generated. A candidate is a disposable hypothesis until it satisfies the contributor reproduction and independent upstream evidence.

## 9. Security model

The contributor reproduction is executable, therefore untrusted.

A conforming implementation MUST ensure that reproduction execution cannot obtain:

- upstream mutation credentials;
- merge authority;
- attestation private keys for a stronger trust plane;
- generation/provider secrets not required by the test;
- unrelated repository secrets.

The reference runner strips credential-shaped environment variables before invoking the reproduction command. Hardened adapters SHOULD additionally use network isolation, filesystem constraints, process/resource limits and disposable containers/VMs.

Prompt/context artifacts are untrusted data and remain subject to the FACoP secret scan and prompt-injection-aware generation controls.

## 10. Promotion to regression evidence

Before acceptance:

`ContributorReproductionTest = untrusted contribution evidence`

After independent problem reproduction and accepted solution qualification:

`VerifiedReproductionTest MAY become CanonicalRegressionTest`

The project MAY copy the exact bytes into an upstream-owned test location and preserve the original contribution/test digest as provenance.

## 11. Invalid proofs

A contribution MUST NOT reach `ProblemProven` when:

- the reproduction passes on `B`;
- it fails only because dependencies/environment are broken rather than because `P` occurred;
- the declared failure identity does not match the observed one;
- the reproduction cannot execute in the declared environment;
- the base identity is ambiguous or cannot be resolved.

A contribution MUST NOT reach `SolutionProven` when:

- candidate execution still fails;
- the test was modified between control and treatment;
- the accepted candidate came from contributor production code rather than upstream regeneration under a policy requiring VRD;
- the candidate changes/hacks the reproduction instead of satisfying it;
- required independent upstream evidence is missing.

## 12. Relationship to tests as specification

VRD deliberately treats executable tests as a practical specification boundary, but it does not claim one test completely specifies the program. Program-repair literature has repeatedly shown that weak tests can permit overfitting patches.

FACoP therefore separates:

`Claim authority` — the contributor reproduction proves the specific contributed problem;

from:

`Acceptance authority` — the complete upstream evidence graph decides whether the generated candidate is acceptable.

This distinction is essential: **the contributor decides what problem they can prove; the upstream remains responsible for what solution it accepts.**
