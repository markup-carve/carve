# Lint include-conformance vectors

Cross-engine vectors for CARVE-P6-001 I16: what `carve lint` reports when it
expands includes. Engines vendor this directory through their spec submodule
and run every vector through their lint API.

## Running a vector

1. Lint `entry` with includes enabled and `sourcePath` (from the top of
   `vectors.json`) as the identity of the top-level document. For
   `resolver: "virtual"` the resolver serves `files[path]` for the directive
   path as written and returns plain source, so a file's identity is that path.
   A path missing from `files` is unresolved. For `resolver: "none"` lint runs
   with no root and no resolver.
2. Normalize every finding the linter returns to
   `{ rule, file, line, column, includedBy? }`. A finding with no file of its
   own is in the top-level document and takes `sourcePath`. `includedBy` is the
   include chain, top-level directive first, each entry `{ file, line, column }`;
   leave it out for a top-level finding. Messages, offsets and ranges are not
   compared.
3. Sort by file, line, column and rule, and compare with `expected.findings`
   exactly.

Lines and columns are 1-based. Columns count codepoints, as the lint corpus
gate does.

## What the vectors pin

- the ticket's control: a malformed record in a `{table}` csv code include
  reports `delimited-table-malformed` at `data/plans.csv:3`, reached from
  `doc.crv:2` (`code-table-malformed-record`);
- payload findings in file coordinates under `@lines`, and no payload rule
  without `{table}`;
- Carve-mode includes linted with every rule, top-level findings unchanged;
- duplicates: a file included twice, a file reached through two parents, two
  region selections of one file, and a `@shift` that adds no range;
- `@lines` and `#section` selections reporting only their own lines;
- include errors at the directive: a cycle, a missing file, an invalid region,
  a selection conflict, a line range that starts past the end of the file and
  an option given twice;
- a region opener on line 1 of a file that starts with U+FEFF, in a Carve
  include and in a `{table}` code include;
- a mid-line directive reported at its own column, in the top-level document
  and in the include chain;
- no resolver, no expansion.

`tests/lint-include-conformance.test.mjs` checks the vectors against the schema
and a few invariants in `npm test`; it does not need an engine.
`tests/lint-include-conformance.proof.mjs` runs every vector through the
carve-js build named in `resources/include-reference-pin.txt`, in the CI job
that runs `npm run test:includes`.
