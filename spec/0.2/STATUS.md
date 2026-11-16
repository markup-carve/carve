# Carve 0.2: status

**Freeze candidate 1.** The candidate is the text of `spec/0.2/` at the commit named below, on the branch `next2` of `markup-carve/carve`. It is not released and carries no tag. A frozen text changes only by a ruling recorded with its reason; a change to a frozen clause makes a freeze candidate 2.

Commit: `37e57932e007fe912234021ea5d699bab041e51c` (`37e57932`). The commit after it writes only this line.

Freeze candidate 1, revision 2: `3aba61c624bda75049c7055962bf1a6b9120a3a4` (`3aba61c6`), the rulings on O6, O7 and O8. The commit after it writes only this line.

## Documents

Clauses are the paragraphs that start with a clause id. Rules and exceptions are counted by one rubric for all documents (an atomic normative statement that decides the tree, the output, the source written, a refusal or a report; an exception is a carve-out or a named interaction). *Labeled* is the number of clauses that start with the word "Exception", which each document counts at its end. The syntax chapters were counted construct by construct; the other documents were read more finely, so their rule counts are not comparable with the two chapters.

| Document | Prefix | Clauses | Rules | Exceptions | Labeled | Examples |
|---|---|---|---|---|---|---|
| `syntax-blocks.md` | C2-B | 228 | 228 | 34 | 13 | 269 |
| `syntax-inline.md` | C2-I | 118 | 152 | 35 | 17 | 121 |
| `ast.md` | C2-A | 213 | 413 | 61 | 3 | 0 |
| `html.md` | C2-H | 198 | 465 | 86 | 7 | 56 |
| `writer.md` | C2-W | 136 | 304 | 89 | 7 | 11 |
| `source-layout.md` | C2-L | 56 | 84 | 19 | 0 | 0 |
| `includes.md` | C2-N | 88 | 211 | 47 | 2 | 33 |
| `extensions.md` | C2-X | 51 | 84 | 8 | 0 | 0 |
| `import-html.md` | C2-M | 84 | 214 | 40 | 1 | 42 |
| **Total** | | **1,172** | **2,155** | **419** | **50** | **532** |

`UPGRADING.md` is a non-normative guide with its upgrade map.

## Data files

- `data/`: 34 JSON files that the documents cite, among them the tree schema (`ast-schema.json`), the layout schema (`layout-schema.json`), the option table (`options.json`), the code catalog (`lint-rules.json`), the limits (`limits.json`), the import table (`import-html.json`) and the upgrade map (`upgrade-map.json`); `data/schemas/` holds the schema of each table; `data/README.md` lists them. Where a data row and its clause disagree, the clause wins.
- `trees/`: the fixtures of the tree gate (`trees/README.md`).
- `conformance/`: the corpus every engine reads (`conformance/README.md`).

## Gates

- `npm run spec2:data`: every data file against its schema and its clauses, the documents against each other (clause ids cited anywhere, example numbers, count tables and count sentences, codes against the catalog, the option table), and the two gates below.
- `npm run spec2:unicode`: the Unicode category ranges against UnicodeData.txt of the pinned version 18.0.0.
- The tree gate (`ast.md`, `scripts/spec2-trees.mjs`): 502 positive trees with positions, 42 imported trees, 35 refused trees, the equal pair of blocks Examples 267 and 268, and 7 layout sidecars; every node type and field of the schema occurs.
- The corpus (`scripts/spec2-conformance.mjs`): 532 examples and 35 refused trees generated from the documents and the fixtures, so the gate fails when they are stale; 78 clause cases, each with the sentence that decides it, read back from the clause. The examples are the gate of `html.md` and `writer.md` as well: each of their examples is a case an engine runs.

The gates check the text against itself. No engine runs in them; an engine runs the corpus in its own repository.

## What is frozen

- The syntax: `syntax-blocks.md` and `syntax-inline.md`.
- Tree contract 2.0: `ast.md` with `data/ast-schema.json`.
- HTML rendering: `html.md`.
- The canonical writer, `carve fmt` and lint: `writer.md`.
- The layout sidecar: `source-layout.md` with `data/layout-schema.json`.
- Includes: `includes.md`.
- HTML import: `import-html.md`.
- The extension mechanism: `extensions.md`, every section except "Standard extension: tabs".

## What is not frozen

The standard extensions. The mechanism of `extensions.md` is part of the candidate; the catalog of extensions comes after the core. Today the catalog is one extension, tabs (C2-X-039 to C2-X-048).

## Known open points

- **O9.** The layout sidecar has no gate of its own beyond `trees/layouts.json`. A candidate: for every corpus document, writing the tree with its sidecar gives the formatter's output, and writing it without gives a source that parses to an equal tree.
- **O10.** Annotation ranges (C2-A-204) are anchored for an unchanged tree only; how their paths follow an edit is not part of 0.2.0.
