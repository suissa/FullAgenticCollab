//! Minimal HTTP helpers for the GitHub and Anthropic APIs.

const std = @import("std");
const Io = std.Io;

pub const Response = struct {
    status: std.http.Status,
    body: []u8,
};

pub fn request(
    gpa: std.mem.Allocator,
    io: Io,
    method: std.http.Method,
    url: []const u8,
    headers: []const std.http.Header,
    payload: ?[]const u8,
) !Response {
    var client: std.http.Client = .{ .allocator = gpa, .io = io };
    defer client.deinit();

    var body: Io.Writer.Allocating = .init(gpa);
    errdefer body.deinit();

    const result = try client.fetch(.{
        .location = .{ .url = url },
        .method = method,
        .extra_headers = headers,
        .payload = payload,
        .response_writer = &body.writer,
    });

    return .{ .status = result.status, .body = try body.toOwnedSlice() };
}

pub fn get(
    gpa: std.mem.Allocator,
    io: Io,
    url: []const u8,
    headers: []const std.http.Header,
) !Response {
    return request(gpa, io, .GET, url, headers, null);
}

pub fn postJson(
    gpa: std.mem.Allocator,
    io: Io,
    url: []const u8,
    headers: []const std.http.Header,
    payload: []const u8,
) !Response {
    return request(gpa, io, .POST, url, headers, payload);
}
