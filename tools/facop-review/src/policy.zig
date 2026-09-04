//! The acceptance policy: which facts, combined how, produce a decision.
//!
//! Only deterministic facts can grant acceptance. An LLM semantic pass may withhold but never
//! grant. Protected paths — including the Validated Reason gates that decide whether a
//! contributor's test proves a problem — always escalate to a human.

const std = @import("std");

pub const Verdict = enum { no_objection, objection, inconclusive };

pub const Outcome = enum {
    accept,
    reject,
    escalate_to_human,
};

pub const Facts = struct {
    attestation_verified: bool,
    attested_revision_matches_head: bool,
    required_checks_green: bool,
    mergeable: bool,
    ready_for_review: bool,
    touches_protected_path: bool,
    llm_verdict: Verdict,
};

pub const Decision = struct {
    outcome: Outcome,
    reason: []const u8,
};

pub fn decide(facts: Facts) Decision {
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

    if (facts.touches_protected_path)
        return .{ .outcome = .escalate_to_human, .reason = "touches-protected-path-human-review-required" };

    return switch (facts.llm_verdict) {
        .objection => .{ .outcome = .escalate_to_human, .reason = "semantic-review-raised-an-objection" },
        .inconclusive => .{ .outcome = .escalate_to_human, .reason = "semantic-review-inconclusive-failing-closed" },
        .no_objection => .{ .outcome = .accept, .reason = "all-proofs-hold-and-no-objection-raised" },
    };
}

/// Paths whose modification can disable a gate, widen the trust root, redefine acceptance,
/// or change how contributor-controlled executable reproductions become trusted evidence.
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
        "scripts/contribution-guard.ts",
        "scripts/validated-reason-lib.ts",
        "scripts/validated-reason-gate.ts",
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

test "protected path classification covers trust root and Validated Reason gates" {
    try std.testing.expect(isProtectedPath("config/trusted-keys.json"));
    try std.testing.expect(isProtectedPath("scripts/secret-scan.ts"));
    try std.testing.expect(isProtectedPath("scripts/contribution-guard.ts"));
    try std.testing.expect(isProtectedPath("scripts/validated-reason-gate.ts"));
    try std.testing.expect(isProtectedPath(".github/workflows/facop-tests.yml"));
    try std.testing.expect(isProtectedPath("tests/integration/validated-reason.test.ts"));
    try std.testing.expect(isProtectedPath("tools/facop-review/src/policy.zig"));
    try std.testing.expect(!isProtectedPath("examples/ecommerce/src/domain.ts"));
    try std.testing.expect(!isProtectedPath("README.md"));
}
