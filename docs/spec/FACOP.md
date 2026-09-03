# FACoP — Full Agentic Collaboration Protocol v0.1.0

## Status

Experimental reference specification.

Normative terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT** and **MAY** are interpreted in the RFC 2119 sense.

## 1. Scope

FACoP specifies how a software contribution is described, reproduced, generated, validated, characterized, attested, reviewed and accepted when humans and/or software agents participate in its production.

FACoP is forge-independent. GitHub, GitLab, Forgejo, Gitea and local Git are adapters.

FACoP does not replace SLSA, in-toto, CDEvents, CloudEvents, SARIF, SPDX/CycloneDX or OpenTelemetry. Implementations SHOULD compose with these standards.

## 2. Core entities

### Contribution

A stable identity joining the issue/problem, exact source revision, attempts, patch, evidence graph, validation state, reviews and final decision.

### Actor

A human, agent, model-backed agent, CI worker, reviewer or automated policy executor. Every material action MUST identify its actor class.

### Attempt

One bounded attempt to solve or advance a Contribution. An Attempt MAY contain one or more prompts/tool calls and MUST declare its result: `accepted`, `rejected`, `superseded` or `inconclusive`.

### PromptRecord

An append-only provenance record for an instruction given to a model/agent. Sensitive values MUST be redacted before persistence; hashes SHOULD preserve linkage to redacted source material.

### Evidence

A statement produced by executing or verifying a requirement. Evidence MUST identify subject, predicate, result, inputs, environment class and `EvidenceKey`.

### EvidencePassport

Portable technical characterization attached to an artifact/release, including correctness, security, performance, resource and resilience evidence.

### Review

A human or automated assessment tied to an exact contribution revision.

### Decision

The authoritative project result: `accepted`, `rejected`, `changes-requested`, `superseded` or `withdrawn`.

## 3. Required lifecycle

A conforming contribution MUST expose the following logical transitions, though an implementation MAY collapse adjacent transitions:

1. `IssueCreated`
2. `ContributionClaimed`
3. `WorkspacePrepared`
4. `ProblemReproduced`
5. `SolutionSpecified`
6. `AttemptRecorded`
7. `PatchProduced`
8. `ContributorCharacterized`
9. `ContributorValidated`
10. `UpstreamValidated`
11. `EvidenceQualified`
12. `ProposalOpened`
13. `ReviewObserved`
14. `ChangesApplied` (zero or more)
15. `DecisionRecorded`

## 4. Proof-of-Fix

When a contribution claims to fix a defect, it SHOULD provide a reproduction test or executable reproduction artifact satisfying:

- upstream/base revision + reproduction => FAIL;
- candidate revision + the same reproduction => PASS.

The project MAY additionally require mutation testing or an independently-authored upstream test to establish that the reproduction discriminates incorrect patches.

## 5. Independent validation

Contributor-generated tests MUST NOT be the sole acceptance evidence for a non-trivial contribution. The upstream project MUST control at least one acceptance-validation profile covering affected contracts, integration boundaries, security requirements or hidden/independent tests.

## 6. Execution profiles

FACoP defines semantic profiles, not branch names:

- `local`: contributor-owned characterization and fast correctness feedback.
- `dev`: contributor repository CI over changed/affected units.
- `stage`: upstream-compatible unit, integration, E2E and security gates.
- `qualification`: prove completeness and freshness of all required evidence; rerun only invalidated evidence.
- `upstream`: open/refresh the canonical proposal and observe review events.

Every profile transition MUST preserve or explicitly replace the `subject_revision` identity.

## 7. Content-Addressed Evidence

A conforming implementation MUST compute an `EvidenceKey` from all semantically relevant inputs. At minimum:

`hash(subject + test/spec + dependency-lock + toolchain + flags + runtime + config + contracts + schemas + workflow + environment-class)`

Evidence MAY be reused only when the new key is identical and policy has not expired or revoked it.

## 8. Change impact

Qualification SHOULD operate over a dependency/evidence graph:

`ChangedArtifact → AffectedSubjects → InvalidatedEvidence → RequiredExecutions`

A project MAY reuse valid evidence for unaffected nodes. Integration/E2E evidence MUST be invalidated when any member of its declared dependency closure changes.

## 9. Technical characterization

Benchmark, load, stress and chaos are first-class characterization categories. They MAY be acceptance gates, but FACoP does not require every category to block merge. A category MAY be `not-applicable`, but the reason MUST be explicit and machine-readable.

## 10. Trust boundary

Untrusted contributor code and trusted upstream credentials MUST execute in separate trust domains. A fork workflow MUST NOT receive credentials that can mutate the upstream merely because it can execute contributed code.

## 11. Event interoperability

Implementations SHOULD publish lifecycle events using CDEvents/CloudEvents-compatible envelopes. FACoP adds contribution-specific semantic subjects such as `contribution`, `attempt`, `evidence`, `qualification`, `review-observation` and `decision`.

## 12. Supply-chain composition

- SLSA/in-toto: build/process provenance and attestations.
- CDEvents/CloudEvents: interoperable event transport/vocabulary.
- SARIF: static/security analysis result interchange.
- CycloneDX/SPDX: software/component bill of materials.
- OpenTelemetry: runtime telemetry and traces.
- FACoP: semantic lifecycle from contribution intent through verified acceptance.

## 13. Minimum conformance

A FACoP Core implementation MUST support Contribution, Attempt, Evidence, Review and Decision identities; Proof-of-Fix when applicable; profile-aware validation; upstream-independent validation; and immutable association between evidence and exact source revision.

A FACoP Evidence implementation additionally MUST implement EvidenceKey reuse/invalidation and EvidencePassport generation.

A FACoP Agentic implementation additionally MUST record agent/model/tool provenance without requiring disclosure of hidden chain-of-thought.
