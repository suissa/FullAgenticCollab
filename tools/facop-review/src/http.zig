//! Minimal HTTP helpers for the GitHub and Anthropic APIs.

const std = @import("std");

pub const Response = struct {
    status: std.http.Status,
    body: []u8,

    pub fn deinit(self: *Response, allocator: std.mem.Allocator) void {
        allocator.free(self.body);
    }
};

const max_body = 16 * 1024 * 1024;

pub fn request(
    allocator: std.mem.Allocator,
    method: std.http.Method,
    url: []const u8,
    headers: []const std.http.Header,
    payload: ?[]const u8,
) !Response {
    var client = std.http.Client{ .allocator = allocator };
    defer client.deinit();

    var body = std.ArrayList(u8).init(allocator);
    errdefer body.deinit();

    const result = try client.fetch(.{
        .location = .{ .url = url },
        .method = method,
        .extra_headers = headers,
        .payload = payload,
        .response_storage = .{ .dynamic = &body },
        .max_append_size = max_body,
    });

    return .{ .status = result.status, .body = try body.toOwnedSlice() };
}

pub fn get(
    allocator: std.mem.Allocator,
    url: []const u8,
    headers: []const std.http.Header,
) !Response {
    return request(allocator, .GET, url, headers, null);
}

pub fn postJson(
    allocator: std.mem.Allocator,
    url: []const u8,
    headers: []const std.http.Header,
    payload: []const u8,
) !Response {
    return request(allocator, .POST, url, headers, payload);
}
