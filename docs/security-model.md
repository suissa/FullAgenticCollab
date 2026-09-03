# FACoP Security Model (normative)

`docs/spec/SECURITY.md` states the requirements. This document states **where each one is
enforced, by what mechanism, and what an implementation is forbidden to do**. Anything left
implicit here is the kind of thing someone will implement wrong, so the three questions that
matter most are answered first:

| Question | Answer | Enforced by |
|---|---|---|
| Where does contributor CI run, and with what credentials? | In the contributor's own repository/fork, with that repository's own token. It never receives upstream write authority. | `scripts/workflow-guard.ts`, run in `test:stage` and in `facop-dev.yml` |
| What stops a secret from reaching an append-only public prompt log? | A blocking secret scan that runs before the log can be merged. | `scripts/secret-scan.ts` at three gate positions: `scripts/hooks/pre-commit`, `scripts/hooks/pre-receive`, and a required CI check |
| Who vouches that reused evidence was produced honestly? | An Ed25519 attestation signed by the plane that executed it, verified against `config/trusted-keys.json` before reuse. | `scripts/attest.ts`, `scripts/verify-attestation.ts`, reuse gate in `scripts/qualify.ts` |

---

## 1. Trust planes and where CI runs

### 1.1 The two planes

**Contributor plane** — everything up to and including qualification. It executes
contributor-controlled code (source, tests, config, workflow files, and any agent-produced
patch), so it is **untrusted**.

**Upstream plane** — acceptance policy, the canonical branches, and the authority to create or
update a PR and to merge. It executes only upstream-controlled code.

### 1.2 Where each profile executes — explicitly

Contributor CI (`facop-dev.yml`, `facop-stage.yml`, `facop-qualification.yml`) runs **in the
contributor's own repository or fork, under that repository's own `GITHUB_TOKEN` and that
repository's own secrets**. This is what step 9 of `CONTRIBUTING.md` means by "contributor CI".

Concretely, the following hold for every contributor-plane workflow, and are checked
mechanically rather than trusted to review:

- `permissions:` is declared explicitly and grants **no `write` scope**.
- No `${{ secrets.* }}` reference of any kind appears. The contributor plane needs no secret.
- `actions/checkout` runs with `persist-credentials: false`, so no token lands in `.git/config`
  where contributor-controlled build/test code could read it.
- Every `uses:` is pinned to a full 40-character commit SHA. An Action SHA is part of the
  validation environment and therefore part of the EvidenceKey.

### 1.3 What the design forbids — this was removed, not merely undocumented

An earlier sketch had contributor CI create the upstream Issue/PR automatically. **That is
removed.** No workflow in this repository holds a credential that can mutate the upstream, and
the following are forbidden outright in every FACoP workflow:

- **`pull_request_target`** — it runs with a privileged, secret-bearing context against a
  fork-controlled ref. It is the classic fork-escalation surface and FACoP does not use it,
  anywhere, for any purpose.
- **`workflow_run`** — same escalation shape one hop removed: a privileged workflow triggered
  by an untrusted one.
- Any cross-repository PAT, deploy key, or App installation token injected into a job that
  checks out or executes contributor code.
- `pull_request` triggers from forks are permitted only because they are unprivileged by
  construction (read-only token, no secrets); they are still subject to all of 1.2.

`scripts/workflow-guard.ts` fails the build on each of these. `tests/integration/security-controls.test.ts`
additionally asserts, file by file, that no workflow uses `pull_request_target`.

### 1.4 How work then crosses into the upstream plane

Evidence crosses the boundary; code execution does not.

1. The contributor plane produces an Evidence Passport and **signs it** (§3).
2. The upstream plane — a separately installed GitHub App or another narrowly scoped
   credential, running in an upstream-controlled job or agent runtime that **never checks out
   or executes contributor code** — receives the passport, verifies the signature, verifies the
   candidate tree/artifact digest, and re-runs upstream-owned acceptance suites on its own terms.
3. Only that upstream-plane component may create or update the canonical PR.
4. `facop-review-observer.yml` is read-only by construction: it normalizes review events into
   `ReviewObserved` and forwards them. It decides nothing and writes nothing.

The credential in step 2 is held by the upstream plane alone. If a deployment cannot keep that
credential out of every job that touches contributor code, it MUST have a human open the
upstream PR instead. There is no third option in which contributor CI holds upstream write
authority.

---

## 2. Secret hygiene in prompt logs — the enforcement mechanism

`docs/spec/PROVENANCE.md` requires that prompt logs carry no secrets. A rule with no gate is
decorative, so the rule is enforced at three points, ordered cheapest-first:

| Point | Mechanism | Effect |
|---|---|---|
| Author's machine (optional, advisory) | `scripts/hooks/pre-commit`, installed with `npm run hooks:install` — scans the staged blobs from the index, not the worktree | Fails before the value ever enters git history, while amending is still enough. Bypassable with `--no-verify`, which is why it is not the load-bearing gate |
| Server-side, before history is accepted (recommended for hardened deployments) | `scripts/hooks/pre-receive` — or `gitleaks detect --no-git`/`trufflehog filesystem` at the same position — installed as the forge's pre-receive hook. On github.com, where pre-receive hooks are unavailable, the equivalent is a push ruleset plus push protection plus the required CI check | The push is **rejected**; nothing to force-push away and no window in which the log is public with a live credential |
| CI, blocking (always on, required check) | `npm run test:secrets` in `facop-dev.yml`, and inside `test:stage`, therefore also in stage and qualification | The contribution cannot reach `QUALIFIED` or be merged |

`scripts/secret-scan.ts` is the dependency-free reference gate. It:

- scans `docs/prompts/`, `docs/spec/`, this file, `config/` and `.facop/evidence/`;
- matches high-signal credential shapes (provider tokens, private-key blocks, JWTs, assigned
  `secret =`/`token =` literals, basic-auth URLs) plus committed key material by file extension;
- **redacts every match in its own output**, so a blocking CI log never republishes the secret
  it just caught;
- exits non-zero on any finding, with remediation text pointing at the digest-plus-summary form
  `PROVENANCE.md` allows.

Deployments SHOULD substitute or add gitleaks/trufflehog at the same gate positions; the
placement is the normative part, the scanner is not.

Two properties follow, and both matter:

- **The gate runs before append-only, not after.** `docs/prompts/<ISSUE-ID>.md` becomes public
  and append-only on merge. Scanning after that point is worthless — the value is already
  published and only rotation helps.
- **A finding is a rotation event, not just a diff to amend.** If a real credential reached any
  branch, the contribution is blocked *and* the credential is treated as compromised.

The pre-receive hook materializes the pushed tree with `git archive` and never executes anything from it: the scanner it runs comes from the server's own checkout when `FACOP_SCRIPTS` is set, so a contributor cannot disarm the gate by editing the scanner in their own push.

A line documenting a non-live example may carry the marker `facop:secret-scan-allow`; that is a
reviewed exception, not a general escape hatch.

---

## 3. Evidence attestation — who signs, with what, verified where

### 3.1 The gap this closes

An `EvidenceKey` is content-addressed: it proves that no semantically relevant input changed
between the run that produced a result and the run that wants to reuse it. **It says nothing
about whether the original execution was honest.** A forged passport with a well-formed key
would otherwise be reusable forever. Content addressing answers *did anything change*;
attestation answers *do I trust who produced this*. Both are required.

### 3.2 The mechanism

- **Format**: a DSSE-style envelope, `payloadType` `application/vnd.facop.evidence-passport+json`,
  over the exact passport bytes, with signatures computed over the DSSE pre-authentication
  encoding so the payload type is bound into the signature.
- **Algorithm**: Ed25519. `keyid` is `sha256:<digest of the SPKI DER public key>`, derivable
  from the public key alone.
- **Who signs**: the plane that *executed* the evidence, in the same job that produced it,
  immediately after production (`scripts/attest.ts`). A passport is never signed by a party that
  merely relays it.
- **With what**: a job-scoped private key belonging to that plane, injected as
  `FACOP_ATTESTATION_KEY_PEM`. It is never written into the contribution tree, and — per §1.2 —
  a contributor-plane job holds no upstream-authority secret; its signing key attests only to
  the `contributor` trust class and buys no upstream write access.
- **Verified where**: `scripts/verify-attestation.ts`, and the reuse gate inside
  `scripts/qualify.ts`, against `config/trusted-keys.json`.

### 3.3 What verification rejects

`verifyEnvelope` admits a passport only when every one of these holds; otherwise it returns a
reason and the caller fails closed:

- the `payloadType` is the expected one;
- a signature is present from a key **listed** in the trusted key set (unknown key → reject);
- that key is **not revoked** and **not past `not_after`**;
- that key is **authorized for the profile being verified** (`profiles`), so a `dev`-class key
  cannot vouch for qualification evidence;
- the signature verifies over the exact payload bytes (any tampering → reject);
- when `--expect-revision` is given, the attested `revision` matches the revision under
  evaluation — this is what stops a valid passport for revision A from being replayed onto
  revision B.

### 3.4 Where it is wired into the lifecycle

- `facop-qualification.yml` restores the previous passport, **verifies its attestation before
  anything reads it**, and discards it (re-executing all evidence) if it is unattested.
- `scripts/qualify.ts` refuses to reuse any previous passport that lacks a verified envelope,
  and refuses one whose file bytes differ from the attested payload. The reuse decision happens
  *before* the stage suite runs, so an untrusted passport fails fast.
- After qualification, the new passport is signed and the signature is immediately re-verified
  against the current `GITHUB_SHA`, so a passport is never published unverified.
- The emitted passport records `reuse_provenance`: the trust class and key id that vouched for
  every reused row, or `none`.

Therefore the reuse rule in `docs/spec/EVIDENCE.md` reads, in full: evidence may be reused when
the EvidenceKey matches **and** it is not expired **and** not revoked **and** it arrives under a
signature from a producer the consuming plane trusts for that profile.

### 3.5 Key management

`config/trusted-keys.json` is the trust root and is upstream-owned; changing it is a
policy change requiring review. Rotation is additive: publish the new key, then set
`revoked: true` or `not_after` on the old one — evidence signed by a revoked key stops being
reusable at the next verification, which is the intended blast radius.

The key at `config/reference-attestation-key.pem` is a **non-production demonstration key with
a deliberately public private half**, present only so this repository can self-test the
attestation path end to end. A real deployment MUST remove that entry from
`config/trusted-keys.json` and list only keys whose private half is a plane-owned secret.
Hardened deployments SHOULD instead use keyless signing with a transparency log (Sigstore/
Fulcio/Rekor) or in-toto attestations bound to SLSA provenance; the envelope above is
deliberately shaped so those substitute at the same gate.

---

## 4. Residual risks, stated plainly

- **The trust root is a file in the repository.** Whoever can merge a change to
  `config/trusted-keys.json` can add a producer. Protect it with branch protection and
  code-ownership review; that control is organizational, not cryptographic.
- **Attestation proves origin, not correctness.** A trusted-but-compromised producer can sign a
  dishonest passport. That is why upstream-owned suites re-run on the upstream plane and why
  `never merge solely because contributor-owned evidence passed` remains a rule.
- **Secret scanners have false negatives.** A gate reduces exposure; it does not license
  putting live credentials near a prompt log.
- **The reference security check is a linter**, not a SAST tool. Hardened deployments emit SARIF
  from a real scanner at the same gate position.
