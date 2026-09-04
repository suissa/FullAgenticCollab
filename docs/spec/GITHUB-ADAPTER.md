# FACoP GitHub Adapter v0.2

This document is implementation guidance. GitHub concepts are not normative FACoP semantics.

## Mapping

| FACoP concept | GitHub materialization |
|---|---|
| Problem Contribution | Issue + code-free `contribution/` package on `issue-<id>-<slug>-dev` |
| Claim/Reproduction/Reason | `contribution/contribution.json` + declared test + prompt/context files |
| dev profile | contributor/fork push workflow enforcing code-free diff and provenance hygiene |
| stage profile | upstream-generated candidate on `issue-<id>-<slug>-stage` |
| tests profile | `issue-<id>-<slug>-tests`; immutable reproduction injected into canonical base and generated candidate worktrees |
| qualification | `issue-<id>-<slug>-qualification`; consumes ProblemProof/SolutionProof plus evidence closure |
| upstream proposal | upstream-owned generated-solution PR into the canonical branch |
| review observation | issue/review/review-comment webhook or Actions event |
| evidence | workflow artifacts + attestations/provenance references |

## Contributor branch is code-free

For a Validated Reason contribution, the contributor `-dev` branch contains only the declared `contribution/` package. `scripts/contribution-guard.ts` compares the branch to its base and rejects changes outside that package.

The contributor PR/branch is therefore a **problem contribution**, not the solution PR.

## Upstream candidate branch

After `ProblemProof`, the upstream generation plane creates its own candidate. This branch MAY contain production-code changes because those changes are upstream-generated, not contributor-authored acceptance input.

The upstream generator SHOULD consume only:

- Issue/Claim;
- validated reproduction;
- project-owned source/architecture/contracts;
- safe prompt/context provenance;
- upstream generation policy.

Contributor production patch bytes are not authoritative generation input.

## `tests` branch — injection rather than reinterpretation

`facop-tests.yml` checks out enough Git history to materialize both control and treatment trees. `scripts/validated-reason-gate.ts`:

1. resolves `origin/main` (or another declared base) to the canonical base SHA;
2. resolves `HEAD` to the generated candidate SHA;
3. reads and hashes the contributor reproduction once;
4. creates detached temporary worktrees;
5. copies the exact test bytes to the manifest-declared injection path in each tree;
6. requires the declared failure identity on the base;
7. requires PASS on the generated candidate;
8. verifies identical reproduction digest;
9. publishes `.facop/evidence/validated-reason.json`.

The temporary injection means the canonical base does not need to contain the contributed test before the problem is accepted.

## Promotion invariant

A profile promotion MUST identify:

- Contribution ID;
- canonical base revision;
- reproduction digest;
- generated candidate revision when one exists.

A fast-forward preserving the exact generated-candidate SHA is preferred from `stage` through `tests` and `qualification`. If the forge creates adapter-only commits, behavioral evidence MUST remain bound to the candidate tree/artifact digest.

## Trust planes

### Contributor/untrusted execution plane

`dev`, `tests`, and any other workflow that executes contributor-controlled reproduction code receive no credential capable of mutating canonical upstream state. Checkout credential persistence is disabled, `secrets.*` use is forbidden, and write permissions are forbidden by `scripts/workflow-guard.ts`.

The reference reproduction runner also starts the test command with a restricted environment that omits token/secret variables. Production adapters SHOULD additionally use disposable containers/VMs, network denial and resource limits.

`pull_request_target` and `workflow_run` remain forbidden.

### Upstream generation/acceptance plane

Owns generation policy, project context, candidate creation, qualification and the authority to open/update the canonical solution PR. Generation credentials and merge authority MUST NOT be exposed to contributor reproduction execution.

## Qualification artifact flow

The `tests` profile uploads `facop-validated-reason-proof`. The `qualification` profile restores that artifact and requires its generated-candidate revision to equal the qualification revision before including it in the Evidence Passport.

This prevents a valid ProblemProof/SolutionProof from candidate A being reused to qualify candidate B.

## Review observation

`facop-review-observer.yml` is intentionally read-only. It normalizes GitHub review events into `ReviewObserved`. A production deployment can forward this event to an authorized agent runtime outside untrusted workflows.

## Immutable Actions

The reference workflows pin GitHub Actions by full commit SHA. Updating an Action SHA changes the validation environment and therefore relevant EvidenceKeys.

## Automatic upstream flow

A production adapter can implement:

1. receive and validate the code-free problem contribution;
2. run/accept ProblemProof;
3. independently generate one or more upstream candidates;
4. run stage acceptance suites;
5. run the `tests` control/treatment proof with the unchanged reproduction;
6. qualify and attest complete evidence;
7. create/update the upstream-generated solution PR through a narrowly scoped GitHub App;
8. attach ProblemProof, SolutionProof and provenance references;
9. observe comments/checks/reviews and regenerate/revalidate when needed;
10. never accept contributor production code merely because it passes the contributor test.
