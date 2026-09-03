# FullAgenticCollab: An Evidence-Addressed Protocol for Human–Agent Open-Source Collaboration

**Version:** preprint draft 0.1 — September 2026  
**Protocol:** FACoP — Full Agentic Collaboration Protocol

## Abstract

Autonomous coding agents increasingly participate in repository-level software engineering and submit pull requests to real-world open-source projects. Existing collaboration infrastructure preserves issues, commits, checks, reviews and pull requests, while software-supply-chain standards preserve artifact and build provenance. These mechanisms do not, however, provide a unified semantic lifecycle connecting the original problem, executable reproduction, agent/model attempts, generated patches, independent acceptance evidence, technical characterization, review feedback and final project decision. This paper proposes **FullAgenticCollab** and its normative **Full Agentic Collaboration Protocol (FACoP)**. FACoP models a contribution as an evidence-backed graph rather than only a diff. It introduces five execution profiles (`local`, `dev`, `stage`, `qualification`, `upstream`), Proof-of-Fix, separation between contributor-generated evidence and upstream-controlled acceptance validation, Content-Addressed Evidence for selective recomputation, an Evidence Passport for portable technical characterization, and observable agent provenance that explicitly excludes private chain-of-thought. The proposal composes with SLSA/in-toto, CDEvents/CloudEvents, SARIF and software bill-of-material standards instead of replacing them. We present a reference e-commerce implementation and formulate empirical hypotheses for evaluating whether evidence-addressed collaboration reduces integration cost, stale validation and unverifiable agentic changes.

**Keywords:** coding agents; open source; software engineering agents; continuous integration; provenance; testing; software supply chain; evidence; pull requests; human-AI collaboration.

## 1. Introduction

Coding agents have moved from isolated code completion toward repository-level action: locating files, editing implementations, executing tools and proposing pull requests. Ogenrwot and Businge analyzed 24,014 merged agentic pull requests containing 440,295 commits, providing large-scale evidence that agents already act as open-source contributors [1]. Twist and Zhang independently studied 26,760 agent-authored PRs and showed that agents interact with real dependency ecosystems rather than only toy programs [2]. The governance problem is therefore no longer hypothetical.

Traditional contribution workflows generally encode an Issue, a branch or patch, tests, CI checks, review and merge decision. These artifacts are necessary but insufficient for agent-mediated development because several causal steps may be lost: how the problem was reproduced, which agent/model attempts failed, which exact context produced a patch, whether tests were authored by the same agent whose patch they validate, what independent evidence the upstream owns, and whether expensive performance/resilience evidence remains valid after later changes.

Recent empirical research motivates these concerns. Xiang et al. found issue reproduction critical in repository-level Rust issue resolution; their RustForger design increased reproduction success by constructing isolated test environments and tracing behavior [3]. Chen et al. found that simply increasing the amount of agent-generated tests did not significantly improve final issue-resolution outcomes and could raise interaction cost [4]. Nachuma and Zibran found reviewer engagement strongly associated with successful integration of agent-authored PRs, suggesting that actionable review loops, not autonomous patch production alone, determine integration success [5]. Russo further argues from large-scale evidence that repository-level integration friction is an ecosystem property rather than solely an agent property [6]. Together, these results motivate a protocol that records contribution intent and agent attempts while reserving authoritative integration validation for the project.

## 2. Problem Statement

We define an **agentic contribution gap**: the absence of a portable, forge-independent model connecting (a) problem intent, (b) executable reproduction, (c) agent/human attempt provenance, (d) code changes, (e) contributor characterization, (f) independent upstream validation, (g) evidence freshness, and (h) review/decision state.

Existing standards address adjacent layers. SLSA provenance records verifiable information about where, when and how software artifacts were produced [7]. in-toto specifies authenticated software-supply-chain steps, materials and products [8]. CDEvents defines interoperable event semantics for source control, CI, testing, deployment and operations [9]. SARIF standardizes static-analysis result interchange [10], while CycloneDX standardizes bills of materials and related supply-chain representations [11]. FACoP is designed as a semantic composition layer spanning the collaboration lifecycle before and around these mechanisms.

## 3. Design Goals

FACoP has seven goals:

1. **Reproducibility:** a claimed defect fix should preserve an executable or explicitly justified reproduction.
2. **Independent assurance:** contributor/agent tests must not be the only acceptance authority.
3. **Observable provenance:** material prompts, tools, attempts and outputs should be attributable without requiring hidden reasoning traces.
4. **Evidence freshness:** validation results must be bound to all relevant semantic inputs.
5. **Selective recomputation:** unchanged evidence should be reusable; changed dependency closures should invalidate affected evidence.
6. **Portable characterization:** consumers should be able to inspect performance, resource and resilience envelopes tied to known environments.
7. **Forge independence:** GitHub/GitLab/Forgejo are adapters, not the protocol.

## 4. Contribution as an Evidence Graph

FACoP defines:

`Contribution = Intent + Reproduction + Specification + Attempts + Patch + Evidence + Validation + Review + Decision`.

This differs from representing a contribution solely by its final patch. The graph preserves rejected attempts and their evidence, allowing auditors and future agents to avoid repeating failed approaches. The graph's root is a stable Contribution identity associated with an issue/problem statement and exact source revision.

An Attempt includes actor identity/class, safe prompt record or digest, model/tool identifiers when available, context artifact hashes, resulting patch hash and outcome. FACoP explicitly does not require private chain-of-thought; only externally observable inputs/actions/outputs relevant to reproducibility are in scope.

## 5. Proof-of-Fix

For defects, FACoP recommends a fail-to-pass invariant:

`BaseRevision + Reproduction → FAIL`

`CandidateRevision + SameReproduction → PASS`.

This mirrors the fail-to-pass construction used by repository-level benchmarks such as Rust-SWE-bench [3], but FACoP applies it to contribution governance. Where applicable, mutation testing or independently-authored upstream tests can strengthen the inference that the reproduction distinguishes a real fix rather than merely matching the candidate patch.

## 6. Execution Profiles and Trust Separation

FACoP defines five logical execution profiles.

**Local** runs fast correctness checks and contributor-owned technical characterization. **Dev** reruns contribution-owned and impact-selected tests in the contributor repository. **Stage** executes upstream-compatible unit, integration, end-to-end and security gates. **Qualification** computes the complete required evidence closure and reruns only invalidated or missing evidence. **Upstream** manages the canonical proposal/review loop.

The same source revision must traverse profiles; profile names are states, not independent development histories. Git branches with suffixes such as `-dev`, `-stage` and `-tests` may materialize these profiles, but each must identify the same candidate commit/artifact or explicitly record a transition to a new revision.

Security requires separation between untrusted contributor execution and trusted upstream mutation credentials. This is consistent with the broader supply-chain objective of authenticating steps and authorized functionaries expressed by in-toto [8].

## 7. Content-Addressed Evidence

Repeatedly executing every historical test is unnecessary when the evidence's complete semantic input set is unchanged. Conversely, caching solely by source-file digest is unsafe because dependencies, compilers, flags, runtime, configuration, schemas or workflows may alter behavior.

FACoP therefore defines an EvidenceKey:

`H(source || test/spec || dependency-lock || toolchain || flags || runtime || config || contracts || schemas || workflow || environment-class)`.

An Evidence node is reusable only if its key matches, policy has not expired/revoked it, and no higher-level dependency closure requires invalidation. Qualification becomes a proof of current evidence completeness rather than a command to rerun every test.

This generalizes test-impact selection from `changed code → affected tests` to `changed artifact → semantic dependency graph → invalidated evidence → required execution`. It is especially useful for Everything-as-Code architectures in which configuration, contracts, policies and test definitions are explicit graph nodes.

## 8. Technical Characterization and Evidence Passport

Correctness gates answer whether a contribution may integrate; characterization answers how the resulting component behaves. FACoP treats benchmark, load, stress, chaos/fault and resource profiling as first-class evidence categories without requiring each to block every merge.

An Evidence Passport associates characterization results with exact artifact and environment identities. For example, an operations-per-second number is invalid as a portable claim unless CPU architecture/class, runtime/compiler configuration and other policy-defined environment fields accompany it. This separates reproducible technical knowledge from marketing-style benchmark claims.

## 9. Relationship to Existing Standards

FACoP intentionally composes with established specifications:

- **SLSA:** build/artifact provenance and integrity levels [7].
- **in-toto:** authenticated supply-chain layouts, steps, materials and products [8].
- **CDEvents/CloudEvents:** event interoperability across software delivery [9].
- **SARIF:** standardized static/security analysis findings [10].
- **CycloneDX/SPDX:** component and dependency transparency [11].

FACoP adds a contribution-semantic layer: why the change exists, how it was reproduced, which agent/human attempts led to it, what evidence currently justifies it, how review feedback changed it and which exact revision the project accepted.

## 10. Reference Architecture

The reference implementation uses Everything-as-Code manifests and an e-commerce example containing Users, Consumers, Products, Stock, Payment and Delivery. Each atomic action owns a README, manifest, config, schema, event contract, implementation and unit test. Higher-level integration/E2E suites are owned outside the action folders to demonstrate the trust separation between contributor-local behavior tests and project-wide acceptance tests.

The validation policy declares applicability by semantic capability. A pure deterministic action may produce `chaos = not-applicable`, whereas a network/payment adapter may require injected timeout, duplicate-delivery and partial-failure scenarios. All categories remain visible; none silently disappear.

## 11. Research Questions and Hypotheses

**RQ1:** Does explicit executable reproduction increase successful agentic issue resolution?  
**H1:** Contributions satisfying Proof-of-Fix will have higher independent acceptance-test pass rates than contributions lacking reproduction evidence.

**RQ2:** Does independent upstream validation reduce false confidence from agent-written tests?  
**H2:** A measurable subset of patches passing contributor-authored tests will fail upstream-owned tests, consistent with concerns raised by Chen et al. [4].

**RQ3:** Does Content-Addressed Evidence reduce CI cost without increasing escaped regressions?  
**H3:** Evidence-key selection will execute fewer expensive checks than full-suite qualification while preserving equivalent acceptance outcomes under a correctly specified dependency graph.

**RQ4:** Does preserving attempt/review provenance improve subsequent agent repairs?  
**H4:** Agents receiving structured rejected-attempt and reviewer-feedback provenance will require fewer repeated attempts and less token/tool budget.

**RQ5:** Can Evidence Passports improve technology selection and deployment planning?  
**H5:** Developers receiving environment-bound characterization evidence will make more accurate capacity predictions than developers receiving README-level performance claims alone.

## 12. Threats to Validity

FACoP's strongest assumption is the completeness of its semantic dependency graph. Missing dependencies can cause stale evidence reuse. Environment classes can also be too broad to preserve benchmark comparability. Prompt provenance may be incomplete when proprietary agents do not expose model/version metadata. Public prompt logs can leak secrets unless redaction is robust. Finally, the protocol may impose process overhead on small projects; empirical evaluation must determine whether automated tooling makes the additional evidence cost acceptable.

The proposal is therefore not presented as a proven superior SDLC. It is a falsifiable protocol design whose benefits must be measured against conventional CI/review workflows.

## 13. Conclusion

As coding agents become routine contributors, open-source governance requires more than distinguishing human-authored from AI-authored code. Projects need reproducible problem statements, independent evidence, exact provenance, review-aware repair loops and efficient evidence freshness. FullAgenticCollab/FACoP proposes a forge-independent lifecycle in which a contribution is an evidence-backed graph and qualification is the proof that required evidence is current. By composing rather than replacing existing supply-chain and CI standards, FACoP aims to provide the missing semantic layer between the intention to contribute and the verified acceptance of a change.

## References

[1] D. Ogenrwot and J. Businge, “How AI Coding Agents Modify Code: A Large-Scale Study of GitHub Pull Requests,” MSR 2026 / arXiv:2601.17581, 2026. DOI: 10.1145/3793302.3793603.

[2] L. Twist and J. M. Zhang, “A Study of Library Usage in Agent-Authored Pull Requests,” Proc. MSR '26, 2026. DOI: 10.1145/3793302.3793562.

[3] J. Xiang, W. He, X. Wang, H. Tian, and Y. Zhang, “Evaluating and Improving Automated Repository-Level Rust Issue Resolution with LLM-based Agents,” ICSE 2026 / arXiv:2602.22764, 2026. DOI: 10.1145/3744916.3773108.

[4] Z. Chen et al., “Rethinking the Value of Agent-Generated Tests for LLM-Based Software Engineering Agents,” arXiv:2602.07900, 2026.

[5] C. Nachuma and M. Zibran, “When AI Teammates Meet Code Review: Collaboration Signals Shaping the Integration of Agent-Authored Pull Requests,” arXiv:2602.19441, 2026.

[6] D. Russo, “Govern the Repository, Not the Agent: Measuring Ecosystem-Level Risk in AI-Native Software,” arXiv:2606.28235, 2026.

[7] SLSA, “Build Provenance, Specification v1.2,” 2026.

[8] in-toto Project, “in-toto Specification v1.0,” CNCF.

[9] CDEvents Project, “CDEvents Specification,” Continuous Delivery Foundation.

[10] OASIS, “Static Analysis Results Interchange Format (SARIF).”

[11] OWASP/Ecma International, “CycloneDX Bill of Materials Specification (ECMA-424).”
