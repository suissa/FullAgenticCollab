//! The acceptance policy: which facts, combined how, produce a decision.
//!
//! The asymmetry here is the whole design and is deliberate:
//!
//!   * Only DETERMINISTIC facts can grant acceptance — a verified signature bound to the
//!     exact head revision, green required checks, no protected path touched. These are
//!     checkable proofs; two independent verifiers must reach the same answer.
//!   * The LLM can only WITHHOLD acceptance. It is a judgement oracle, not a proof: it is
//!     non-deterministic and it reads contributor-controlled text, which is precisely the
//!     input an attacker controls. Letting it grant acceptance would replace the human
//!     reviewer with a more persuadable one.
//!   * An inconclusive LLM pass (API error, unparseable verdict) blocks. Failing open on
//!     the oracle would let an attacker obtain acceptance by making the oracle unavailable.
//!
//! Protected paths escalate to a human unconditionally. Without that rule the first
//! malicious contribution adds its own key to the trust root and the system's autonomy
//! becomes its capture: every later forgery then verifies correctly. That is a logical
//! necessity, not caution.

const std = @import("std");

pub const Verdict = enum { no_objection, objection, inconclusive };

pub const Outcome = enum {
    /// Every proof holds and the oracle raised nothing. Machine-acceptable.
    accept,
    /// A proof failed. The contribution is not acceptable as it stands.
    reject,
    /// Proofs hold but this change cannot be self-accepted (protected path), or the
    /// oracle objected or could not answer.
    escalate_to_human,
};

pub const Facts = struct {
    /// Ed25519 signature over the Evidence Passport verified under a trusted key.
    attestation_verified: bool,
    /// The attested passport names exactly the PR head commit under review.
    attested_revision_matches_head: bool,
    /// Every required check on the head commit concluded success.
    required_checks_green: bool,
    /// GitHub reports the PR as mergeable against its base.
    mergeable: bool,
    /// The PR is not a draft.
    ready_for_review: bool,
    /// The diff touches the trust root, a gate script, a workflow, CODEOWNERS, or an
    /// upstream-owned suite.
    touches_protected_path: bool,
    /// The judgement pass.
    llm_verdict: Verdict,
};

pub const Decision = struct {
    outcome: Outcome,
    /// Machine-readable reason, stable enough to assert on in tests and to key alerts off.
    reason: []const u8,
};

pub fn decide(facts: Facts) Decision {
    // 1. Proofs first. Any failure is a rejection, and the oracle's opinion is irrelevant:
    //    a model saying a change looks fine cannot substitute for a signature.
    if (!facts.attestation_verified)
        return .{ .outcome = .reject, .reason = "evidence-passport-attestation-not-verified" };
    if (!facts.attested_revision_matches_head)
        return .{ .outcome = .reject, .reason = "attested-revision-does-not-match-head" };
    if (!facts.required_checks_green)
        return .{ .outcome = .reject, .reason = "required-checks-not-green" };
    if (!facts.mergeable)
        return .{ .outcome = .reject, .reason = "not-mergeable-against-base" };
    if (!facts.ready_for_review)
        return .{ .outcome = .reject, .reason = "pull-request-is-a-draft" };

    // 2. Self-acceptance of the controls themselves is never available, however clean the
    //    proofs and however satisfied the oracle.
    if (facts.touches_protected_path)
        return .{ .outcome = .escalate_to_human, .reason = "touches-protected-path-human-review-required" };

    // 3. The oracle may only withhold.
    return switch (facts.llm_verdict) {
        .objection => .{ .outcome = .escalate_to_human, .reason = "semantic-review-raised-an-objection" },
        .inconclusive => .{ .outcome = .escalate_to_human, .reason = "semantic-review-inconclusive-failing-closed" },
        .no_objection => .{ .outcome = .accept, .reason = "all-proofs-hold-and-no-objection-raised" },
    };
}

/// Paths whose modification can disable a gate or widen the trust root.
pub fn isProtectedPath(path: []const u8) bool {
    const exact = [_][]const u8{
        "config/trusted-keys.json",
        "config/reference-attestation-key.pem",
        "config/validation.yml",
        ".github/CODEOWNERS",
        "scripts/attest-lib.ts",
        "scripts/attest.ts",
        "scripts/verify-attestation.ts",
        "scripts/secret-scan.ts",
        "scripts/workflow-guard.ts",
        "scripts/qualify.ts",
        "scripts/evidence-key-lib.ts",
        "docs/security-model.md",
    };
    for (exact) |p| {
        if (std.mem.eql(u8, p, path)) return true;
    }

    const prefixes = [_][]const u8{
        ".github/workflows/",
        "scripts/hooks/",
        "tests/",
        "docs/spec/",
        "tools/facop-review/",
    };
    for (prefixes) |p| {
        if (std.mem.startsWith(u8, path, p)) return true;
    }
    return false;
}

const base_facts = Facts{
    .attestation_verified = true,
    .attested_revision_matches_head = true,
    .required_checks_green = true,
    .mergeable = true,
    .ready_for_review = true,
    .touches_protected_path = false,
    .llm_verdict = .no_objection,
};

test "a clean contribution with every proof holding is accepted without a human" {
    try std.testing.expectEqual(Outcome.accept, decide(base_facts).outcome);
}

test "a forged or missing attestation is rejected no matter what the oracle says" {
    var f = base_facts;
    f.attestation_verified = false;
    f.llm_verdict = .no_objection;
    try std.testing.expectEqual(Outcome.reject, decide(f).outcome);
}

test "a valid passport for another revision cannot be replayed onto this head" {
    var f = base_facts;
    f.attested_revision_matches_head = false;
    try std.testing.expectEqual(Outcome.reject, decide(f).outcome);
}

test "the oracle cannot grant acceptance when a proof fails" {
    var f = base_facts;
    f.required_checks_green = false;
    try std.testing.expectEqual(Outcome.reject, decide(f).outcome);
}

test "the oracle can withhold acceptance when every proof holds" {
    var f = base_facts;
    f.llm_verdict = .objection;
    try std.testing.expectEqual(Outcome.escalate_to_human, decide(f).outcome);
}

test "an unavailable oracle fails closed rather than open" {
    var f = base_facts;
    f.llm_verdict = .inconclusive;
    try std.testing.expectEqual(Outcome.escalate_to_human, decide(f).outcome);
}

test "a change to the trust root is never self-accepted" {
    var f = base_facts;
    f.touches_protected_path = true;
    try std.testing.expectEqual(Outcome.escalate_to_human, decide(f).outcome);
}

test "protected path classification covers the trust root and every gate" {
    try std.testing.expect(isProtectedPath("config/trusted-keys.json"));
    try std.testing.expect(isProtectedPath("scripts/secret-scan.ts"));
    try std.testing.expect(isProtectedPath(".github/workflows/facop-dev.yml"));
    try std.testing.expect(isProtectedPath("tests/integration/security-controls.test.ts"));
    try std.testing.expect(isProtectedPath("tools/facop-review/src/policy.zig"));
    try std.testing.expect(!isProtectedPath("examples/ecommerce/src/domain.ts"));
    try std.testing.expect(!isProtectedPath("README.md"));
}
