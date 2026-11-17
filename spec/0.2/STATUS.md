# Carve 0.2: status

**Freeze candidate 3.** The candidate is the text of `spec/0.2/` at the last commit named below, on the branch `next2` of `markup-carve/carve`. It is not released and carries no tag. A frozen text changes only by a ruling recorded with its reason; a ruling on a frozen clause makes a new revision of the candidate, and a round of such rulings a new candidate.

Commit: `37e57932e007fe912234021ea5d699bab041e51c` (`37e57932`). The commit after it writes only this line.

Freeze candidate 1, revision 2: `3aba61c624bda75049c7055962bf1a6b9120a3a4` (`3aba61c6`), the rulings on O6, O7 and O8. The commit after it writes only this line.

Freeze candidate 2: `6a6596a602e30811a85083145f583d2e7acf90af` (`6a6596a6`), the fix round of the second review (F1 to F12) and of the corpus run of the reference engine. The commit after it writes only this line.

Freeze candidate 2, revision 1: `679dec006fa778dd53f8e6620524040b04d0b5a1` (`679dec00`), the ruling on O11. The commit after it writes only this line.

Freeze candidate 3: the commit named here by the commit after it, the fix round of the third review (F1 to F40). The commit after it writes only this line.

## Documents

Clauses are the paragraphs that start with a clause id. Rules and exceptions are counted by one rubric for all documents (an atomic normative statement that decides the tree, the output, the source written, a refusal or a report; an exception is a carve-out or a named interaction). *Labeled* is the number of clauses that start with the word "Exception", which each document counts at its end. The syntax chapters were counted construct by construct; the other documents were read more finely, so their rule counts are not comparable with the two chapters.

| Document | Prefix | Clauses | Rules | Exceptions | Labeled | Examples |
|---|---|---|---|---|---|---|
| `syntax-blocks.md` | C2-B | 228 | 229 | 35 | 13 | 270 |
| `syntax-inline.md` | C2-I | 118 | 154 | 35 | 17 | 123 |
| `ast.md` | C2-A | 213 | 424 | 63 | 3 | 0 |
| `html.md` | C2-H | 199 | 477 | 97 | 7 | 64 |
| `writer.md` | C2-W | 136 | 307 | 90 | 7 | 15 |
| `source-layout.md` | C2-L | 56 | 84 | 19 | 0 | 0 |
| `includes.md` | C2-N | 88 | 219 | 51 | 2 | 38 |
| `extensions.md` | C2-X | 51 | 85 | 8 | 0 | 0 |
| `import-html.md` | C2-M | 84 | 222 | 42 | 1 | 48 |
| **Total** | | **1,173** | **2,201** | **440** | **50** | **558** |

`UPGRADING.md` is a non-normative guide with its upgrade map.

## Data files

- `data/`: 34 JSON files that the documents cite, among them the tree schema (`ast-schema.json`), the layout schema (`layout-schema.json`), the option table (`options.json`), the code catalog (`lint-rules.json`), the limits (`limits.json`), the import table (`import-html.json`) and the upgrade map (`upgrade-map.json`); `data/schemas/` holds the schema of each table; `data/README.md` lists them. Where a data row and its clause disagree, the clause wins.
- `trees/`: the fixtures of the tree gate (`trees/README.md`).
- `conformance/`: the corpus every engine reads (`conformance/README.md`).

## Gates

- `npm run spec2:data`: every data file against its schema and its clauses, the documents against each other (clause ids cited anywhere, example numbers, count tables and count sentences, codes against the catalog, the option table), and the two gates below.
- `npm run spec2:unicode`: the Unicode category ranges against UnicodeData.txt of the pinned version 18.0.0.
- The tree gate (`ast.md`, `scripts/spec2-trees.mjs`): 523 positive trees with positions, 48 imported trees, 46 refused trees, the equal pair of blocks Examples 267 and 268, and 7 layout sidecars; every node type and field of the schema occurs.
- The corpus (`scripts/spec2-conformance.mjs`): 558 examples (316 verified) and 46 refused trees generated from the documents and the fixtures, so the gate fails when they are stale; an example's expected codes come only from its `Reported:` line; 80 clause cases, each with the sentence that decides it, read back from the clause. The examples are the gate of `html.md` and `writer.md` as well: each of their examples is a case an engine runs.

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

## What the reviews covered

- The first review's findings F1 to F20 were fixed before the commit the second review read, and the second review found those fixes held in the cases it checked. Its scope is not recorded here.
- The second review read `includes.md` and `import-html.md` clause by clause with the AST, block, HTML, writer and layout clauses they depend on, and the corpus README and schema, and ran the 33 include examples and the 16 then unverified import examples against `carve-js` `next2` `9e978d1f`. Its twelve findings are settled in candidate 2.
- The corpus run of `carve-js` `next2` `0266e137` ran every entry of the corpus. At candidate 2 every render, write and lint example matches; of the include examples all but Examples 34 and 36 match, and of the import examples all but 44 and 48, which hold rulings of this round the engine does not follow yet. Include Example 37, added in revision 1 of candidate 2 with the ruling on O11, holds a ruling the engine does not follow yet: it puts every selected record in the body and writes no foot.
- The third review read commit `6a6596a6`, the nine documents and the upgrade map, with `carve-js` `next2` `0266e137` and found 40 findings (eight high). In candidate 3, 30 are fixed, eight are decided (F3, F13, F15, F22, F23, F25, F33 and F36, each one commit for the maintainer to confirm), and F8 and F9 are parked as O13 and O14, with their non-normative parts (upgrade rows, the term of C2-H-069) done. Every new or changed example, every new upgrade row and the twelve `Reported:` lines of `html.md` were run against `carve-js` `next2` `2b8b95c1` and, where marked generated, against the 0.1 engine; of the corpus render, write and include examples the engine differs only on the rulings of this round (inline Example 123, HTML Examples 57, 58, 59 and 64, writer Examples 13 and 15, include Example 38) and on include Examples 34, 36 and 37.

What stays unverified: the 242 unverified examples (written by hand from the clauses, among them every include example by the conventions of `includes.md`), the rows of the data tables beyond what `spec2:data` checks, `ast.md`, `source-layout.md` and `extensions.md` read clause by clause by no second reviewer, and the PHP and Rust engines, which ran in none of the three reviews. `ast.md` was read by the third review, but its new reader checks of this round run in no engine yet.

## Known open points

- **O9.** The layout sidecar has no gate of its own beyond `trees/layouts.json`. A candidate: for every corpus document, writing the tree with its sidecar gives the formatter's output, and writing it without gives a source that parses to an equal tree.
- **O10.** Annotation ranges (C2-A-204) are anchored for an unchanged tree only; how their paths follow an edit is not part of 0.2.0.
- **O12.** For the extension catalog work: a renderer returns an HTML string the host cannot inspect for the escaping and URL policy of C2-X-034; the slots of a supplied node of another extension are walked in the key order of its `slots` object, which can differ from the order of its declaration (C2-X-020); and the annotation ids of C2-A-203 and C2-A-206 need a reader that is given the range sidecar with the tree.
- **O13.** The vertical axis of a table: no 0.2 source sets `valign`, while the tree holds it and C2-B-213 says cell marks set it (review 3 F8). Options: define vertical marks, drop the fields, or list them as interchange-only (C2-A-175).
- **O14.** A comment-only line inside an inline atom that spans lines, such as a code span: the block reading of C2-B-137 or the atom reading of the engine (review 3 F9).
