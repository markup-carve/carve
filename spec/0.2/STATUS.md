# Carve 0.2: status

**Freeze candidate 5.** The candidate is the text of `spec/0.2/` at the last commit named below, on the branch `next2` of `markup-carve/carve`. It is not released and carries no tag. A frozen text changes only by a ruling recorded with its reason; a ruling on a frozen clause makes a new revision of the candidate, and a round of such rulings a new candidate.

Commit: `37e57932e007fe912234021ea5d699bab041e51c` (`37e57932`). The commit after it writes only this line.

Freeze candidate 1, revision 2: `3aba61c624bda75049c7055962bf1a6b9120a3a4` (`3aba61c6`), the rulings on O6, O7 and O8. The commit after it writes only this line.

Freeze candidate 2: `6a6596a602e30811a85083145f583d2e7acf90af` (`6a6596a6`), the fix round of the second review (F1 to F12) and of the corpus run of the reference engine. The commit after it writes only this line.

Freeze candidate 2, revision 1: `679dec006fa778dd53f8e6620524040b04d0b5a1` (`679dec00`), the ruling on O11. The commit after it writes only this line.

Freeze candidate 3: `edebb05e78cd42e5b546045804e1bc3ca3535c39` (`edebb05e`), the fix round of the third review (F1 to F40). The commit after it writes only this line.

Freeze candidate 4: `20444577c5c4d9eadc29131c4e4258b9d248204b` (`20444577`), the fix round of the fourth review (F1 to F36), its list of rules that could go, and the readings the PHP and Rust engines met at stage 8. The commit after it writes only this line.

Freeze candidate 5: `a835c9e636bcc0e4ada8961a9ad262ecc17931a7` (`a835c9e6`), the fix round of the fifth review (F1 to F42), its list of rules that could go with the lower-confidence list, and the open readings of the `carve-js` candidate 2 and PHP stage 9 gap lists. The commit after it writes only this line.

## Documents

Clauses are the paragraphs that start with a clause id. Rules and exceptions are counted by one rubric for all documents (an atomic normative statement that decides the tree, the output, the source written, a refusal or a report; an exception is a carve-out or a named interaction). *Labeled* is the number of clauses that start with the word "Exception", which each document counts at its end. The syntax chapters were counted construct by construct; the other documents were read more finely, so their rule counts are not comparable with the two chapters.

| Document | Prefix | Clauses | Rules | Exceptions | Labeled | Examples |
|---|---|---|---|---|---|---|
| `syntax-blocks.md` | C2-B | 218 | 217 | 31 | 10 | 275 |
| `syntax-inline.md` | C2-I | 112 | 136 | 30 | 16 | 124 |
| `ast.md` | C2-A | 205 | 422 | 65 | 3 | 0 |
| `html.md` | C2-H | 193 | 470 | 98 | 6 | 71 |
| `writer.md` | C2-W | 129 | 294 | 86 | 5 | 16 |
| `source-layout.md` | C2-L | 57 | 95 | 23 | 0 | 0 |
| `includes.md` | C2-N | 88 | 219 | 54 | 2 | 38 |
| `extensions.md` | C2-X | 51 | 89 | 9 | 0 | 0 |
| `import-html.md` | C2-M | 84 | 239 | 46 | 1 | 58 |
| **Total** | | **1,137** | **2,181** | **442** | **43** | **582** |

In candidates 4 and 5 the columns Rules and Exceptions are the counts of the candidate before moved by the change of each commit of the round, not a recount.

Retired clause ids, deleted in candidate 4 because a general rule gives the same result, are not reused: C2-B-006, C2-B-023, C2-B-047, C2-B-056, C2-B-134, C2-B-139, C2-B-142, C2-B-143, C2-B-177, C2-I-027, C2-I-037, C2-I-038, C2-I-044, C2-I-054 and C2-I-065. Deleted in candidate 5 for the same reason: C2-A-076, C2-A-127, C2-A-137, C2-A-147, C2-A-163, C2-A-164, C2-A-166, C2-A-169, C2-B-086, C2-H-028, C2-H-059, C2-H-084, C2-H-097, C2-H-118, C2-H-135, C2-W-019, C2-W-042, C2-W-043, C2-W-054, C2-W-072, C2-W-121 and C2-W-132. Each chapter names them at its end.

`UPGRADING.md` is a non-normative guide with its upgrade map.

## Data files

- `data/`: 34 JSON files that the documents cite, among them the tree schema (`ast-schema.json`), the layout schema (`layout-schema.json`), the option table (`options.json`), the code catalog (`lint-rules.json`), the limits (`limits.json`), the import table (`import-html.json`) and the upgrade map (`upgrade-map.json`); `data/schemas/` holds the schema of each table; `data/README.md` lists them. Where a data row and its clause disagree, the clause wins.
- `trees/`: the fixtures of the tree gate (`trees/README.md`).
- `conformance/`: the corpus every engine reads (`conformance/README.md`).

## Gates

- `npm run spec2:data`: every data file against its schema and its clauses, the documents against each other (clause ids cited anywhere, example numbers, count tables and count sentences, codes against the catalog, the option table), and the two gates below.
- `npm run spec2:unicode`: the Unicode category ranges against UnicodeData.txt of the pinned version 18.0.0.
- The tree gate (`ast.md`, `scripts/spec2-trees.mjs`): 537 positive trees with positions, 58 imported trees, 56 refused trees, the equal pair of blocks Examples 267 and 268, and 10 layout sidecars, three of them refused by a reader check of C2-L-058; every node type and field of the schema occurs, and every positive and imported tree passes the reader checks of `scripts/lib/spec2-reader.mjs`.
- The corpus (`scripts/spec2-conformance.mjs`): 582 examples (328 verified) and 56 refused trees generated from the documents and the fixtures, so the gate fails when they are stale; an example's expected codes come only from its `Reported:` line; 95 clause cases, each with the sentence that decides it, read back from the clause. The examples are the gate of `html.md` and `writer.md` as well: each of their examples is a case an engine runs.

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

- The fourth review read commit `edebb05e`, with `source-layout.md`, `extensions.md` and the data tables in full, against `carve-js` `next2` `2b8b95c1`, and found 36 findings (one high, 14 medium) and 15 rules that could go. In candidate 4, 22 are fixed, 13 are decided (F1, F4, F10, F11, F12, F13, F14, F15, F22, F23, F27, F28 and F34, each one commit for the maintainer to confirm, F1 in two), F30 is parked as O15, and none is refuted. All 15 rules that could go are deleted or shortened, each in its own commit, after each item's input gave the stated result in `carve-js` `next2` `8368515b` and the examples of its section were read against the general rule; no example changed. Of the readings the PHP and Rust engines met at stage 8, the span-mark position was already settled in candidate 3, a paragraph of breaks alone is settled as 0.1 writes it (html Example 67), and the delimiter at the inline cap is parked as O16. Every new example was run against `carve-js` and, where marked generated, against the 0.1 engine.
- The fifth review read commit `20444577`: the fix round of candidate 4, `includes.md` and `import-html.md` in full with runs of the `carve-js` `next2` `9f88086e` importer and 0.2 engine, and a pass over three further chapters; it found 42 findings (two high, 20 medium) and 27 rules that could go, with a list of lower confidence. In candidate 5, 26 are fixed, 2 are settled by deleting the clause, 10 are decided (each one commit for the maintainer to confirm, F36 in part), F4, F31 and F34 are parked as O17 to O19, and F42 is refuted. Of the rules that could go, 25 are deleted or shortened, 1 is half deleted and 1 is kept; of the lower list, 10 are deleted and 2 kept. Each deletion was tried against inputs at the seams (list item, quote, table cell, footnote, end of input) in `carve-js` `next2` `ee68ffaa` first. The tree gate now runs the reader checks on every positive and imported tree. Of the `carve-js` candidate 2 and PHP stage 9 gap lists, one data row is fixed, one reading is decided (HTML Example 70) and two are parked as O20 and O21. A separate read of the whole diff of the round found six sentences the round left false and one undecided input (C2-M-040), fixed or decided before this commit.

What stays unverified: the 254 unverified examples (written by hand from the clauses, among them every include example by the conventions of `includes.md`), the rows of the data tables beyond what `spec2:data` checks and the fourth review read, `ast-schema.json`, `node-slots.json`, `unicode-categories.json` and the element rows of `import-html.json` row by row, the standard extensions beyond their contact with the mechanism, and the PHP and Rust engines, which ran in none of the five reviews. The reader checks added in candidates 3 to 5 run in the tree gate (`scripts/lib/spec2-reader.mjs`) and in no engine yet beyond those `carve-js` already had.

## Known open points

- **O9.** The layout sidecar has no gate of its own beyond `trees/layouts.json`. A candidate: for every corpus document, writing the tree with its sidecar gives the formatter's output, and writing it without gives a source that parses to an equal tree.
- **O10.** Annotation ranges (C2-A-204) are anchored for an unchanged tree only; how their paths follow an edit is not part of 0.2.0.
- **O12.** For the extension catalog work: a renderer returns an HTML string the host cannot inspect for the escaping and URL policy of C2-X-034; the slots of a supplied node of another extension are walked in the key order of its `slots` object, which can differ from the order of its declaration (C2-X-020); and the annotation ids of C2-A-203 need a reader that is given the range sidecar with the tree.
- **O14.** A comment-only line inside an inline atom that spans lines, such as a code span: the block reading of C2-B-137 or the atom reading of the engine (review 3 F9).
- **O15.** The attributes of a claimed node when its fallback renders (review 4 F30): wrap the fallback in an element that carries them, drop them with a report, or put them on the first fallback block. For the extension catalog work with O12.
- **O16.** A delimiter that can close, read at the inline cap behind open brackets (Rust stage 8): tested as a closer first, as `carve-js` reads it, or as an opener that the cap makes text, as `carve-rs` reads it (C2-I-118, C2-I-007).
- **O17.** Which view resolution visits when the written view of an extension node changes at render time (review 5 F4): C2-X-032 against C2-X-050 and C2-H-165.
- **O18.** A line or region selection whose first line opens frontmatter (review 5 F31): frontmatter of the selection, or only of a selection that starts at line 1 of the file (C2-N-020).
- **O19.** Which definitions a line or region selection sees (review 5 F34): only the selected ones, or those of the whole file as a section sees them (C2-N-054, C2-N-031).
- **O20.** A note reference whose `href` names no note and has no fragment (C2-M-062): a footnote reference keyed by the whole `href`, or an ordinary link.
- **O21.** A balanced brace block glued to a div name that is no valid attribute block (C2-B-225): `fence-opener-fallback` or `fence-title-syntax`; the tree is the same.
