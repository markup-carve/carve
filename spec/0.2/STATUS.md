# Carve 0.2: status

**Freeze candidate 10.** The candidate is the text of `spec/0.2/` at the last commit named below, on the branch `next2` of `markup-carve/carve`. It is not released and carries no tag. A frozen text changes only by a ruling recorded with its reason; a ruling on a frozen clause makes a new revision of the candidate, and a round of such rulings a new candidate.

Commit: `eda35624c74b730ac3d32b5f8b7e0f931768ddee` (`eda35624`). The commit after it writes only this line and the final report.

Freeze candidate 9 commit: `3e7b31e10cefa19e887a02b32b75631a048e6ea9` (`3e7b31e1`).

Freeze candidate 1, revision 2: `3aba61c624bda75049c7055962bf1a6b9120a3a4` (`3aba61c6`), the rulings on O6, O7 and O8. The commit after it writes only this line.

Freeze candidate 2: `6a6596a602e30811a85083145f583d2e7acf90af` (`6a6596a6`), the fix round of the second review (F1 to F12) and of the corpus run of the reference engine. The commit after it writes only this line.

Freeze candidate 2, revision 1: `679dec006fa778dd53f8e6620524040b04d0b5a1` (`679dec00`), the ruling on O11. The commit after it writes only this line.

Freeze candidate 3: `edebb05e78cd42e5b546045804e1bc3ca3535c39` (`edebb05e`), the fix round of the third review (F1 to F40). The commit after it writes only this line.

Freeze candidate 4: `20444577c5c4d9eadc29131c4e4258b9d248204b` (`20444577`), the fix round of the fourth review (F1 to F36), its list of rules that could go, and the readings the PHP and Rust engines met at stage 8. The commit after it writes only this line.

Freeze candidate 5: `a835c9e636bcc0e4ada8961a9ad262ecc17931a7` (`a835c9e6`), the fix round of the fifth review (F1 to F42), its list of rules that could go with the lower-confidence list, and the open readings of the `carve-js` candidate 2 and PHP stage 9 gap lists. The commit after it writes only this line.

Freeze candidate 5, revision 1: `7db33836185126d9e8457e84464ca38fdb1aec3c` (`7db33836`), the two rulings of 17 November 2026: vertical alignment of table cells as in 0.1 (C2-B-182, C2-B-211, C2-B-213; O13 is settled by it), and a header mark glued to a letter, a digit or `=` is cell text (C2-B-171). The commit after it writes only this line.

Freeze candidate 6: `e647035615526e037764b0b043b5093e8a431182` (`e6470356`), the ruling of 17 November 2026 that restores seventeen 0.1 behaviors that candidate 5 had changed without a decision (P1 to P3, P5 to P8, Q1 to Q7, Q10a, Q10b, A3 and A6; UPGRADING, "0.1 behaviors restored, 17 November 2026"), each in one commit, and the fixes of a read of the whole round. The commit after it writes only this line.

Freeze candidate 7: `7af9ba6bb3554b496d439600ab05113a776ef500` (`7af9ba6b`), the rulings of 17 November 2026 on the remaining points: the 0.1 differences that stay, each recorded in the upgrade map (UPGRADING, "Differences to 0.1 that stay"); the open points O14 to O21, H1 to H4, V1, V2, V6 and V10 decided as recommended, and the extension mechanism labeled provisional (UPGRADING, "Rulings of 17 November 2026, open points"); the new tenth document `tooling.md`; and the ruling of 12:30 on three further audits, which restores thirteen 0.1 behaviors, keeps and records further 0.2 behaviors and corrects rows and sentences of the guide (UPGRADING, "Rulings of 17 November 2026, 12:30"); each point in one commit, and the fixes of a read of the whole round.

Freeze candidate 8: `69f260332101ea1e08108d5e57041bfcc548c366` (`69f26033`), the four rulings of 17 November 2026 on the open points of candidate 6 (UPGRADING, "Rulings of 17 November 2026 on the open points of candidate 6"); the gaps the engine lane logged; the reduction of 17 November 2026, which deletes 27 clauses whose rule other clauses state or give and changes no expected result; the ruling of 13:55 on the open points of candidate 7 (UPGRADING, "Rulings of 17 November 2026, 13:55"); the seven defects of an independent read of candidate 7; the cases of a coverage audit; and the fixes of a read of the whole round; each point in one commit. The commit after it writes only this line.

Freeze candidate 9: at `3e7b31e1`, the last fix round: the eight defects of a second independent read of candidate 8 (CR8-01 to CR8-08); what writing the clause cases showed, with one rule for where an entry's range starts (C2-W-138), a trigger for every active row of the code catalog taken from the 0.1 lint source, the comparison of layout facts (C2-L-059) and the open points of the conformance lane decided as recommended or parked; the gaps of the engine lane (G-G1 to G-G8); and the fixes of a read of the whole round; each point in one commit.

Freeze candidate 10: the ten maintainer rulings, twenty findings of the third independent read, seven further catalog defects, the engine lane examples and gaps, and the final stranger read. G-H5 remains parked in the root open-points file. The extension mechanism remains provisional. The complete point and case inventory is in the root ledger and report.

Freeze candidate 11: the nineteen findings of the fourth independent read, restored conditional diagnostic advice, and the 0.1 decisions on semantic key case and nested braced boundaries. The clause, rule, exception and example counts in the table remain unchanged. Clause cases rose from 1,016 to 1,051; upgrade source rows rose from 268 to 269. The positive tree, imported tree, refused tree and layout counts remain 604, 64, 79 and 19. The root ledger and report record each point and its case.

## Documents

Clauses are the paragraphs that start with a clause id. Rules and exceptions are counted by one rubric for all documents (an atomic normative statement that decides the tree, the output, the source written, a refusal or a report; an exception is a carve-out or a named interaction). *Labeled* is the number of clauses that start with the word "Exception", which each document counts at its end. The syntax chapters were counted construct by construct; the other documents were read more finely, so their rule counts are not comparable with the two chapters.

| Document | Prefix | Clauses | Rules | Exceptions | Labeled | Examples |
|---|---|---|---|---|---|---|
| `syntax-blocks.md` | C2-B | 209 | 217 | 31 | 8 | 289 |
| `syntax-inline.md` | C2-I | 109 | 136 | 30 | 14 | 131 |
| `ast.md` | C2-A | 198 | 422 | 65 | 3 | 0 |
| `html.md` | C2-H | 193 | 470 | 98 | 6 | 84 |
| `writer.md` | C2-W | 129 | 294 | 86 | 5 | 45 |
| `source-layout.md` | C2-L | 54 | 95 | 23 | 0 | 0 |
| `includes.md` | C2-N | 88 | 219 | 54 | 2 | 41 |
| `extensions.md` | C2-X | 51 | 89 | 9 | 0 | 0 |
| `import-html.md` | C2-M | 83 | 239 | 46 | 1 | 64 |
| `tooling.md` | C2-T | 40 | 105 | 7 | 0 | 0 |
| **Total** | | **1,154** | **2,286** | **449** | **39** | **654** |

In candidates 4 and 5 the columns Rules and Exceptions are the counts of the candidate before moved by the change of each commit of the round, not a recount. Revision 1 of candidate 5 adds no clause and does not move these two columns. Candidate 6 adds one clause, C2-B-230, and amends others; it does not move these two columns either, so they wait for a recount. Candidate 7 adds C2-H-201 and the forty clauses of `tooling.md`; its row of Rules and Exceptions is the count of that document's author, not a rubric reading, and the other rows do not move. The reduction of 17 November 2026 deletes clauses whose rule other clauses state or give; it moves the columns Clauses and Labeled, not Rules and Exceptions, since the rules stay. Candidate 8 recounts the row of `tooling.md`: one rule per sentence of its clauses and one exception per carve-out (C2-T-002, C2-T-009, C2-T-010, C2-T-016, C2-T-031, C2-T-032, C2-T-038), which corrects the author's count of candidate 7. Candidate 9 adds C2-W-138 and C2-L-059 and amends other clauses; it moves the column Clauses, and Rules and Exceptions wait for a recount.

Retired clause ids, deleted in candidate 4 because a general rule gives the same result, are not reused: C2-B-006, C2-B-023, C2-B-047, C2-B-056, C2-B-134, C2-B-139, C2-B-142, C2-B-143, C2-B-177, C2-I-027, C2-I-037, C2-I-038, C2-I-044, C2-I-054 and C2-I-065. Deleted in candidate 5 for the same reason: C2-A-076, C2-A-127, C2-A-137, C2-A-147, C2-A-163, C2-A-164, C2-A-166, C2-A-169, C2-B-086, C2-H-028, C2-H-059, C2-H-084, C2-H-097, C2-H-118, C2-H-135, C2-W-019, C2-W-042, C2-W-043, C2-W-054, C2-W-072, C2-W-121 and C2-W-132. Deleted in the reduction of 17 November 2026, because other clauses state or give the same rule: C2-A-020, C2-A-055, C2-A-057, C2-A-075, C2-A-087, C2-A-126, C2-A-185, C2-B-002, C2-B-063, C2-B-064, C2-B-094, C2-B-099, C2-B-103, C2-B-114, C2-B-129, C2-B-144, C2-B-150, C2-H-023, C2-I-022, C2-I-041, C2-I-045, C2-L-001, C2-L-002, C2-L-043, C2-L-044, C2-M-073 and C2-W-126. Each chapter names them at its end.

`UPGRADING.md` is a non-normative guide with its upgrade map.

## Data files

- `data/`: 35 JSON files that the documents cite, among them the tree schema (`ast-schema.json`), the layout schema (`layout-schema.json`), the option table (`options.json`), the code catalog (`lint-rules.json`), the limits (`limits.json`), the import table (`import-html.json`), the command line table (`cli.json`) and the upgrade map (`upgrade-map.json`); `data/schemas/` holds the schema of each table; `data/README.md` lists them. Where a data row and its clause disagree, the clause wins.
- `trees/`: the fixtures of the tree gate (`trees/README.md`).
- `conformance/`: the corpus every engine reads (`conformance/README.md`).

## Gates

- `npm run spec2:data`: every data file against its schema and its clauses, the documents against each other (clause ids cited anywhere, example numbers, count tables and count sentences, codes against the catalog, the option table), and the two gates below.
- `npm run spec2:unicode`: the Unicode category ranges against UnicodeData.txt of the pinned version 18.0.0.
- The tree gate (`ast.md`, `scripts/spec2-trees.mjs`): 604 positive trees with positions, 64 imported trees, 79 refused trees, the equal pair of blocks Examples 267 and 268, and 19 layout sidecars, five of them refused by a reader check of C2-L-058; every node type and field of the schema occurs, and every positive and imported tree passes the reader checks of `scripts/lib/spec2-reader.mjs`.
- The corpus (`scripts/spec2-conformance.mjs`): 654 examples (326 verified) and 79 refused trees generated from the documents and the fixtures, so the gate fails when they are stale; an example's expected codes come only from its `Reported:` line; 1,016 clause cases, each with the sentence that decides it, read back from the clause; 708 of them, CC-360 to CC-1070, name their call: 344 lint, 86 parse, 82 cli, 50 write, 46 render, 37 layout, 20 tree, 20 import, 18 format, 5 migrate. Their options, diagnostics with positions, refusals, sidecars and command lines are checked against the data tables (`conformance/README.md`), and 25 of the refused trees name the node a reader check refuses them at. The examples are the gate of `html.md` and `writer.md` as well: each of their examples is a case an engine runs.

The gates check the text against itself. No engine runs in them; an engine runs the corpus in its own repository.

## What is frozen

- The syntax: `syntax-blocks.md` and `syntax-inline.md`.
- Tree contract 2.0: `ast.md` with `data/ast-schema.json`.
- HTML rendering: `html.md`.
- The canonical writer, `carve fmt` and lint: `writer.md`.
- The layout sidecar: `source-layout.md` with `data/layout-schema.json`.
- Includes: `includes.md`.
- HTML import: `import-html.md`.
- Tooling, the library calls and the command line: `tooling.md` with `data/cli.json`.

## What is not frozen

The extension mechanism and the standard extensions: `extensions.md` as a whole. The mechanism is part of the candidate and is provisional: its interfaces (registration, matchers, transforms, the node fields and slots, resolution, renderers and the source record) may change in a 0.2.x release together with the extension catalog. The reason is the interface points still open for that work: O12 (a renderer returns an HTML string the host cannot inspect for C2-X-034, the slot walk order of C2-X-020, and the reader of annotation ids), and two rulings of 17 November that the catalog may revisit, the element that carries the attributes of a fallback (O15, C2-X-035) and the fallback written unresolved after a renderer throws (O17, C2-X-050). A change to the mechanism is recorded in `UPGRADING.md` with the release that makes it. Today the catalog is one extension, tabs (C2-X-039 to C2-X-048).

## What the reviews covered

- The first review's findings F1 to F20 were fixed before the commit the second review read, and the second review found those fixes held in the cases it checked. Its scope is not recorded here.
- The second review read `includes.md` and `import-html.md` clause by clause with the AST, block, HTML, writer and layout clauses they depend on, and the corpus README and schema, and ran the 33 include examples and the 16 then unverified import examples against `carve-js` `next2` `9e978d1f`. Its twelve findings are settled in candidate 2.
- The corpus run of `carve-js` `next2` `0266e137` ran every entry of the corpus. At candidate 2 every render, write and lint example matches; of the include examples all but Examples 34 and 36 match, and of the import examples all but 44 and 48, which hold rulings of this round the engine does not follow yet. Include Example 37, added in revision 1 of candidate 2 with the ruling on O11, holds a ruling the engine does not follow yet: it puts every selected record in the body and writes no foot.
- The third review read commit `6a6596a6`, the nine documents and the upgrade map, with `carve-js` `next2` `0266e137` and found 40 findings (eight high). In candidate 3, 30 are fixed, eight are decided (F3, F13, F15, F22, F23, F25, F33 and F36, each one commit for the maintainer to confirm), and F8 and F9 are parked as O13 and O14, with their non-normative parts (upgrade rows, the term of C2-H-069) done. Every new or changed example, every new upgrade row and the twelve `Reported:` lines of `html.md` were run against `carve-js` `next2` `2b8b95c1` and, where marked generated, against the 0.1 engine; of the corpus render, write and include examples the engine differs only on the rulings of this round (inline Example 123, HTML Examples 57, 58, 59 and 64, writer Examples 13 and 15, include Example 38) and on include Examples 34, 36 and 37.

- The fourth review read commit `edebb05e`, with `source-layout.md`, `extensions.md` and the data tables in full, against `carve-js` `next2` `2b8b95c1`, and found 36 findings (one high, 14 medium) and 15 rules that could go. In candidate 4, 22 are fixed, 13 are decided (F1, F4, F10, F11, F12, F13, F14, F15, F22, F23, F27, F28 and F34, each one commit for the maintainer to confirm, F1 in two), F30 is parked as O15, and none is refuted. All 15 rules that could go are deleted or shortened, each in its own commit, after each item's input gave the stated result in `carve-js` `next2` `8368515b` and the examples of its section were read against the general rule; no example changed. Of the readings the PHP and Rust engines met at stage 8, the span-mark position was already settled in candidate 3, a paragraph of breaks alone is settled as 0.1 writes it (html Example 67), and the delimiter at the inline cap is parked as O16. Every new example was run against `carve-js` and, where marked generated, against the 0.1 engine.
- The fifth review read commit `20444577`: the fix round of candidate 4, `includes.md` and `import-html.md` in full with runs of the `carve-js` `next2` `9f88086e` importer and 0.2 engine, and a pass over three further chapters; it found 42 findings (two high, 20 medium) and 27 rules that could go, with a list of lower confidence. In candidate 5, 26 are fixed, 2 are settled by deleting the clause, 10 are decided (each one commit for the maintainer to confirm, F36 in part), F4, F31 and F34 are parked as O17 to O19, and F42 is refuted. Of the rules that could go, 25 are deleted or shortened, 1 is half deleted and 1 is kept; of the lower list, 10 are deleted and 2 kept. Each deletion was tried against inputs at the seams (list item, quote, table cell, footnote, end of input) in `carve-js` `next2` `ee68ffaa` first. The tree gate now runs the reader checks on every positive and imported tree. Of the `carve-js` candidate 2 and PHP stage 9 gap lists, one data row is fixed, one reading is decided (HTML Example 70) and two are parked as O20 and O21. A separate read of the whole diff of the round found six sentences the round left false and one undecided input (C2-M-040), fixed or decided before this commit.

- The restore round of candidate 6 took each of the seventeen behaviors from the 0.1 text and the 0.1 engine (`carve-js` `next2` `d3dd135d`, `dist/cli.js`) on the audit input and at least five variations at the seams (quote, list item, table cell, attributes, limits), and changed every place in the nine documents, the data tables and the upgrade map that stated the old rule. Where a restore met a recorded decision it was done narrowly and the point was left for the maintainer. The 17 new examples and the 115 new clause cases hold the 0.1 output; the 0.2 engine of `carve-js` follows none of the restores yet, so the examples are unverified. A separate read of the whole diff found twelve points: nine are fixed, three did not hold.

- The round of candidate 7 took each 0.1 behavior from the audit report and the 0.1 test or fixture it names, ran every input through the 0.1 engine and the 0.2 engine of `carve-js` `next2` `26901e16` at the seams (quote, list item, table cell, footnote body), and checked every rewrite row of the round: the 0.2 HTML of its `to` equals the 0.1 HTML of its `from`. Where the 0.2 engine does not follow a ruling of the round yet, the clause decides and the example or case is unverified. A separate read of the whole diff of the round, in three parts, found twenty-nine points that held; twenty-two are fixed, and seven are left as recorded choices (O23), as engine work or as written.

- The round of candidate 8 took each ruling into every place of the ten documents, the data tables and the upgrade map that stated the old rule; checked each new or changed case against the 0.1 engine or `carve-js` `next2` `8368515b` (`carve2`) where the behavior has a 0.1 or engine reading; compared the corpus and the fixtures before and after each reduction commit, with no difference; and ended with an independent read of the whole diff since `0a845880`, whose nine findings are fixed or parked.

- The round of candidate 9 took the trigger of each catalog row kept from 0.1 from the 0.1 lint source (`carve-js` `main` `dbde2f0`) and its tests, run on probe inputs through that source, and compared it with the 0.2 engine (`carve-js` `next2` `ace7950b`); every new or changed case ran against that 0.2 engine, which differs on the lint rows and on several new clauses, as engine work. A separate read of the whole diff since `6bdc5a26` found fifteen points; fourteen are fixed and one is refuted.

What stays unverified: the 328 unverified examples (written by hand from the clauses, among them every include example by the conventions of `includes.md`), the rows of the data tables beyond what `spec2:data` checks and the fourth review read, `ast-schema.json`, `node-slots.json`, `unicode-categories.json` and the element rows of `import-html.json` row by row, the standard extensions beyond their contact with the mechanism, and the PHP and Rust engines, which ran in none of the five reviews. The reader checks added in candidates 3 to 5 run in the tree gate (`scripts/lib/spec2-reader.mjs`) and in no engine yet beyond those `carve-js` already had.

## Known open points

- **O9.** The layout sidecar has no gate of its own beyond `trees/layouts.json`. A candidate: for every corpus document, writing the tree with its sidecar gives the formatter's output, and writing it without gives a source that parses to an equal tree.
- **O10.** Annotation ranges (C2-A-204) are anchored for an unchanged tree only; how their paths follow an edit is not part of 0.2.0.
- **O12.** For the extension catalog work: a renderer returns an HTML string the host cannot inspect for the escaping and URL policy of C2-X-034; the slots of a supplied node of another extension are walked in the key order of its `slots` object, which can differ from the order of its declaration (C2-X-020); and the annotation ids of C2-A-203 need a reader that is given the range sidecar with the tree.
- **O22.** Points the restore round of candidate 6 left for a ruling, each restored as narrowly as the ruling required: header rows inside a body take `scope="row"` (U-271, against T-053 and C2-A-092), and a pipe table with `body-rows` keeps its 0.2 head (C2-B-178, U-058); inside a code span a backslash and a trailing space stay (the ruling of 16 November, C2-I-002); and the writer half of F33 (C2-W-098) now writes a row attribute value with a pipe in quotes, which the maintainer should confirm.
- **O23.** O15 and O17 have no clause case, since no corpus option registers an extension. The other points of the round of candidate 7 are decided by the ruling of 17 November, 13:55 (UPGRADING, "Rulings of 17 November 2026, 13:55").
