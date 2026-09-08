# FACoP Semantic Test Vectors

Each JSON file is a provider-independent semantic case. The validator checks the expected result and invariant using only the declared vector data.

- `problem-proof-valid.json`: base fails with the claimed identity.
- `solution-proof-valid.json`: unchanged reproduction passes on the candidate.
- `reproduction-mismatch.json`: control and treatment bytes differ.
- `solution-without-problem.json`: solution proof lacks a valid problem proof.
- `expired-evidence.json`: expired evidence cannot qualify.
- `transition-without-evidence.json`: lifecycle transition lacks authority.
- `contributor-as-candidate.json`: contributor patch is not an independent candidate.
