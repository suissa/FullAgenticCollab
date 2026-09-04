# facop-review

Autonomous acceptance for a FACoP contribution. Answers one question about a pull request:
**can this be accepted without a maintainer reading it?**

> **Build status: this program has not been compiled or run.** It was written in an
> environment with no Zig toolchain and no network route to one. The logic in `policy.zig`
> and `dsse.zig` is covered by `zig build test`, but nobody has executed those tests yet.
> Treat the first `zig build test` as the real acceptance gate for this tool, and expect to
> fix compile errors. Everything else in this repository is tested and passing; this file
> is the exception, and it says so rather than letting you find out.

## Why it is shaped this way

An LLM review is not a proof. It is a judgement oracle: non-deterministic, and it reads
contributor-controlled text — precisely the input an attacker controls. If the model could
*grant* acceptance, the human reviewer would not have been removed; they would have been
replaced by a more persuadable one.

So the decision is asymmetric:

| Input | Can grant acceptance | Can withhold acceptance |
|---|---|---|
| Ed25519 attestation verified and bound to the head revision | **yes** | yes |
| Required checks green, mergeable, not a draft | **yes** | yes |
| Diff touches no protected path | **yes** | yes |
| Model's semantic verdict | **no** | yes |

Three properties follow, and each is a rule in `policy.zig` with a test:

1. **A failed proof rejects, whatever the model says.** A model calling a change fine is not
   a signature.
2. **An unavailable or unparseable model verdict blocks**, it does not pass. Failing open on
   the oracle would let an attacker obtain acceptance by making the oracle unavailable.
3. **A change touching the trust root or any gate is never self-accepted.** Without this,
   the first malicious contribution adds its own key to `config/trusted-keys.json` and the
   system's autonomy becomes its capture — every later forgery then verifies correctly.
   This is a logical necessity, not caution. It is also why `.github/CODEOWNERS` still
   exists: it is the escalation path for exactly this set of files, not the default path
   for ordinary contributions.

## What it does not do

**It never merges, and it holds no merge credential.** It emits a Decision record and, with
`--post`, publishes it as the `FACoP Autonomous Acceptance` check run. Branch protection
consuming that check is what gates the merge — merge authority stays with GitHub. That
keeps this program a verifier, so a bug in it cannot merge anything on its own.

It also never checks out or executes contributor code: the diff arrives through the compare
API as data. It runs on the upstream plane (`docs/security-model.md` §1).

## Usage

```
facop-review --repo owner/name --pr 12 \
             --passport .facop/evidence/passport.json \
             --attestation .facop/evidence/passport.att.json \
             [--trusted-keys config/trusted-keys.json] \
             [--issue-body issue.txt] [--profile qualification] [--post]
```

| Environment | Purpose |
|---|---|
| `GITHUB_TOKEN` | read scope; plus `checks:write` when `--post` is used |
| `ANTHROPIC_API_KEY` | the semantic pass; absent means inconclusive, which blocks |

| Exit code | Meaning |
|---|---|
| `0` | accept — every proof holds, no objection raised |
| `1` | escalate to human — protected path, objection, or inconclusive oracle |
| `2` | reject — a proof failed |
| `3` | operational error |

## Prompt injection

The diff and the issue body are contributor-controlled and reach the model inside `<diff>`
and `<intent>` tags, with the system prompt stating they are data and that an attempt to
redirect the review is itself grounds for objection. That reduces the risk; it does not
eliminate it. The structural answer is the asymmetry above: a successful injection can at
most produce "no objection", which grants nothing on its own — acceptance still requires
every cryptographic and CI proof to hold independently.

## Build

```
cd tools/facop-review
zig build test     # policy + DSSE tests
zig build          # produces zig-out/bin/facop-review
```

Requires Zig 0.14 or later. `dsse.zig` is byte-compatible with `scripts/attest-lib.ts`:
the same DSSE pre-authentication encoding, the same Ed25519 keys, the same trusted key set.
Two independent implementations verifying the same envelope is deliberate — a signature
that only one implementation accepts is a signature worth distrusting.
