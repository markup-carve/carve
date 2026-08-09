# Include security conformance

This is the processor-neutral executable contract for the security requirements
already normative in PART 9 section 19. It is deliberately separate from the
broader include-language suite in draft PR #291.

The vectors cover only observable security decisions: resolver activation,
canonical filesystem containment, remote-fetch attempts, graph depth, charged
bytes, and resolver calls after budget exhaustion. They do not specify rendered
or formatted output, warning wording, section selection, heading shifts,
collision handling, dependency ordering, or fallback text.

## Adapter contract

Each implementation reads `vectors.json` and handles every `kind`:

- `activation`: run the source in the stated mode and record resolver calls.
- `filesystem`: materialize `tree` in a temporary directory, then resolve
  `request` from `from` under `root`. An object with a `symlink` member denotes
  a symlink whose target is relative to the temporary tree. `<ABS:path>` denotes
  that temporary tree's absolute path to `path`.
- `remote`: pass `request` through the real include-resolution path and record
  network fetch attempts. An allowlist permits fetching; it does not require a
  processor to implement remote includes, so `unsupported` is conformant.
- `graph`: walk `entry` and `files` through the real include processor with the
  stated limits, recording resolver calls, maximum visited depth and bytes.

`<ROOT>` in an expected canonical id denotes the materialized project root.
Denial values are portable classes, not required diagnostic strings. Unknown
kinds, requirements, or expected fields must fail an adapter. Every adapter
must also pin the corpus version and vector count so accidental omissions fail.
