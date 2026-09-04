const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const exe = b.addExecutable(.{
        .name = "facop-review",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/main.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    if (b.args) |args| run_cmd.addArgs(args);
    b.step("run", "Run facop-review").dependOn(&run_cmd.step);

    const test_step = b.step("test", "Run the acceptance-policy and DSSE tests");
    for ([_][]const u8{ "src/main.zig", "src/policy.zig", "src/dsse.zig" }) |source| {
        const t = b.addTest(.{
            .root_module = b.createModule(.{
                .root_source_file = b.path(source),
                .target = target,
                .optimize = optimize,
            }),
        });
        test_step.dependOn(&b.addRunArtifact(t).step);
    }
}
