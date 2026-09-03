# Users.createUser

Creates an active user identity. The action rejects empty identifiers/names and duplicate IDs.

Example input: `{ id: "u1", name: "Ada" }`. Success emits `Users.createUser.Ok`; validation/runtime failures emit `Users.createUser.Error`.
