const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const exe = b.addExecutable(.{
        .name = "facop-review",
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    if (b.args) |args| run_cmd.addArgs(args);
    b.step("run", "Run facop-review").dependOn(&run_cmd.step);

    const tests = b.addTest(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    const policy_tests = b.addTest(.{
        .root_source_file = b.path("src/policy.zig"),
        .target = target,
        .optimize = optimize,
    });
    const dsse_tests = b.addTest(.{
        .root_source_file = b.path("src/dsse.zig"),
        .target = target,
        .optimize = optimize,
    });

    const test_step = b.step("test", "Run the acceptance-policy and DSSE tests");
    test_step.dependOn(&b.addRunArtifact(tests).step);
    test_step.dependOn(&b.addRunArtifact(policy_tests).step);
    test_step.dependOn(&b.addRunArtifact(dsse_tests).step);
}
