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
spec that is neither blank nor absolute means is ruled too, and pinned: a root
spec that is not ABSOLUTE is refused (carve#2004), because a relative one has
no base the section names and every canonicalizer resolves it against the
process working directory. The test is absoluteness, not emptiness after
trimming: `relative-root-spec-configures-no-root` uses `.`, which no
trim-and-compare refuses, and `whitespace-root-spec-configures-no-root` rides
on the same rule because `"   "` is a legal POSIX directory name that is merely
relative - such a directory stays reachable by its absolute path.

Whether the class may vary with the target's EXISTENCE is ruled, and pinned.
A refusal MUST NOT depend on whether the target exists (carve#1999): containment
is decided on the canonical candidate, which is constructible for a missing path
too, so a resolver can always answer from the spelling plus the root. The paired
`out-of-root-present-target-is-outside-root` /
`out-of-root-absent-target-is-outside-root` vectors differ only in whether the
out-of-root target is on disk and expect the same class from both. A resolver
that checks existence before containment reports a miss for the absent one, which
is an existence oracle for paths outside the root; before the pair it passed every
vector here.

The same ruling reaches an escape routed through an intermediate directory that
is ABSENT, and that route is pinned separately because a resolver can get the
first pair right and still lose it (carve#2021). Once the whole path no longer
canonicalizes, containment falls to the canonical candidate, and the remainder
re-appended to the canonicalized prefix must have its dot-dot segments
COLLAPSED. Re-appending it verbatim leaves a string that is lexically inside the
root and fails the existence check instead, so the escape is reported
`not-found`. Nothing outside the root is read - POSIX resolution stops at the
absent segment - but the class now moves with whether an intermediate directory
happens to exist, which is the oracle the ruling closed, reached from the other
side. The `out-of-root-through-present-directory-is-outside-root` /
`out-of-root-through-absent-directory-is-outside-root` pair states it.

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

### Which side of the seam an observable comes from

Every observable belongs to one side of the seam between the adapter and the
implementation, and `schema.json` says which on each one as `x-seam`. The
corpus test pins that map whole, so an observable added without a side - or
with a side that moves - fails here.

- **`x-seam: "processor"`** - `status`, `denial`, `canonicalId`,
  `maxVisitedDepth`, `chargedBytes`. The implementation's own answer, published
  by it and reported UNCHANGED. An adapter MUST NOT reconstruct one from
  anything it holds itself, even when it could compute a believable value.
- **`x-seam: "adapter"`** - `resolverCalls`, `remoteFetches`. What the adapter
  records at the seam it supplies, and it MUST NOT be derived from the
  implementation's output: a call that did not happen is observed as its
  absence, which is the whole of `budget-exhaustion-skips-later-resolver`.

Expanding the corpus's own notation is not a reconstruction. `<ABS:>` and
`<ROOT>` are the corpus spelling out its temporary tree, the same carve-out
`rootSpec` already carries.

The rule generalizes a defect that was found separately (carve#2022). All three
engines answered `chargedBytes` differently and none of them from the same
place: carve-js summed the sources its own recording resolver had handed back,
which is a plausible tally and is not the engine's - the vectors read 12 / 12 / 5
while the engine charged 7, 8 and 0, and that suite passed whole. carve-php
computed it correctly, and carve-rs declined to compare it at all, stating that
`IncludeResult` published no counter - so those rows passed because the
observable had been declared unreadable. Three adapters, three answers, and
nothing said where the number was supposed to come from. The same reach is open
on every other processor-side observable: `canonicalId` is one `realpath` away
from the request, and `maxVisitedDepth` is derivable from `resolverCalls` by
modeling the graph.

**A vector cannot gate this, and the corpus does not pretend to.** Measured on
the reference adapter: an adapter that sums its own resolver's returns passes
all 23 vectors while the implementation is conformant, because a correct
implementation charges exactly what the resolver handed over. The two readings
separate only when the implementation is WRONG, which is precisely when the
corpus is being relied on. The sides are therefore an adapter contract stated
here and gated in `schema.json`, not a row anyone can add. Every adapter reads
the implementation's own total today - carve-js `result.chargedBytes`
(markup-carve/carve-js#1704), carve-php `$expander->chargedBytes()` (markup-carve/carve-php#1965),
carve-rs `IncludeResult::charged_bytes` (markup-carve/carve-rs#1609), carve-lsp
`result.bytes` - so no window is open on it.

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
  when every count pin reads the current count.
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

- The out-of-root existence pair (carve#1999). Adapter side only: the pair adds
  no requirement id, no kind and no denial class, so an adapter that already
  reads `S2-contained-paths` and `outside-root` answers both vectors with the
  code it has. What moves is every count pin - carve-lsp (version, count,
  requirement set, member reads), carve-php (the same four, carve-php#1954) and
  carve-rs (version, total count, the `graph` count, the driven count,
  carve-rs#1598). Those pins fail closed by design, so no vector was shrunk to
  keep a downstream count green. Delete this entry when the last count pin is
  current.

- `relative-root-spec-configures-no-root`,
  `whitespace-root-spec-configures-no-root` (carve#2004). A root spec that is
  not absolute is refused. Adapter-side for the two vectors themselves - no
  requirement id, kind or class was added, the pair sits on `S9-root-configuration`
  and `no-root` - but NOT adapter-only on the merits. Measured on 2026-09-15
  against each engine's pushed `main`:
  - carve-js `fileSystemResolver(root)` refuses a blank and a whitespace-only
    value (`root.trim() === ''`, carve-js#1690) and then runs `realpathSync(root)`,
    so a relative spec still roots containment at the process working directory.
  - carve-php `FilesystemIncludeResolver::__construct` refuses the same two
    (`trim($root) === ''`, carve-php#1957) and then calls `realpath($root)`, with
    the same consequence.
  - carve-rs `FileSystemResolver::new` is `std::fs::canonicalize(root)?` with no
    guard at all. It refuses `""` only because that call errors, and accepts a
    whitespace-only or relative spec wherever the named directory exists.
  - carve-lsp validates the configured value in the server and already refuses a
    non-absolute spec (carve-lsp#195), which is the implementation this ruling
    follows.

  A ticket per non-conformant engine follows this merge. Every count pin moves
  again; no vector was shrunk to keep one green. Delete this entry when the last
  engine refuses a non-absolute spec and the last adapter reads `rootSpec`.

- The out-of-root ABSENT-DIRECTORY pair (carve#2021). No requirement id, kind or
  denial class was added - the pair sits on `S2-contained-paths` and
  `outside-root` - so every adapter answers it with the code it has, and what
  moves is the count pins: carve-js 23, carve-php 23 and carve-rs 23 (its
  `graph` and root-spec sub-counts are unchanged, both new vectors being
  `filesystem`), and carve-lsp, which is separately still at 19. Those pins fail
  closed by design; no vector was shrunk to keep one green, and a ticket per repo
  follows this merge.

  What the pair gates per engine, measured on 2026-09-15 against each repo's
  pushed `main`, is uneven, and two of the four answer it VACUOUSLY:
  - carve-php `FilesystemIncludeResolver::canonicalCandidate` walks to the
    longest existing prefix and re-appends through `reappend`, which collapses
    the dot-dot segments. This is the engine that found the gap, and the pair
    gates that collapse directly.
  - carve-lsp `fileSystemResolver` answers from `path.resolve`, which collapses
    before any syscall, and `missingCandidate` collapses again through
    `path.join`. Genuinely green.
  - carve-js `fileSystemResolver` also collapses in `path.resolve`, so the
    defect's shape cannot arise there - but its resolver refuses everything with
    `null` and publishes no class, so the adapter recovers `denial` itself in
    `classifyRefusal`, whose first branch is an `existsSync` on the adapter's own
    `path.resolve` result. Both halves are answered without the engine being
    asked. Green, from the side of the seam the `x-seam` annotation now names as
    the wrong one (carve#2022).
  - carve-rs `FileSystemResolver::resolve` canonicalizes, which requires the
    target to exist, so a refusal and a miss are one answer. Its adapter declares
    `INDISTINGUISHABLE_FILESYSTEM_DENIALS` and compares `status` alone for those
    two classes, so both halves pass on `status: denied` and the class the pair
    exists to pin is never compared.

  So the pair is falsifiable - the reference adapter reds on exactly the absent
  half when the collapse is dropped - and today it gates one engine on the
  merits. Delete this entry when the last count pin is current and both
  remaining engines can answer the class from their own side.
