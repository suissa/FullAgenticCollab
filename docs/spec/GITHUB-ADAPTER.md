# FACoP GitHub Adapter

This document is implementation guidance. GitHub concepts are not normative FACoP semantics.

## Mapping

| FACoP concept | GitHub materialization |
|---|---|
| Contribution | Issue + branch/PR metadata + FACoP manifest |
| dev profile | `issue-<id>-<slug>-dev` push workflow |
| stage profile | PR/promotion into `issue-<id>-<slug>-stage` |
| qualification | PR/promotion into `issue-<id>-<slug>-tests` or `-qualification` |
| upstream proposal | PR into the canonical project branch |
| review observation | issue/review/review-comment webhook or Actions event |
| evidence | workflow artifacts + attestations/provenance references |

## Promotion invariant

A profile promotion MUST identify the candidate source tree. A fast-forward preserving the exact commit SHA is preferred. If the forge creates a merge commit only to encode promotion, FACoP treats that commit as adapter metadata and binds behavioral evidence to the candidate tree/artifact digest as well as to the workflow revision.

## Trust planes

### Contributor plane

May execute contributor-controlled code. It receives no credential capable of mutating the canonical upstream. `facop-dev.yml` uses a read-only token and disables checkout credential persistence.

### Upstream plane

Owns acceptance policy, stage/qualification workflows and the authority to create/update the canonical upstream PR. Cross-repository automation SHOULD use a separately installed GitHub App or another narrowly scoped credential after contributor evidence has been received; the credential MUST NOT be exposed to code executed from an untrusted fork.

## Review observation

`facop-review-observer.yml` is intentionally read-only. It normalizes GitHub review events into `ReviewObserved`. A production deployment can forward this event to an authorized agent runtime outside the untrusted workflow. The agent may then decide whether a new Attempt is needed.

## Immutable Actions

The reference workflows pin GitHub Actions by full commit SHA. Updating an Action SHA is itself a change to the validation environment and therefore changes relevant EvidenceKeys.

## Automatic upstream flow

A production adapter can implement:

1. receive a qualified contribution and its Evidence Passport;
2. verify candidate tree/artifact digest;
3. verify expected stage/qualification checks;
4. create/update the upstream PR through a GitHub App;
5. attach evidence summary and provenance references;
6. observe comments/checks/reviews;
7. emit FACoP lifecycle events;
8. re-enter `IMPLEMENTING` after actionable `changes-requested` feedback;
9. never merge solely because contributor-owned evidence passed.
