# Stock.commitStock

Finalizes a successful sale by consuming quantity previously placed in `reserved`. Unlike `releaseStock`, committed units do not return to `available`; physical sellable inventory therefore decreases.

Example: `{available: 3, reserved: 2}` + commit 2 => `{available: 3, reserved: 0}`.
