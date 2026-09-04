//! DSSE envelope verification, byte-compatible with scripts/attest-lib.ts.
//!
//! This is the half of the acceptance decision that is a proof rather than a judgement:
//! either the Ed25519 signature over the exact passport bytes verifies under a key the
//! upstream plane already trusts, or it does not. Nothing here consults a model.

const std = @import("std");
const Ed25519 = std.crypto.sign.Ed25519;

pub const payload_type = "application/vnd.facop.evidence-passport+json";

pub const Error = error{
    UnexpectedPayloadType,
    NoSignatures,
    NoTrustedSignature,
    KeyRevoked,
    KeyExpired,
    KeyNotAuthorizedForProfile,
    BadSignature,
    MalformedKey,
    MalformedEnvelope,
};

pub const Verified = struct {
    keyid: []const u8,
    trust_class: []const u8,
    /// The exact bytes that were signed. Callers parse this, never the untrusted file.
    payload: []const u8,
};

/// DSSE Pre-Authentication Encoding. Binds the payload type into the signed bytes so a
/// signature over one document type can never be replayed as another.
/// Caller owns the returned slice.
pub fn pae(allocator: std.mem.Allocator, ptype: []const u8, payload: []const u8) ![]u8 {
    return std.fmt.allocPrint(allocator, "DSSEv1 {d} {s} {d} {s}", .{
        ptype.len, ptype, payload.len, payload,
    });
}

/// Extracts the 32-byte Ed25519 public key from a PEM-encoded SPKI document.
/// An Ed25519 SPKI is a fixed 44-byte DER structure whose last 32 bytes are the raw key,
/// so no general DER parser is needed.
pub fn ed25519FromSpkiPem(allocator: std.mem.Allocator, pem: []const u8) ![32]u8 {
    const begin = "-----BEGIN PUBLIC KEY-----";
    const end = "-----END PUBLIC KEY-----";
    const start_idx = (std.mem.indexOf(u8, pem, begin) orelse return Error.MalformedKey) + begin.len;
    const end_idx = std.mem.indexOfPos(u8, pem, start_idx, end) orelse return Error.MalformedKey;

    var body = std.ArrayList(u8).init(allocator);
    defer body.deinit();
    for (pem[start_idx..end_idx]) |c| {
        if (c == '\n' or c == '\r' or c == ' ' or c == '\t') continue;
        try body.append(c);
    }

    const decoder = std.base64.standard.Decoder;
    const len = decoder.calcSizeForSlice(body.items) catch return Error.MalformedKey;
    if (len != 44) return Error.MalformedKey;
    var der: [44]u8 = undefined;
    decoder.decode(&der, body.items) catch return Error.MalformedKey;

    var key: [32]u8 = undefined;
    @memcpy(&key, der[12..44]);
    return key;
}

pub const TrustedKey = struct {
    keyid: []const u8,
    public_key_pem: []const u8,
    trust_class: []const u8,
    profiles: []const []const u8,
    /// RFC3339; empty means no expiry.
    not_after: []const u8,
    revoked: bool,

    fn authorizedFor(self: TrustedKey, profile: []const u8) bool {
        for (self.profiles) |p| {
            if (std.mem.eql(u8, p, profile)) return true;
        }
        return false;
    }
};

/// Parses config/trusted-keys.json. The returned keys borrow from `parsed`, which the
/// caller must keep alive.
pub fn parseTrustedKeys(
    allocator: std.mem.Allocator,
    parsed: std.json.Value,
) ![]TrustedKey {
    const keys_val = parsed.object.get("keys") orelse return Error.MalformedKey;
    var out = std.ArrayList(TrustedKey).init(allocator);
    errdefer out.deinit();

    for (keys_val.array.items) |item| {
        const obj = item.object;
        var profiles = std.ArrayList([]const u8).init(allocator);
        if (obj.get("profiles")) |p| {
            for (p.array.items) |entry| try profiles.append(entry.string);
        }
        try out.append(.{
            .keyid = (obj.get("keyid") orelse return Error.MalformedKey).string,
            .public_key_pem = (obj.get("publicKey") orelse return Error.MalformedKey).string,
            .trust_class = if (obj.get("trust_class")) |t| t.string else "unknown",
            .profiles = try profiles.toOwnedSlice(),
            .not_after = blk: {
                const v = obj.get("not_after") orelse break :blk "";
                break :blk switch (v) {
                    .string => |s| s,
                    else => "",
                };
            },
            .revoked = blk: {
                const v = obj.get("revoked") orelse break :blk false;
                break :blk switch (v) {
                    .bool => |b| b,
                    else => false,
                };
            },
        });
    }
    return out.toOwnedSlice();
}

/// Verifies an envelope for a given profile. Fails closed on every ambiguity.
/// `now_rfc3339` is compared lexicographically against `not_after`, which is valid for
/// RFC3339 timestamps normalized to UTC with a trailing Z.
pub fn verify(
    allocator: std.mem.Allocator,
    envelope: std.json.Value,
    profile: []const u8,
    keys: []const TrustedKey,
    now_rfc3339: []const u8,
) !Verified {
    const obj = switch (envelope) {
        .object => |o| o,
        else => return Error.MalformedEnvelope,
    };

    const ptype = (obj.get("payloadType") orelse return Error.MalformedEnvelope).string;
    if (!std.mem.eql(u8, ptype, payload_type)) return Error.UnexpectedPayloadType;

    const payload_b64 = (obj.get("payload") orelse return Error.MalformedEnvelope).string;
    const signatures = switch (obj.get("signatures") orelse return Error.NoSignatures) {
        .array => |a| a,
        else => return Error.MalformedEnvelope,
    };
    if (signatures.items.len == 0) return Error.NoSignatures;

    const decoder = std.base64.standard.Decoder;
    const payload_len = decoder.calcSizeForSlice(payload_b64) catch return Error.MalformedEnvelope;
    const payload = try allocator.alloc(u8, payload_len);
    decoder.decode(payload, payload_b64) catch return Error.MalformedEnvelope;

    const signed = try pae(allocator, ptype, payload);
    defer allocator.free(signed);

    for (signatures.items) |sig_val| {
        const sig_obj = sig_val.object;
        const keyid = (sig_obj.get("keyid") orelse continue).string;
        const sig_b64 = (sig_obj.get("sig") orelse continue).string;

        const key = for (keys) |k| {
            if (std.mem.eql(u8, k.keyid, keyid)) break k;
        } else continue; // unknown key: not an error yet, another signature may be trusted

        if (key.revoked) return Error.KeyRevoked;
        if (key.not_after.len != 0 and std.mem.order(u8, key.not_after, now_rfc3339) == .lt) {
            return Error.KeyExpired;
        }
        if (!key.authorizedFor(profile)) return Error.KeyNotAuthorizedForProfile;

        const sig_len = decoder.calcSizeForSlice(sig_b64) catch return Error.BadSignature;
        if (sig_len != 64) return Error.BadSignature;
        var sig_bytes: [64]u8 = undefined;
        decoder.decode(&sig_bytes, sig_b64) catch return Error.BadSignature;

        const pk_bytes = try ed25519FromSpkiPem(allocator, key.public_key_pem);
        const pk = Ed25519.PublicKey.fromBytes(pk_bytes) catch return Error.MalformedKey;
        const sig = Ed25519.Signature.fromBytes(sig_bytes);
        sig.verify(signed, pk) catch return Error.BadSignature;

        return .{ .keyid = key.keyid, .trust_class = key.trust_class, .payload = payload };
    }

    return Error.NoTrustedSignature;
}

test "pae matches the TypeScript signer byte for byte" {
    const allocator = std.testing.allocator;
    const encoded = try pae(allocator, "t", "hi");
    defer allocator.free(encoded);
    try std.testing.expectEqualStrings("DSSEv1 1 t 2 hi", encoded);
}

test "spki pem yields the raw 32-byte key" {
    const allocator = std.testing.allocator;
    const pem =
        \\-----BEGIN PUBLIC KEY-----
        \\MCowBQYDK2VwAyEAzny/kyreE8SHx/PgU9WVyzeT4hdl/13NyfniZAeee4c=
        \\-----END PUBLIC KEY-----
    ;
    const key = try ed25519FromSpkiPem(allocator, pem);
    try std.testing.expectEqual(@as(usize, 32), key.len);
    // First byte of the raw key follows the 12-byte Ed25519 SPKI prefix.
    try std.testing.expectEqual(@as(u8, 0xce), key[0]);
}
