# Include-conformance suite

A cross-engine golden-vector corpus for Carve's file-inclusion feature
(PART 9 §19, rules I1–I14). Each vector is a self-contained JSON file describing
an in-memory (or on-disk) fixture plus four golden outputs. The vectors live
here in the spec repo and are **vendored by each engine** the same way the HTML
corpus (`tests/corpus/`) is, so carve-js, carve-php and carve-rs can all assert
the same include semantics against one source of truth.

- **Phase 1 (this suite):** the corpus + a carve-js proof runner
  (`tests/include-conformance.test.mjs`) proving the format round-trips and the
  goldens are self-consistent with the reference engine.
- **Phase 2:** carve-php and carve-rs vendor this directory and wire an
  equivalent runner into their own CI. They reimplement only a thin per-engine
  driver; the normalization contract below is the portable part they reproduce.

## Layout

```
tests/include-conformance/
  README.md          this file
  schema.json        JSON Schema for one vector
  manifest.json      generated rule-coverage map (rule -> [vector names], total)
  vectors/*.json     the golden vectors, one file per vector
scripts/
  include-conformance-vectors.mjs   authored vector INPUTS (generator source)
  include-conformance-lib.mjs       shared engine-driver + normalization
  gen-include-conformance.mjs       golden generator
tests/
  include-conformance.test.mjs      carve-js proof runner (node --test)
```

## Vector format

Each `vectors/<name>.json` validates against `schema.json`. It has **input
fields** (the fixture and options) and an **`expected`** block (the four
goldens).

### Input

| Field | Applies | Meaning |
|---|---|---|
| `name` | all | Unique id; also the file basename. |
| `description` | all | One-line summary of what the vector pins. |
| `rules` | all | The §19 rule ids exercised (`I1`…`I14`, `I9a`, plus the pseudo-rules `multi-directive`, `quoted-path`). |
| `mode` | all | `virtual` (in-memory files map) or `filesystem` (a real tmp tree). |
| `resolver` | all | `none` (no resolver → I3 literal), `virtual` (serve `files`), or `filesystem` (fileSystemResolver over the tree). |
| `entry` | virtual | The top-level document source. |
| `files` | virtual | Map of directive-path → source (the in-memory filesystem). |
| `tree` | filesystem | Files and symlinks to materialize under a fresh tmp base. A string is file content; `{ "symlink": "target" }` is a link (target relative to the base). |
| `entryPath` | filesystem | Which tree file is the top-level document. |
| `root` | filesystem | The containment root, relative to the tree base (`.` = the base itself). |
| `options` | all | See below. |
| `forbiddenSubstrings` | optional | Substrings that MUST NOT appear in any warning message (I7 no-leak). |
| `checkFmtExpandEquivalence` | optional | When true, the runner also asserts that expanding the **formatted** entry yields the same html + dependency set (I12 stronger invariant). |

`options` keys: `sourcePath` (warning attribution, I4), `maxDepth` /
`maxBytes` (I6 limit overrides), `allowAbsolute` (filesystem), `resolverIds`
(virtual resolver returns a canonical id stripped of a leading `./`, so two
spellings of one file collapse — I6/I11 identity), `resolverThrows` (virtual
resolver throws the given message, exercising the I7 no-leak path).

> **Entry convention.** The top-level document is a **source string** (`entry`)
> in virtual mode, and a **named tree file** (`entryPath`) in filesystem mode.
> It is never an index into `files` — the resolver serves `files`; the entry is
> passed to the engine separately, mirroring the real `expandIncludes(doc,
> source, opts)` API.

### `expected` — the four goldens

| Field | What it is |
|---|---|
| `html` | The expanded-then-rendered HTML. |
| `fmt` | The Carve serializer output of the **pre-expansion** document. This pins I12/I14: the directive must survive formatting. It is deliberately *not* the serialization of the expanded document. |
| `warnings` | Normalized warning list, in document order (see below). |
| `dependencies` | Normalized dependency set, in first-encounter order (I11). |

## Normalization (the cross-engine contract)

The three engines emit richer, partly host-dependent structures. The suite
normalizes them to a stable shape so a real divergence is a real failure, not a
spelling difference. If two engines genuinely disagree on a `rule` id or a
dependency `id`/order, that is a divergence the suite is meant to surface.

### Warnings → `{ rule, file? }`, ordered

- **`rule`** — the stable rule id, the cross-engine contract. The canonical set:
  `include-unresolved`, `include-non-text`, `include-cycle`, `include-depth`,
  `include-budget`, `include-selection-conflict`, `include-block-in-inline`,
  `include-section`, `include-heading-clamp`, `include-heading-id-rename`,
  `include-footnote-rename`, `include-unknown-option`.
- **`file`** — the attributed file (I4), present only when the engine attributes
  the warning. Portable as written in virtual mode; folded to the `<TMP>`
  sentinel in filesystem mode (see below).
- **Order** — the list preserves document order.
- **Deliberately dropped:** `message` (host-worded prose, not a contract);
  `detail` (the raw resolver error — I7 forbids surfacing it, and it is
  host-dependent); and source offsets (`line`/`column`/`start`/`end`). Offsets
  are **not** pinned as a §19 contract and are the field most likely to diverge;
  including them would manufacture false divergences. Attribution travels
  through `file`, which is stable.

The I7 **no-leak** requirement is pinned directly by `forbiddenSubstrings`:
the runner asserts the raw messages contain none of them, so a processor that
echoed a resolver's absolute path would fail regardless of wording.

### Dependencies → `{ id, resolved }`, first-encounter order

I11 makes the dependency set a hard cross-engine contract, so it is asserted
strictly:

- **`id`** — the resolver's canonical id, else the directive path as written.
  Virtual ids are portable strings. Filesystem ids that are absolute canonical
  paths are folded to `<TMP>/…` (see below); a **denied** target keeps the path
  as written (e.g. `../secret.crv`), which is already portable.
- **`resolved`** — whether the source was **read** (I11), *independent* of
  whether expansion later succeeded. A missing `#section` stays `resolved: true`
  (the file was read); a depth-exceeded target that was never reached is
  `resolved: false`.
- **Order** — first-encounter (document) order, de-duplicated. This ordering is
  the contract; the list is compared exactly.

### Path spelling

All paths use forward slashes. In filesystem vectors the whole materialized tree
base is folded to the sentinel **`<TMP>`**, so both in-root targets
(`<TMP>/root/ok.crv`) and deliberately out-of-root ones (`<TMP>/secret.crv`) are
stable across machines and engines. (Linux CI keeps `/` as the separator; a
Windows runner would additionally normalize `\` → `/`.)

## How goldens are generated / regenerated

The reference engine is **carve-js** on the `feat/include-directive` branch. The
generator runs each authored input through it (expand + render + fmt), fills
`expected`, and writes the JSON. It **fails loudly** if a vector throws, if a
`forbiddenSubstrings` guard leaks, or if a `checkFmtExpandEquivalence` property
does not hold — a broken vector is never baked into a golden.

```sh
# with carve-js checked out and built (npm run build) somewhere:
CARVE_JS=/path/to/carve-js npm run include:gen
```

`CARVE_JS` may point at a carve-js checkout root (expects `dist/index.js`) or
directly at an `index.js`. Without it, the generator/runner fall back to a
sibling `../carve-js/dist/index.js`, then to an installed `@markup-carve/carve`.

Regenerate after any **deliberate** carve-js behavior change, review the diff,
and commit the updated goldens.

## How to add a vector

1. Add an input object to `scripts/include-conformance-vectors.mjs` (`name`,
   `rules`, `mode`, `resolver`, the fixture, any `options`).
2. Run `npm run include:gen` to write `vectors/<name>.json` and refresh
   `manifest.json`.
3. Run `npm run test:includes` to confirm the proof runner is green.
4. Review the generated golden — it is the assertion, so read it.

## How to run the proof runner

```sh
CARVE_JS=/path/to/carve-js npm run test:includes
```

It is intentionally **not** part of `npm test`: the default suite pins the
engine-independent HTML corpus, whereas this runner depends on a built carve-js.
Phase 2 wires the per-engine runners into carve-js / carve-php / carve-rs CI.

## Rule coverage

Generated into `manifest.json`. Current totals (a vector may cover several
rules):

| Rule | Vectors | Rule | Vectors |
|---|---|---|---|
| I1 syntax / path-required | 13 | I8 heading shift + auto | 16 |
| I2 block vs inline | 4 | I9 verbatim protection | 5 |
| I3 resolution model | 2 | I9a recognition run | 3 |
| I4 fragment containment / attribution | 5 | I10 containment (filesystem) | 6 |
| I5 cross-file collisions | 4 | I11 dependency reporting | 11 |
| I6 limits (cycle/depth/budget) | 5 | I12 formatter preservation | 13 |
| I7 errors + no-leak | 4 | I13 no side effects | 7 |
| I14 one recognition set | 7 | multi-directive / quoted-path | 1 / 2 |

**90 vectors total.**

### What the virtual model cannot express

I10 canonical containment, symlink escape and absolute-path denial fundamentally
need a real filesystem — the virtual resolver does no canonicalization. Those
cases are **filesystem-mode** vectors (`i10-fs-*`) driven through a real tmp
tree and the `fileSystemResolver`.

Two resolver behaviors are **out of scope** for a document-level corpus and stay
as per-engine resolver unit tests: (1) **multi-level** `../../../` escapes — the
core parses the `/../` runs as emphasis, so such a directive never forms in
source; and (2) direct resolver calls with a fabricated context. Phase 2 engines
should keep those as native resolver unit tests. Everything reachable *through a
document directive* is covered here.
