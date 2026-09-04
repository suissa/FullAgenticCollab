# Research Note — Validated Reason Development and code-free agentic collaboration

Date of review: **2026-09-04**.

This note documents prior-art search performed while formalizing FACoP v0.2. It is not a legal novelty opinion and does not claim exhaustive coverage of every paper, repository, product or unpublished system.

## Research question

We searched for two related ideas:

1. whether **Validated Reason Development** already exists as an established software-engineering term;
2. whether an agentic/open-source collaboration model already uses **test + prompt/context as the contribution while explicitly refusing contributor production code and independently regenerating the accepted solution upstream**.

## Exact term

Searches for the exact phrase `"Validated Reason Development"` and close software-development variants did not surface an established method, paper, standard or widely used engineering term under that name.

FACoP therefore uses the term descriptively for the model defined in `docs/spec/VALIDATED-REASON-DEVELOPMENT.md`. This should be read as a naming result from the reviewed corpus, not as a claim that no one has ever used the phrase.

## Closest technical antecedents

### 1. Test-suite-based automated program repair

Automated Program Repair (APR) has long used tests as an executable correctness oracle. A large ICSE 2020 assessment describes test-based APR as a mature research family and explicitly notes that test suites act as a weak but affordable approximation of program specifications.

Reference:

- Kui Liu et al., **On the Efficiency of Test Suite based Program Repair: A Systematic Assessment of 16 Automated Repair Systems for Java Programs**, ICSE 2020. DOI: `10.1145/3377811.3380338`.
- https://doi.org/10.1145/3377811.3380338

Relevance to VRD: tests driving automated repair are established prior art.

Difference: APR normally studies how a repair system produces a patch from a failing program/test suite; it is not primarily a collaboration protocol deciding what a contributor is allowed to contribute or who owns the generated patch.

### 2. TDFlow — human-written tests solved by LLM agents

TDFlow is the closest academic antecedent found for the agentic part of the idea. It frames repository-scale software engineering as a test-resolution task and is specifically designed to solve **human-written tests** with specialized agents. The authors report 94.3% on SWE-Bench Verified and state that accurate reproduction-test generation is the main remaining obstacle to fully autonomous repository repair. They explicitly envision a human–LLM system in which human developers write tests and LLM systems solve them.

Reference:

- Kevin Han et al., **TDFlow: Agentic Workflows for Test Driven Development**, EACL 2026, pp. 1511–1527. DOI: `10.18653/v1/2026.eacl-long.70`.
- https://aclanthology.org/2026.eacl-long.70/

Relevance to VRD: strongly supports the premise that human-authored executable tests can be the useful human contribution while agents generate repository patches.

Difference: TDFlow is an agentic repair workflow/benchmark method. FACoP VRD additionally defines contribution authority, forbids contributor production code as the accepted contribution, requires prompt/context provenance, separates trust planes, and requires an upstream-controlled independently generated candidate.

### 3. Bug Reproduction Tests and fail-to-pass evidence

Recent Bug Reproduction Test (BRT) research explicitly converts bug reports into executable bug-specific signals used to guide repair and validate candidate patches. Work from Microsoft Research in 2026 also argues that simple fail-to-pass is not always sufficient and studies hardening co-generated reproductions/fixes.

Reference:

- Yuhao Tan et al., **Beyond Fail-to-Pass: Iterative Hardening of Co-Generated Bug Reproduction Tests and Fixes**, Microsoft Research / arXiv, July 2026.
- https://www.microsoft.com/en-us/research/publication/beyond-fail-to-pass-iterative-hardening-of-co-generated-bug-reproduction-tests-and-fixes/

Relevance to VRD: validates treating a reproduction test as a first-class bug-specific artifact and warns against assuming one fail-to-pass pair proves total correctness.

FACoP addresses that limitation by using the reproduction as authority for the **contributed claim**, while final acceptance still requires the upstream evidence graph.

### 4. Reproducible issue templates

Open-source projects already accept executable reproduction artifacts. Renode, for example, publishes a dedicated issue-reproduction template where a contributor adapts a repository/test so CI fails on selected Renode revisions.

Reference:

- Antmicro / Renode issue reproduction template: https://github.com/renode/renode-issue-reproduction-template

Relevance to VRD: contributor-supplied failing executable reproductions are established open-source practice.

Difference: such workflows generally still allow/encourage the contributor to include a proposed fix; they do not establish a general no-production-code contribution rule with upstream regeneration.

### 5. Prompt provenance

Prompt provenance is emerging as an explicit engineering concern. The Prompt Provenance Model (2025) uses W3C PROV concepts to represent prompt, context and completion lineage; newer tooling also attaches prompts to code history.

References:

- Tyler Procko et al., **Prompt Provenance: Toward Traceable LLM Interactions**, 2025. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5682942
- Research agenda: **From Prompting to Engineering: A Research Agenda for Prompt Engineering in Software Engineering**, 2026, arXiv:2609.02248.

Relevance to VRD: prompts/context can be first-class traceable artifacts instead of transient chat text.

Difference: prompt provenance by itself does not make the prompt the contribution authority. In VRD, prompt/context is provenance and generation input; the executable reproduction remains the authority for the defect claim.

### 6. Verification-first agentic software engineering

Recent research argues that generated code is becoming abundant/disposable and that verification, orchestration and accountable collaboration become the scarce engineering capabilities.

Reference:

- Mamdouh Alenezi, **Rethinking Software Engineering for Agentic AI Systems**, 2026, arXiv:2604.10599.

Relevance to VRD: this supports the economic/engineering premise behind shifting contributor value from patch authorship toward problem formulation and verification.

## What appears distinctive in FACoP VRD

Across the sources reviewed, individual parts are clearly not new:

- tests as executable specifications/oracles — established;
- failing tests as bug reproductions — established;
- automated/LLM patch generation — established;
- humans writing tests for agents to solve — explicitly demonstrated by TDFlow;
- prompt provenance — established/emerging;
- independent/upstream validation — established supply-chain and open-source practice.

What we did **not** find as a packaged collaboration protocol is the following conjunction:

1. **Contributor production code is intentionally excluded from contribution authority.**
2. **The contributor-authored executable reproduction is the normative authority for the problem claim.**
3. **Prompt/context is preserved as safe provenance and optional generation recipe, not as hidden reasoning.**
4. **The upstream independently regenerates its own candidate rather than adopting the contributor patch.**
5. **The exact same reproduction bytes are injected into control and treatment executions.**
6. **ProblemProof and SolutionProof are distinct evidence objects.**
7. **The verified contributor reproduction can later change authority and become a canonical regression test.**

This conjunction is the scope in which FACoP uses the name **Validated Reason Development**.

## Terminology warning

`Validated Reason` must not be interpreted as "validated chain-of-thought". FACoP intentionally does not require hidden model reasoning. The validated object is an externally inspectable engineering reason:

`Claim + Reproduction + ExpectedFailure + safe Prompt/Context Provenance + execution evidence`.

The executable reproduction decides whether the reason has demonstrated the problem.

## Research hypothesis

VRD suggests a testable software-engineering hypothesis:

> In agentic development, collaboration quality may improve when humans contribute falsifiable executable problem definitions and provenance while trusted upstream agents regenerate implementation candidates, instead of transferring generated patches across the trust boundary.

Possible empirical measurements include reproduction acceptance rate, regeneration success rate, time-to-solution, patch overfitting, regression rate, contributor effort, maintainer review effort and solution convergence across independent generators.
