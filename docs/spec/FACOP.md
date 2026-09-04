# FACoP — Full Agentic Collaboration Protocol v0.2.0

## Status

Experimental reference specification.

Normative terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT** and **MAY** are interpreted in the RFC 2119 sense.

## 1. Scope

FACoP specifies how a software problem/change request is claimed, reproduced, reasoned about, independently generated, validated, characterized, attested, reviewed and accepted when humans and/or software agents participate.

FACoP is forge-independent. GitHub, GitLab, Forgejo, Gitea and local Git are adapters.

FACoP does not replace SLSA, in-toto, CDEvents, CloudEvents, SARIF, SPDX/CycloneDX or OpenTelemetry. Implementations SHOULD compose with these standards.

FACoP v0.2 adopts **Validated Reason Development (VRD)** for problem contributions. A contributor contributes a falsifiable reason for change, not production code for direct acceptance.

## 2. Core axiom

> **The contributor proves the problem. The upstream proves the solution.**

For a defect or missing-behavior contribution, the upstream MUST NOT require trust in contributor-produced production code. The normative contributor artifact is an executable reproduction plus its claim and safe provenance.

## 3. Core entities

### Contribution

A stable identity joining a claim, exact canonical base, executable reproduction, expected failure identity, reason provenance, evidence graph, independently generated upstream candidate, validation state, reviews and final decision.

A Contribution MUST NOT use a contributor production patch as authoritative acceptance input.

### Claim

The externally stated problem or missing behavior. A Claim MUST identify the semantic subject and expected/violated property sufficiently for the reproduction result to be classified.

### ReproductionArtifact

Contributor-authored executable evidence that is injected by the project into a controlled test environment. It MUST have a content digest and MUST declare the failure identity expected on the canonical base.

### ValidatedReason

The combination of a Claim, a reproduction that proves the Claim on the declared base, and externally shareable prompt/context provenance that explains how the problem was formulated.

`ValidatedReason` does **not** mean hidden chain-of-thought. FACoP records observable prompts, context references, requirements and execution evidence only.

### GenerationRecipe

A safe prompt/context package usable by an upstream-controlled generator. It MAY derive from contributor provenance, but MUST NOT contain or depend upon contributor production patch bytes.

### GeneratedCandidate

A candidate solution produced under upstream control after the problem has been reproduced. Its identity MUST include the exact generated revision/artifact digest and generator provenance.

### Actor

A human, agent, model-backed agent, CI worker, reviewer or automated policy executor. Every material action MUST identify its actor class and trust plane.

### Attempt

One bounded attempt to reproduce, generate, validate or advance a Contribution. An Attempt MAY contain prompts/tool calls and MUST declare its result: `accepted`, `rejected`, `superseded` or `inconclusive`.

### PromptRecord

An append-only provenance record for an instruction given to a model/agent. Sensitive values MUST be redacted before persistence; hashes SHOULD preserve linkage to redacted source material.

### Evidence

A statement produced by executing or verifying a requirement. Evidence MUST identify subject, predicate, result, inputs, environment class and `EvidenceKey`.

### ProblemProof

Evidence establishing that the unchanged contributor reproduction fails on the declared canonical base with the claimed failure identity.

### SolutionProof

Evidence establishing that the same reproduction bytes pass against the upstream-generated candidate while its control execution still proves the claimed base failure.

### EvidencePassport

Portable technical characterization attached to an artifact/release, including correctness, security, performance, resource, resilience, ProblemProof and SolutionProof evidence when applicable.

### Review

A human or automated assessment tied to an exact contribution and generated-candidate revision.

### Decision

The authoritative project result: `accepted`, `rejected`, `changes-requested`, `superseded` or `withdrawn`.

## 4. No-code contributor rule

For VRD problem contributions:

1. the contributor MUST provide the Claim and ReproductionArtifact;
2. the contributor SHOULD provide safe prompt/context provenance;
3. the contributor MUST NOT require the upstream to execute, trust or merge contributor-produced production code;
4. a forge adapter SHOULD mechanically reject production-source changes on the contributor contribution branch;
5. a contributor patch MAY be discussed outside the authoritative contribution path, but it MUST NOT be used as the accepted candidate or as proof that the upstream candidate is correct.

The code implementing the accepted change is produced by the upstream generation/maintainer plane.

## 5. Required lifecycle

A conforming VRD contribution MUST expose the following logical transitions, though an implementation MAY collapse adjacent transitions:

1. `IssueCreated`
2. `ContributionClaimed`
3. `ReproductionSubmitted`
4. `ProblemProven`
5. `ReasonValidated`
6. `IndependentRegenerationStarted`
7. `CandidateGenerated`
8. `SolutionProven`
9. `CandidateCharacterized`
10. `UpstreamValidated`
11. `EvidenceAttested`
12. `EvidenceQualified`
13. `ProposalOpened`
14. `ReviewObserved`
15. `ChangesApplied` (zero or more; returns to candidate generation/validation as required)
16. `DecisionRecorded`

## 6. Executable proof of the problem

Let:

- `B` = exact canonical base revision;
- `R` = contributor reproduction bytes;
- `P` = claimed failure identity.

A ProblemProof is valid only when:

`Execute(B + R) = FAIL(P)`

The test merely returning a non-zero exit code is insufficient when policy requires a specific failure identity. The observed failure MUST match the claim by the mechanism declared in the contribution contract (semantic result, assertion identity, error code/pattern, invariant violation or another project-approved oracle).

If `R(B)` passes or fails for a different classified reason, the contribution is not `ProblemProven`.

## 7. Independent proof of the solution

Let `Cᵤ` be a candidate generated by the upstream plane.

A SolutionProof requires:

`Execute(B + R) = FAIL(P)`

and:

`Execute(B + Cᵤ + R) = PASS`

and:

`hash(R_control) = hash(R_treatment)`

The upstream MUST NOT rewrite the contributor reproduction after observing the candidate and then claim the rewritten test proves the original contribution. Changing `R` invalidates both ProblemProof and SolutionProof and restarts reproduction validation.

Passing `R` is necessary but not sufficient for final acceptance. Upstream-owned regression, integration, security and other policy evidence remain independent acceptance inputs.

## 8. Independent generation

The upstream generation plane MAY use the Issue, Claim, validated reproduction, repository state, architecture/contracts and safe prompt/context provenance.

It MUST NOT treat contributor implementation code as the candidate source of truth. A conforming adapter SHOULD make contributor production code unavailable to the generator or explicitly label it non-authoritative and exclude it from generation input.

Multiple upstream candidates MAY be generated and characterized. FACoP does not require the first candidate that passes the reproduction to be accepted.

## 9. Execution profiles

FACoP defines semantic profiles, not branch names:

- `local`: contributor-owned feedback for claim/reproduction/provenance construction.
- `dev`: contributor CI validates the code-free contribution package and portable evidence; no upstream mutation credentials.
- `stage`: upstream-controlled generation/integration plus unit, integration, E2E and security gates for a generated candidate.
- `tests`: causal control/treatment execution of the unchanged reproduction against canonical base and generated candidate.
- `qualification`: prove completeness and freshness of all required evidence; rerun only invalidated evidence.
- `upstream`: open/refresh the canonical generated-solution proposal and observe review events.

Every profile transition MUST preserve or explicitly replace the contribution, base, reproduction and candidate identities.

## 10. Content-Addressed Evidence

A conforming implementation MUST compute an `EvidenceKey` from all semantically relevant inputs. At minimum:

`hash(subject + base + candidate + reproduction + test/spec + dependency-lock + toolchain + flags + runtime + config + contracts + schemas + workflow + environment-class)`

Evidence MAY be reused only when the new key is identical and policy has not expired or revoked it. Reused evidence MUST satisfy the attestation/trust rules of the consuming plane.

## 11. Change impact

Qualification SHOULD operate over a dependency/evidence graph:

`ChangedArtifact → AffectedSubjects → InvalidatedEvidence → RequiredExecutions`

Any change to the reproduction invalidates ProblemProof and SolutionProof. Any generated-candidate change invalidates SolutionProof and all candidate-dependent evidence but does not necessarily invalidate a still-current ProblemProof.

## 12. Technical characterization

Benchmark, load, stress and chaos are first-class characterization categories. They MAY be acceptance gates, but FACoP does not require every category to block merge. A category MAY be `not-applicable`, but the reason MUST be explicit and machine-readable.

## 13. Trust boundary

Contributor reproduction tests are untrusted executable code. They MUST execute separately from upstream mutation credentials and secret-bearing generation/merge authority.

Evidence and immutable test bytes cross trust-plane boundaries; contributor execution authority does not.

The upstream generator and final acceptance plane MUST remain independently controlled from the contributor plane.

## 14. Regression promotion

After an upstream-generated candidate is accepted, the project MAY promote the exact verified ReproductionArtifact to an upstream-owned canonical regression test. Promotion changes ownership/authority, not necessarily test bytes.

## 15. Event interoperability

Implementations SHOULD publish lifecycle events using CDEvents/CloudEvents-compatible envelopes. FACoP adds semantic subjects such as `claim`, `reproduction`, `validated-reason`, `generated-candidate`, `problem-proof`, `solution-proof`, `qualification`, `review-observation` and `decision`.

## 16. Supply-chain composition

- SLSA/in-toto: build/process provenance and attestations.
- CDEvents/CloudEvents: interoperable event transport/vocabulary.
- SARIF: static/security analysis result interchange.
- CycloneDX/SPDX: software/component bill of materials.
- OpenTelemetry: runtime telemetry and traces.
- FACoP: semantic lifecycle from falsifiable contribution reason through independently generated and verified acceptance.

## 17. Minimum conformance

A FACoP Core implementation MUST support Contribution, Claim, ReproductionArtifact, Evidence, Review and Decision identities; ProblemProof and SolutionProof for behavior-changing contributions; code-free contributor authority; profile-aware validation; independent upstream generation/validation; and immutable association between evidence and exact base/candidate/reproduction identities.

A FACoP Evidence implementation additionally MUST implement EvidenceKey reuse/invalidation and EvidencePassport generation.

A FACoP Agentic implementation additionally MUST record agent/model/tool provenance without requiring disclosure of hidden chain-of-thought.

See `VALIDATED-REASON-DEVELOPMENT.md` for the normative VRD elaboration.
