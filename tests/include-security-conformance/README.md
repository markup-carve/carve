# Include security conformance

This is the processor-neutral executable contract for the security requirements
already normative in PART 9 section 19. It is deliberately separate from the
broader include-language suite in draft PR #291.

The vectors cover only observable security decisions: resolver activation,
canonical filesystem containment, remote-fetch attempts, graph depth, charged
bytes, the bound on resolver invocations, and resolver calls after either total
is exhausted. They do not specify rendered or formatted output, warning
wording, section selection, heading shifts, collision handling, dependency
ordering, or fallback text.

"Left literal with a Warning" is therefore observed as `status: denied` plus the
portable `denial` class, never as warning text: a refusal class and the absence
of a resolver call are the two observables, and both are portable.

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
  stated limits (`maxDepth`, `maxBytes`, `maxResolverCalls`), recording resolver
  calls, maximum visited depth and bytes. A target NOT present in `files` does
  not resolve: it still counts one resolver call and charges ZERO bytes, which
  is why the byte budget cannot stand in for the call bound. A limit the vector
  omits is the adapter's own default, which must be at least as generous as the
  §19 recommendation.

`<ROOT>` in an expected canonical id denotes the materialized project root.
Denial values are portable classes, not required diagnostic strings. Unknown
kinds, requirements, or expected fields must fail an adapter. Every adapter
must also pin the corpus version and vector count so accidental omissions fail.

## Corpus ahead of the engines

Adding a vector makes every adapter answer it, so a vector can land before an
engine implements the requirement it pins. As with `resources/engine-pin-drift.txt`
and `resources/converter-drift.txt`, that window is DECLARED rather than
tolerated - an engine's red is expected and tracked, not discovered.

- `S7-call-bound`, `S8-post-call-bound-no-read` (carve#1990). The §19 bound on
  resolver invocations per render. Known to be implemented by carve-lsp
  (markup-carve/carve-lsp#191). Every other engine is expected to fail
  `call-bound-on-unresolvable-targets` and
  `call-bound-exhaustion-skips-later-resolver` until its own ticket lands; the
  new `maxResolverCalls` limit and the `resolver-calls` denial class also have
  to reach each adapter. Delete this entry when the last engine ships the bound.
