# Include security conformance

This is the processor-neutral executable contract for the security requirements
already normative in PART 9 section 19. It is deliberately separate from the
broader include-language suite in draft PR #291.

The vectors cover only observable security decisions: resolver activation,
where the containment root comes from, canonical filesystem containment,
remote-fetch attempts, graph depth, charged bytes, the bound on resolver
invocations, and resolver calls after either total is exhausted. They do not
specify rendered or formatted output, warning wording, section selection,
heading shifts, collision handling, dependency ordering, or fallback text.

"Left literal with a Warning" is therefore observed as `status: denied` plus the
portable `denial` class, never as warning text: a refusal class and the absence
of a resolver call are the two observables, and both are portable.

One class is deliberately NOT a security decision. `not-found` is the CONTROL
that makes the others falsifiable: with only refusals in the corpus, a resolver
answering `outside-root` for every failure passed every vector, so the
containment class could not be told apart from "deny everything" (carve#1994).
It spells the section 19 Errors row "Unreadable / missing path", whose ruled
outcome - left literal with a Warning - is the same `status: denied`.

The class is the RESOLVER's, not the author's. Section 19 has one Errors row
for a refusal and a miss alike, and the include-conformance canonical rule set
has no id for a refusal, so the cross-engine warning stays `include-unresolved`
for both (see that suite's README). A host MAY publish a finer diagnostic of
its own - markup-carve/carve-lsp#193 does - as long as the shared rule id does
not move.

`no-root` is the class for a configured value that does not name a root at
all. Every other vector hands the adapter a root that is already a real
absolute directory, so the corpus could only ever ask whether containment holds
GIVEN a good root; the step where a bad configured value becomes a good-looking
root sat upstream of every vector (carve#2003). Section 19's Containment root
section rules that step already - a host **MUST** supply the root explicitly,
and the root **MUST NOT** default to the process working directory - so the
class pins existing normative text rather than adding any.

A blank spec is the one spelling that text settles on its own: an empty string
is not a pathname, and every canonicalizer that accepts one anyway answers with
the process working directory, which is the value the section forbids. What a
spec that is neither blank nor absolute means is NOT pinned here and is not
ruled anywhere: see carve#2004.

What is still NOT pinned is whether the class may vary with the target's
EXISTENCE. A resolver that checks existence before containment reports a miss
for an absent out-of-root target and a containment denial for a present one,
and passes every vector here. Whether the two must be indistinguishable is
unruled: carve#1999.

## Adapter contract

Each implementation reads `vectors.json` and handles every `kind`:

- `activation`: run the source in the stated mode and record resolver calls.
- `filesystem`: materialize `tree` in a temporary directory, then resolve
  `request` from `from` under the root. An object with a `symlink` member denotes
  a symlink whose target is relative to the temporary tree. `<ABS:path>` denotes
  that temporary tree's absolute path to `path`, in `rootSpec` as well as in
  `request`.

  A vector names the root exactly one way, and the schema refuses both at once:

  - `root` is a path the ADAPTER materializes and canonicalizes before handing
    it over. Containment is then the only question.
  - `rootSpec` is the value the HOST was configured with, passed through the
    implementation's own root-configuration seam UNCHANGED. The assertion is
    about what that seam materializes it to - a root, with resolution
    continuing against it, or no root at all, which is `denial: no-root` with
    an empty `resolverCalls`. A spec must never be pre-canonicalized by the
    adapter, because the canonicalization is the behavior under test.
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
  resolver invocations per render. Measured through each engine's own source on
  2026-09-14: carve-js, carve-php, carve-rs and carve-lsp ALL enforce the bound
  already, each with the recommended default of 1000. The window is therefore
  entirely on the ADAPTER side, which is why the vectors could sit unwritten
  this long - no engine had to change for them to pass, and no adapter asked.
  An adapter that does not pass `maxResolverCalls` through runs the vector under
  its engine default of 1000, records every call, and goes red. carve-rs
  (`tests/include_security_conformance.rs`) and carve-lsp
  (`src/include-security-conformance.test.ts`) have adapters and must grow the
  limit, the `resolver-calls` denial class and the two requirement ids; carve-lsp
  additionally pins the vector count. carve-php grew an adapter of its own in
  carve-php#1954 and reads the limit; carve-js implements includes and still
  carries no security adapter. Delete this entry when the last adapter reads the
  limit.
- `not-found` (carve#1994). Two `S2-contained-paths` vectors pin that a target
  which canonicalizes INSIDE the root but is absent is refused as a miss, not as
  a containment denial. Adapter side again: carve-lsp drives the `filesystem`
  kinds through its real resolver, whose denial set already carries `not-found`
  (carve-lsp#193), so only its vector-count pin has to move. Delete this entry
  when every count pin reads 19, which is the count as of the entry below.
- `S9-root-configuration`, `rootSpec`, `no-root` (carve#2003). Where the
  containment root comes from. This window is NOT adapter-only, which is what
  separates it from the two entries above. Measured on 2026-09-15 against each
  engine's pushed `main`, through the constructor each one exposes for the
  configured value:
  - carve-js `fileSystemResolver(root)` runs `realpathSync(root)` with no
    validation. `realpathSync("")` returns the process working directory, so a
    blank configured value roots containment there - the default section 19
    forbids by name.
  - carve-php `new FilesystemIncludeResolver($root)` guards with
    `realpath($root) === false || !is_dir(...)`, and that guard does not catch a
    blank value: `realpath('')` also answers with the process working directory
    and `is_dir` accepts it.
  - carve-rs `FileSystemResolver::new(root)` returns `Err` from
    `std::fs::canonicalize("")`, so it refuses - correctly, and without the
    requirement being stated anywhere it could be gated.
  - carve-lsp validates the configured value in the server (carve-lsp#195).

  Two engines therefore go red on `blank-root-spec-configures-no-root` on the
  merits, not only for want of an adapter, and each needs a ticket. Every
  adapter additionally has to read `rootSpec` and the `no-root` class, and pass
  the spec through unchanged.

  All three adapters now pin a count, and this addition moves all three. Read
  from each repo's pushed `main` on 2026-09-15, hours after the last two landed:
  carve-lsp pins version, count 14, the requirement set and every member read;
  carve-php pins the same four (carve-php#1954); carve-rs pins version, total
  count 14, the `graph` count 6 and the driven count (carve-rs#1598). Each is
  already two behind #2001 and is five behind after this, and the
  member-and-requirement pins fail closed on `rootSpec` and `S9` besides. That
  is the gate working rather than a defect here, so no vector was shrunk to keep
  a downstream count green; a ticket per repo follows this merge. Delete this
  entry when the last engine refuses a blank spec and the last adapter reads
  `rootSpec`.
