# Carve 0.2: status

**Freeze candidate 18.** The 21 November ruling on typed metadata blocks after line 1 (#6324) reopens the 0.2.0 syntax and tree contract before the tag. C2-B-231 to C2-B-233, C2-A-218 and C2-W-152 state the added rules; the conformance rows CC-1581 to CC-1613 pin the cases. The JavaScript prototype is held while the engines port the final contract.

**Freeze candidate 17.** The candidate is the text of `spec/0.2/` on the branch `next2` of `markup-carve/carve`. It is not released and carries no tag. A frozen text changes only by a ruling recorded with its reason; a ruling on a frozen clause makes a new revision of the candidate, and a round of such rulings a new candidate.

Freeze candidate 17 content commit: `f22c19b9f`, the maintainer rulings of 19 November 2026, 12:00 (#6114), with the tabs `mode` ruling of 12:10 (`821d5d274`, #6113). This status-only commit follows it. Freeze candidate 16 content commit: `9f9aff4c7`, the option rulings of 19 November 2026 (`softBreak`, `allowLosses`, `maxLosses`, `codeBlockRenderer`, `positionOf`; #6091) and the clause case fixes CC-1223 (#6082) and CC-1227 (#6088), with the release names of #6086. Freeze candidate 15 content commit: `4304a0c97`, the rulings D1 to D8 of 18 November 2026 (#6074, #6070). Freeze candidate 14 content commit: `f2be82f57`. Freeze candidate 13 content commit: `786e2821c`.

Freeze candidate 12 commit: `7c9de4372`. The older `eda35624` commit is freeze candidate 10.

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

Freeze candidate 10: the ten maintainer rulings, twenty findings of the third independent read, seven further catalog defects, the engine lane examples and gaps, and the final stranger read. G-H5 remains parked in the maintainer notes outside this branch. The extension mechanism remains provisional. The complete point and case inventory is in the maintainer ledger and report outside this branch.

Freeze candidate 11: the nineteen findings of the fourth independent read, restored conditional diagnostic advice, and the 0.1 decisions on semantic key case and nested braced boundaries. The clause, rule, exception and example counts in the table remain unchanged. Clause cases rose from 1,016 to 1,048; upgrade source rows rose from 268 to 269. The positive tree, imported tree, refused tree and layout counts remain 604, 64, 79 and 19. The maintainer ledger and report outside this branch record each point and its case.

Freeze candidate 12: the parsed-document lint trigger rule, the eighteen points of the fifth independent read and the corrections found by the final read. The clause and example counts remain 1,154 and 654. Clause cases rose from 1,048 to 1,071. Positive trees, imported trees, refused trees, layout sidecars and upgrade source rows remain 604, 64, 79, 19 and 269. Rule and exception totals in the table await the recount described below. The maintainer ledger and report outside this branch record each point and its case.

Freeze candidate 13: the scope restorations and 18 findings of the sixth independent read. The clause and example counts remain 1,154 and 654. Clause cases rose from 1,071 to 1,100. Positive trees, imported trees, refused trees, layout sidecars and upgrade source rows remain 604, 64, 79, 19 and 269. The rule and exception totals in the table still await a full recount. The maintainer ledger and report outside this branch record the cases and result changes.

Freeze candidate 14: the measured corrections to `includes-38`, CC-1048 and CC-1142; the recorded reference and delimited cell readings that preserve 0.1; the four catalog text findings and twenty measured engine differences; and cases for two false authored-file lint reports. Clauses and examples remain 1,155 and 656 at the starting head; clause cases rise from 1,100 to 1,129, and the catalog and upgrade source rows remain 177 and 269. Positive trees, imported trees, refused trees and layout sidecars remain 606, 64, 79 and 19. The 328-example measurement corrected one expected tree, but status remains 325 verified and 331 unverified under the document conventions. Three active diagnostic rows still need corpus host-failure inputs; the external report names them. The rule and exception totals still await a full recount.

After candidate 14: the five findings of the seventh read. `data/line-shapes.json` gains the `region_marker` shape, which `comment_only` excludes, so a table-driven scanner ends a paragraph at a region marker as C2-B-137 says; C2-B-137 adds that a malformed marker leaves a comment-only line. The catalog fixes the text of every placeholder the seventh read found open: `colon-fence-length-mismatch` names the innermost container kind and its outcome in three variants (a short run that closes an enclosing container was described as opening a div), `table-span-marker-blocked` (four causes of C2-B-172) and `include-option-invalid` (four problems) have one variant per cause, and `block-opener-without-blank-line` names the opener as `${opener}` in place of the literal `(kind)`. Clause cases rose from 1,129 to 1,131.

After the clause-by-clause read of candidate 14: all fifteen findings were reconciled at the current `next2` head across block and inline shapes, source layout, HTML import losses, include ranges, writer diagnostics, tooling and the upgrade guide. Glued marker attributes, tab endings, required content and fence metadata now agree between clauses and data; the fallback and layout tables follow their clauses; two supplied-tree HTML losses are explicit. The import element references and current-engine status were corrected without changing behavior. Clause cases rose from 1,131 to 1,149, with eighteen new cases, including render, parse, layout, import and CLI calls. Existing examples, trees and conformance outputs remain unchanged except for five `why` quotes updated word for word with their clauses.

Freeze candidate 15: the rulings D1 to D8 of 18 November 2026. D1 and D2 take back the 17 November restores R22, R12 and R35: the first ordered marker fixes the list style, and a line comment takes every closer on its line, also directly after the opener of a bracket or braced form (U-397 to U-407). D3 to D7 add the extension render mode with a build-time renderer channel, the provisional document transform, the `:wiki[...]` and `:cite[...]` source forms with no new delimiter, the tabs contract with `selected` and static output, and the `imgFence` URL exception (U-408 to U-419). D8 sets the freeze boundaries above. The engine gaps these rulings open are listed under "Engine gaps from the 18 November rulings".

After the upgrade replay round: the 9,733-source comparison identified 21 unmapped cause groups, with 70 affected sources. The shortest source of each group was rerun against the pinned 0.1 and 0.2 JavaScript engines. Four groups have verified preserving spellings on their shortest inputs, one needs no change because the tool compares attribute names without case, and sixteen require a source-range report; U-375 through U-395 record the causes and U-396 the empty unclosed math run, bringing source rows from 269 to 291. The other replay sources were not retained in the input bundle, so no group-wide preservation claim is made. U-396 reports empty unclosed math runs that U-258 cannot rewrite, an unmapped mismatch has an explicit blocking status, and the one-time input contract excludes native 0.2 source. The trusted extension renderer host helpers now have the shape and indentation behavior of the pinned engine.

Freeze candidate 16 content: the parity ruling of 19 November 2026, which brings four host features of the 0.1 engines into the 0.2 options and calls. `softBreak` (C2-H-203) writes a soft break as a line break, one space or `<br>`, the 0.1 soft break mode of the PHP engine; C2-H-045 and C2-H-065 refer to it. `allowLosses` (C2-H-204) and `maxLosses` (C2-H-205) are the loss allow list and the cap on retained losses of 0.1, read by the render and the HTML importer; `--allow-loss` and `--max-render-losses` set them (C2-T-010, C2-T-027, C2-T-029), and C2-A-174 names them. `codeBlockRenderer` (C2-H-206, C2-H-207) is the host function that writes code blocks, as the reference engine offers it. `positionOf` (C2-T-041) counts a line and a column exactly as C2-T-019 does. The options grow from 20 to 24, the option schema gains the type `count`, `--soft-break` joins the render flags, and the corpus gains the case kind `position` and the harness spelling of `codeBlockRenderer` (`conformance/README.md`). Clause cases rose from 1,177 to 1,244 (CC-1235 to CC-1301); source upgrade rows rose from 314 to 317 (U-420 to U-422). The gaps these additions open are listed under "Engine gaps from the parity ruling of 19 November".

Freeze candidate 17 content: the maintainer rulings of 19 November 2026, 12:00. `lint` reads `headingIds`, so `broken-fragment-link` checks against the ids that value generates, and `--heading-ids` joins the lint flags (C2-T-042, #6104). A line block outside the profile degrades to one paragraph, its lines joined by one space (C2-H-165, #6106). A task item's `aria-label` reads the children of the tree, not their degraded forms (C2-H-032, #6107). The library gains `diffTree`, `applyPatch`, `sourceFingerprint` and `treeFingerprint` with `CarvePatchError` under `ast-json-invalid` (C2-T-043 to C2-T-046), and `encodeTree` writes the JSON Canonicalization Scheme, so a tree fingerprint agrees across engines (C2-A-217, #6099). The transliteration of the `ascii` heading id values is a table of `data/heading-slug.json` that every engine uses (C2-H-147). C2-X-053 to C2-X-055 state the observable result of the transform checks and let a document transform edit core nodes. The standard extensions of the 0.1 catalog get their ruled points (C2-X-061 to C2-X-069), with `:wiki[Page|Display]` in C2-X-057 and several `:cite` keys in C2-X-058. A diagnostic entry may carry the include chain `includedBy` (C2-T-020, C2-N-063), the file resolver takes `allowAbsolute`, on by default (C2-N-012), and an import option that changes the tree, `labels` first, is an option of the importer (C2-M-100, C2-M-101, #6100). Clause cases rose from 1,252 to 1,290 (CC-1310 to CC-1347), with the case kinds `diff`, `patch` and `fingerprint`; source upgrade rows rose from 317 to 320 (U-423 to U-425). The gaps these rulings open are listed under "Engine gaps from the rulings of 19 November, 12:00".

After candidate 17, the spec batch of 19 November: a fallback that is the claimed core node holds it without its attributes (C2-X-024, #6096); only the ids a tabs group writes in its mode move it (C2-X-048, #6112); the commands and flags carried from 0.1, `flatten`, `lint --fix` and `fix`, `--strict`, `lint --ignore` and `--output`, with the categories `include-unresolved` and `flatten-changed` and a `fix` column in the catalog (C2-T-047 to C2-T-053, #6097); a source duplicate id fails no document transform (C2-X-055); `djot-plus-bullet` reads the line after its container prefixes; and the corrected ranges of CC-813, CC-891 (#6068) and CC-1271 (#6095). U-393 reports a line comment in a frame (#6110), U-426 a comment directly after an opener, U-427 and U-428 the class-form tabs and a non-tab block in a group (#6102), and U-429 the case-only reference respelling of `upgrade --migrate`. Tooling clauses rose from 46 to 53, clause cases from 1,290 to 1,313 (CC-1348 to CC-1370), and source upgrade rows from 320 to 324. The points it could not decide are O25.

The upgrade replay of 19 November adds U-430, a delimiter that 0.2 pairs across a braced opener or an attribute block and 0.1 kept as text, and U-431, a hyphen run that C2-I-111 splits into other dashes than 0.1 (#6164). Source upgrade rows rose from 324 to 326. The second replay pass adds U-432, a line comment that 0.1 ended at a closer or read after an opener, written as a braced comment, and U-433, a blank line above a comment line that ended a 0.1 block; source upgrade rows rose from 326 to 328. The third replay pass adds U-434, one space between a bullet and a task box; U-435, a block moved out of a description to the column of its list; U-436, a line indented to the item column that 0.1 read into the item; and U-437, a blank line between item text and a paragraph 0.1 started outside the item. Source upgrade rows rose from 328 to 332. The fourth replay pass adds U-438 for a nested ordered list beginning above 1 after open item text; source upgrade rows rose to 333. The replay of 23 November adds U-439, which reports an unclosed run whose 0.1 value no 0.2 span spells, and U-440, which removes an empty literal-text run that 0.1 wrote as nothing; source upgrade rows rose to 335.

The ruling of 21 November on `headingShift` (#6325) makes the heading shift a core render option and removes the `headingLevelShift()` extension from 0.2. C2-H-208 adds a count from 0 to 5 to every heading level of the render view before the first document transform; a level above 6 is written by C2-H-021 and reported once with `heading-shift-above-6`; the degraded mark counts the shifted level; under `roundtrip` the new carrier `data-carve-source-level` holds the level before the shift and the importer reads it (C2-H-114, C2-H-186). C2-H-209 lets the Markdown export read the option, clamped to 6 with the same code, while the plain-text and ANSI exports refuse it (C2-T-003). The options grow from 25 to 26, the reserved names from 18 to 19, `--heading-shift` joins the render flags (C2-T-010), the option schema gains the stage `export-markdown` and the field `maximum`, and the corpus gains the case kind `export`. html.md clauses rose from 199 to 201, clause cases from 1,447 to 1,484 (CC-1505 to CC-1541); Rules and Exceptions wait for a recount.

## Documents

Clauses are the paragraphs that start with a clause id. Rules and exceptions are counted by one rubric for all documents (an atomic normative statement that decides the tree, the output, the source written, a refusal or a report; an exception is a carve-out or a named interaction). *Labeled* is the number of clauses that start with the word "Exception", which each document counts at its end. The syntax chapters were counted construct by construct; the other documents were read more finely, so their rule counts are not comparable with the two chapters.

| Document | Prefix | Clauses | Rules | Exceptions | Labeled | Examples |
|---|---|---|---|---|---|---|
| `syntax-blocks.md` | C2-B | 209 | 217 | 31 | 8 | 289 |
| `syntax-inline.md` | C2-I | 109 | 136 | 30 | 14 | 131 |
| `ast.md` | C2-A | 199 | 422 | 65 | 3 | 0 |
| `html.md` | C2-H | 201 | 470 | 98 | 6 | 86 |
| `writer.md` | C2-W | 131 | 295 | 87 | 6 | 46 |
| `source-layout.md` | C2-L | 54 | 95 | 23 | 0 | 0 |
| `includes.md` | C2-N | 88 | 219 | 54 | 2 | 41 |
| `extensions.md` | C2-X | 70 | 89 | 9 | 0 | 0 |
| `import-html.md` | C2-M | 85 | 239 | 46 | 1 | 64 |
| `tooling.md` | C2-T | 46 | 105 | 7 | 0 | 0 |
| **Total** | | **1,192** | **2,287** | **450** | **40** | **657** |

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
- The tree gate (`ast.md`, `scripts/spec2-trees.mjs`): 606 positive trees with positions, 64 imported trees, 79 refused trees, the equal pair of blocks Examples 267 and 268, and 19 layout sidecars, five of them refused by a reader check of C2-L-058; every node type and field of the schema occurs, and every positive and imported tree passes the reader checks of `scripts/lib/spec2-reader.mjs`.
- The corpus (`scripts/spec2-conformance.mjs`): 656 examples (325 verified) and 79 refused trees generated from the documents and the fixtures, so the gate fails when they are stale; an example's expected codes come only from its `Reported:` line; 1,129 clause cases, each with the deciding clause or catalog trigger quoted and checked; 821 of them name their call: 434 lint, 94 parse, 84 cli, 53 write, 55 render, 37 layout, 20 tree, 20 import, 19 format, 5 migrate. Their options, diagnostics with positions, refusals, sidecars and command lines are checked against the data tables (`conformance/README.md`), and 25 of the refused trees name the node a reader check refuses them at. The examples are the gate of `html.md` and `writer.md` as well: each of their examples is a case an engine runs.

The gates check the text against itself. No engine runs in them; an engine runs the corpus in its own repository.

## Engine readiness, 20 November 2026

Measured at 08:44 UTC with `npm --prefix scripts run readiness:next2 -- --write-baseline` on the engine `next2` heads below. Each cell is passing cases over total cases; none failed or was unsupported. The 94 extension cases now count toward the readiness gate and its baseline.

| Engine | Commit | Clause cases | Examples | Trees | Extensions |
|---|---|---:|---:|---:|---:|
| carve-js | `1acf5564d672bf8525ed804c268d1027fdcd77fe` | 1347/1347 | 657/657 | 705/705 | 94/94 |
| carve-php | `9766b86759c2756ff22fff28ff792728c9ae1c1c` | 1347/1347 | 657/657 | 705/705 | 94/94 |
| carve-rs | `19f0453d02b7826bb6acd909ef14285ce76db8f2` | 1347/1347 | 657/657 | 705/705 | 94/94 |

## What is frozen

- The syntax: `syntax-blocks.md` and `syntax-inline.md`.
- Tree contract 2.0: `ast.md` with its schema.
- HTML rendering and URL policy: `html.md` with `data/url-policy.json`.
- The canonical writer and `carve fmt`: `writer.md`.
- Lint ids, triggers, severities and meanings: `writer.md` with `data/lint-rules.json`.
- The layout sidecar: `source-layout.md` with `data/layout-schema.json`.
- Includes: `includes.md`.
- HTML import: `import-html.md`.
- Tooling, library calls and command line behavior: `tooling.md` with `data/cli.json`.

## What is not frozen

Lint message wording may change in a 0.2.x release when its id, severity and meaning stay the same. A lint finding range that contradicts its clause may be corrected in a 0.2.x release. Tooling may add library calls, command options and commands in a 0.2.x release without changing existing behavior. New upgrade-map rows and corrections may be added.

The extension mechanism and the standard extensions: `extensions.md` as a whole. The mechanism is part of the candidate and is provisional: its interfaces (registration, matchers, transforms, the node fields and slots, resolution, renderers and the source record) may change in a 0.2.x release together with the extension catalog. The reason is the interface points still open for that work: O12 (a renderer returns an HTML string the host cannot inspect for C2-X-034, the slot walk order of C2-X-020, and the reader of annotation ids), and two rulings of 17 November that the catalog may revisit, the element that carries the attributes of a fallback (O15, C2-X-035) and the fallback written unresolved after a renderer throws (O17, C2-X-050). A change to the mechanism is recorded in `UPGRADING.md` with the release that makes it. Today the catalog is one extension, tabs (C2-X-039 to C2-X-048).

## Engine gaps from the 18 November rulings

- D1, C2-B-042 and C2-B-044: the reference engine still makes one list for `v. x` followed by `vi. y`; the first marker fixes alphabetic style, so the second begins a roman list. CC-1207 tests the same rule with `m.` and `mi.`.
- D2, C2-I-023 and C2-I-024: the reference engine still lets a line comment stop before a bracket or braced closer; `^[a %% c] d` must render `<p>^[a</p>`. CC-1208 tests a closer on a later line. It also still reads `%%` directly after `[`, `^[` or `:name[` as a line comment; `[%% c] d` must render `<p>[%% c] d</p>`. Directly after a braced opener it already keeps `%%` as text (CC-1216). The engine fails CC-145 to CC-152, CC-316 to CC-320, CC-1208, CC-1217 and CC-1218.

### `carve-js` and `carve-php`

- D1, C2-W-028 with C2-B-038, C2-B-039 and C2-B-049: CC-1215 writes adjacent ordered lists of different styles without the required separation. The changed `syntax-blocks-284` tree fixture also expects the `v.` and `vi.` markers to make separate lists under C2-B-042 and C2-B-044.
- D2, C2-I-023 and C2-I-024: the changed `syntax-inline-128` and `syntax-inline-18` tree fixtures expect a line comment to take the bracket closer and the rest of its line.
- D3, C2-X-052 and C2-X-043: CC-1219 and CC-1234 require the registered build-time tabs renderer in static mode.
- D4, C2-X-053 and C2-X-055: CC-1221, CC-1229 and CC-1230 require the ordered document transforms and transformed-view id checks.
- D5, C2-X-057 and C2-X-058: CC-1222 and CC-1223 require the registered `wiki` and `cite` inline matchers.
- D6, C2-X-056 and C2-X-043: CC-1231 and CC-1232 require the first marked tab to be selected.
- D7, C2-X-059 and C2-X-060: CC-1225 to CC-1228 require the `imgFence` matchers, trusted sanitizer and narrow URL-policy exception.

### `carve-rs`

- D1, C2-W-028 with C2-B-038, C2-B-039 and C2-B-049: CC-1213 and CC-1215 need ordered-list style separation in the writer. The changed `syntax-blocks-284` tree fixture also expects the `v.` and `vi.` markers to make separate lists under C2-B-042 and C2-B-044.
- D2, C2-I-023 and C2-I-024: the changed `syntax-inline-128` and `syntax-inline-18` tree fixtures expect a line comment to take the bracket closer and the rest of its line.
- D3, C2-X-052 and C2-X-043: CC-1219, CC-1220 and CC-1234 require both renderer channels and the static tabs output.
- D4, C2-X-053 and C2-X-055: CC-1221, CC-1229 and CC-1230 require the ordered document transforms and transformed-view id checks.
- D5, C2-X-057 and C2-X-058: CC-1222 and CC-1223 require the registered `wiki` and `cite` inline matchers.
- D6, C2-X-056 and C2-X-043: CC-1224 and CC-1231 to CC-1233 require quoted tab titles and the first marked tab selection rule.
- D7, C2-X-059 and C2-X-060: CC-1225 to CC-1228 require the `imgFence` matchers, trusted sanitizer and narrow URL-policy exception.

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
- **O24.** The editor adapters of the importer are the import option `adapter` (C2-M-102 to C2-M-110, rows `adapters` of `data/import-html.json`, ruling of 20 November on #6235): `word` and `google-docs` run the note pass, the other values change nothing, as in 0.1. `allowAbsolute` (C2-N-012) and `includedBy` (C2-T-020) have no clause case: the corpus resolver serves names, not paths, and `includedBy` is optional.
- **O25 resolved.** The 19 November rulings classify a caret line by shape before its host test (C2-B-146), write authored tabs wrapper attributes and give code groups their own id scheme (C2-X-047, C2-X-048), render every entry of a claimed references directive (C2-X-058), carry the three export targets with engine-defined output and loss codes (C2-T-003, C2-W-106), and merge renderer-generated style through the host helper (C2-X-033). See #6121 to #6125.

The O25 cases on the 19 November `next2` engine heads have no readiness regression. CC-1371 passes all three engines. CC-1372 passes `carve-js` and differs in the `carve-php` and `carve-rs` HTML wrappers. CC-1373 passes `carve-rs`; the `carve.codeGroup` registration used by that case is refused by `carve-js` and `carve-php`.
- **O23.** O15 and O17 have no clause case, since no corpus option registers an extension. The other points of the round of candidate 7 are decided by the ruling of 17 November, 13:55 (UPGRADING, "Rulings of 17 November 2026, 13:55").

## Engine gaps from the parity ruling of 19 November

- `carve-js`: `softBreak`, `allowLosses`, `maxLosses` and `positionOf` are not offered (CC-1235 to CC-1249, CC-1250 to CC-1271, CC-1287 to CC-1301). `codeBlockRenderer` is offered, but a result that is neither text nor nothing throws a `TypeError` where C2-H-207 asks for `CarveOptionError` (CC-1285). The option table of the engine names `codeBlockRenderer` outside `data/options.json`; it is a row there now. The upgrade tool has no entry for U-420 to U-422.
- `carve-php` and `carve-rs`: all four features, on the reference engine's lead.

## Engine gaps from the tabs mode ruling of 19 November

- All three engines, C2-X-043, C2-X-047, C2-X-048 and C2-X-056: the standard tabs renderer takes no host option `mode`, so the `aria` cases CC-1302 to CC-1306, CC-1308 and CC-1309 are unsupported in the readiness runners until an engine offers it. CC-1307 fails: the `css` wrapper drops an authored `role` and `aria-labelledby` of the `carve.tabs` node instead of writing them in place of the generated ones.

## Engine gaps from the ruling of 20 November on the editor adapters

The import option `adapter` (C2-M-102 to C2-M-110, #6235) adds Example 65 of `import-html.md` and the clause cases CC-1419 to CC-1437. No engine at the baseline heads offers it: `carve-js` implements it first, then `carve-php` and `carve-rs`.

## Engine gaps from the rulings of 19 November, 12:00

Measured with the readiness runner on the engine heads of `scripts/next2-readiness-baseline.json`.

- `carve-js`: `lint` refuses `headingIds` (CC-1310, CC-1312, CC-1313); a degraded line block writes one paragraph per line (CC-1315, CC-1316); a task item's `aria-label` reads the degraded children (CC-1317, CC-1318); `encodeTree` keeps construction order, so the tree fingerprint differs (CC-1338); the `ascii` transliteration leaves a Hangul syllable decomposed (CC-1341); the standard extensions of C2-X-061 to C2-X-065 and the `wiki` display text are not registered by name (CC-1342 to CC-1346). `diffTree`, `applyPatch` and `sourceFingerprint` pass (CC-1319 to CC-1337); the calls are exported from the package entry, not from `src/index.ts`. The upgrade tool has no entry for U-423 to U-425.
- `carve-php`: `lint` refuses `headingIds` (CC-1310, CC-1312, CC-1313); `diffTree`, `applyPatch` and the fingerprints are not offered (CC-1319 to CC-1338); the transliteration table (CC-1339 to CC-1341); the standard extensions of C2-X-061 to C2-X-065 and the `wiki` display text (CC-1342 to CC-1346).
- `carve-rs`: `lint` and `carve lint` do not read `headingIds` (CC-1310, CC-1312 to CC-1314); a degraded line block writes one paragraph per line (CC-1315, CC-1316); `diffTree`, `applyPatch` and the fingerprints are not offered (CC-1319 to CC-1338); the transliteration table (CC-1339, CC-1340); the `details` and spoiler fallback and the `wiki` display text (CC-1345, CC-1346); the importer refuses `labels` (CC-1347).

## Engine gaps from the spec batch of 19 November

Measured with the readiness runner on the engine heads of `scripts/next2-readiness-baseline.json`; the command lines of CC-1352 to CC-1366 were also run against `carve-js` `next2` `7589dbc`.

- All three engines, C2-X-024, C2-X-059 and C2-X-061: an attributed fallback that is the claimed code block writes its attributes on the wrapper only (CC-1348, CC-1349). C2-X-048: an authored id that only starts with `tabs-N-` moves no group in `css` mode (CC-1350); CC-1351 needs the `aria` mode.
- `carve-js`: the engine at the baseline head has none of the commands of C2-T-047 to C2-T-053; `next2` `7589dbc` passed CC-1352 to CC-1366 as they stood before #6523 changed CC-1352 and CC-1354, but CC-1359, where it writes the include entries before the category line that C2-T-039 puts first. C2-B-109: a `> %%%` line under a comment block opened in `> >` closes it (CC-1369). The upgrade tool has no entry for U-426 to U-429 and still treats U-393 as no change.
- `carve-php`: the commands and flags of C2-T-047 to C2-T-053 (CC-1352 to CC-1364); `djot-plus-bullet` after a quote marker (CC-1367); the comment closer of C2-B-109 (CC-1369); the `destination-denied` column of CC-1271.
- `carve-rs`: the commands and flags of C2-T-047 to C2-T-053 (CC-1352 to CC-1365); `djot-plus-bullet` after a quote marker (CC-1367).

## Engine gaps from the lint rulings of 20 November

The maintainer rulings on #6191 to #6196: `blockquote-marker-without-space` and `colon-fence-length-mismatch` state their range, `block-opener-overindented` reports the whole opening mark, an include directive is no block opener for `list-item-block-overindented`, a colon run in a quote or item inside a div is not compared with the div, an attribute-shaped paragraph line gets only `block-opener-without-blank-line`, and C2-W-143 says which lines are blank for lint. Clause cases CC-1389 to CC-1399. Measured on the engine `next2` heads of 20 November.

- All three engines: the frontmatter message is reported on the `>` alone (CC-1390); an overindented code fence is reported on its first backtick (CC-1392).
- `carve-js`: the overindented div opener is reported on three colons (CC-1391); an include directive line past an item's content column is reported (CC-1393); a colon run in a quote or item inside a div is compared with the div (CC-1395, CC-1396).
- `carve-php`: CC-1391 and CC-1393 as `carve-js`; the colon run range takes the trailing spaces (CC-1394); an attribute-shaped paragraph line also gets `unattached-block-attribute` (CC-1397); a `>` line in a quote is not blank (CC-1398).
- `carve-rs`: the line range of `blockquote-marker-without-space` is the `>` alone (CC-1389); CC-1395 and CC-1396 as `carve-js`; CC-1397 as `carve-php`; a `>` line in a quote gets the other message of `unattached-block-attribute` (CC-1398).

## Engine gaps from the writer fixes of 20 November

C2-W-145 writes a span count that no mark cell gives with span marks, and C2-W-146 escapes the opening run of a bare mark pair that a pair rule of lint would report (#6269, #6270). Clause cases CC-1450 to CC-1467. Measured on the engine `next2` heads of 20 November.

- All three engines: an imported or supplied span count is written short and reported as `field-unspellable` (CC-1450 to CC-1457); a bare mark pair is written bare, and lint reports the output (CC-1458 to CC-1463). CC-1464 passes.
- All three engines: the `deprecated-bare-*` rules report a pair whose opening mark a combining mark or a zero-width joiner follows (CC-1465 to CC-1467, #6275).

## Engine gaps from the linear link-gap row of 21 November

The `link-gap-before-destination` row of `data/lint-model.json` states a pattern a backtracking engine runs in linear time, and its report reads the destination alone, as the catalog row says (#6297). Clause cases CC-1476 to CC-1479. Measured on the engine heads of `scripts/next2-readiness-baseline.json`.

- `carve-js`: the baseline head passes. The `next2` head (`8f233a3`) runs the old row from its copy of the lint model, so the label `(` of `[a(] ( )` makes a finding (CC-1479) until that copy takes the new row.
- `carve-rs`: a run of `[` in front of one label is reported from its last `[`, not its first (CC-1477, markup-carve/carve-rs#4547).

## Engine gaps from the attribute line between two lists of 21 November

C2-W-005 with C2-B-024: where the second of two adjacent lists that C2-W-028 writes without blank lines carries attribute lines, one blank line stands above them, or they would be lazy lines of the last paragraph of the first list (#6308). Clause cases CC-1480 to CC-1484.

- All three engines write the attribute line directly below the first list (CC-1480 to CC-1484).

## Engine gaps from the linear lint rows of 21 November

The `bare-html-tag`, `empty-reference-definition` and pair rows of `data/lint-model.json` state patterns a backtracking engine runs in linear time, and the pair scan gives the group `backslashes` (#6305). Clause cases CC-1485 to CC-1491. Measured on the engine heads of `scripts/next2-readiness-baseline.json`.

CC-1491 holds 10,000 copies of `x_a_ ` again (#6314); the three engines pass it in linear time since markup-carve/carve-rs#4549 and markup-carve/carve-php#5525 were fixed.

## Engine gaps from the writer budget ruling of 21 November

C2-W-133 gives the writer one repair budget per document, 24,000,000 characters or 1,000 times the document where that is more, summed over all groups; once it is spent, every later group that needs a repair parse is refused, and C2-W-010 calls the limit linear in the document (#6304). Clause cases CC-1492 and CC-1493.

CC-1493 is engine-local (`engineLocal`): its revised expectation is no refusal for a writer that reparses each quote once per C2-W-088 round and escapes every opener of each reported kind in that round. A writer that decides those escapes from tables can use no repair parse (C2-W-089); other repair strategies can spend a different amount of the budget.

- `carve-rs`: the repair limit is per group rather than per document (markup-carve/carve-rs#4538); CC-1492 still checks the shared limit.

## Engine gaps from the writer kind ruling of 22 November

A C2-W-088 repair round now escapes every potential opener of each reported kind in the block, not only the reported openers, and a group whose kind rounds leave a node unread is written again by rounds of the reported openers only (markup-carve/carve-js#5283, option B). The rounds of a block are bounded by the number of kinds, so the writer stays linear on escape-dense text. CC-1492, CC-1566 and CC-1568 moved; CC-1565, CC-1567 and CC-1493 keep their bytes; CC-1631 to CC-1633 are new.

- `carve-js`: the round escapes the reported openers only (markup-carve/carve-js#5334).
- `carve-php`: the round escapes the reported openers only (markup-carve/carve-php#5589).
- `carve-rs`: the round escapes the reported openers only (markup-carve/carve-rs#4579).

## Engine gaps from the trailing-space ruling of 21 November

Spaces and tabs that a writer would leave at the end of a source line in text are insignificant (C2-W-151, C2-W-002, #6319). Clause cases CC-1494 to CC-1504.

- All three engines: CC-1494 to CC-1502 report `structure-unspellable` or `field-unspellable` for the dropped spaces and tabs; each engine stops reporting them.

## Engine gaps from the headingShift ruling of 21 November

`headingShift` is a core render option (C2-H-208, C2-H-209, #6325). Clause cases CC-1505 to CC-1541.

- No clause case pins `headingNumbers` after the shift; C2-H-208 states that every transform sees the shifted levels.

## Engine gaps from the pinned lint cases of 21 November

The `definition-term-block-folded` row of `data/lint-model.json` reports the quote mark or list marker alone, as its catalog row states, and the `github-alert-marker` row skips a line whose first `>` is glued to a character other than the `[` of the alert mark (C2-B-031, #6333). Clause cases CC-1542 to CC-1549. Measured on the engine `next2` heads of 21 November: carve-js `1c2f784`, carve-php `d1d573c`, carve-rs `5620cee`.

- `carve-js`: CC-1543, CC-1544, CC-1548 and CC-1549 pass once it pins these rows; its rules read them from the data.
- `carve-php`: CC-1542 (`bare-html-tag` on `<x]>`), CC-1544 (only the `1` of `12.`), CC-1546 and CC-1547 (`caption-looking-paragraph` on term text).
- `carve-rs`: CC-1542, CC-1546, CC-1547 and CC-1549 (`github-alert-marker` behind `>[x]:`).

## Engine gaps from the lint row fixes of 21 November (second round)

The `github-alert-marker` row skips a line whose first `>` is glued to a `[!` that opens no alert tag (#6338), `delimited-table-wide-row` takes its width from the first record of the table behind empty groups, read with the new `field` of `find` (C2-W-150, #6337), and `blockquote-marker-without-space` reports a `>` followed by a tab and text (C2-B-031, #6344). Clause cases CC-1550 to CC-1556.

- `carve-js`: CC-1550, CC-1555 and CC-1556 pass once it pins these rows; CC-1552 to CC-1554 also need `field` of `find` in `lint/generate-data-tables.ts`.
- `carve-php` and `carve-rs`: data mode follows the pin once their interpreters read `field` of `find`; hand-written rules need the same three readings.

## Engine gaps from typed metadata blocks, 21 November

All three engines now read later typed blocks with their keys, tree positions, lint, includes, `flatten` and the writer (carve-js#5365, carve-php#5614, carve-rs#4595). Measured on 23 November with the readiness runner on the `next2` heads `f33d83eb` (carve-js), `d365a9e7` (carve-php) and `b1ca55c3` (carve-rs), and with a fuzz round of 3,600 generated documents. CC-1663 now passes in all three engines. The C2-W-155 cases CC-1674 to CC-1698 are listed in the sections of the 23 November rulings below. Still open:

- `carve-js`: `unclosed-frontmatter` carries the 0.1 message instead of the template of `data/lint-rules.json` (CC-613, CC-1601; carve-js#5409).
- `carve-php`: a column-0 typed opener after a description list or a footnote and a blank line stays text (C2-B-232, #6429).
- `carve-rs`: the same after a description list (#6429); a comment-only line between the blank line and the opener keeps the block from opening (C2-B-137, carve-rs#4612); `flatten` writes the leading frontmatter of an included file (C2-T-047, CC-1611; carve-rs#4613).

## Engine gaps from the typed opener separation ruling of 22 November

The ruling on #6389 drops the list close before a column-0 typed opener: without a blank line or pending attribute lines above it, the opener is a lazy line of the open paragraph, also in a list (C2-B-232, C2-B-024). C2-W-154 writes a top-level paragraph whose first line would read as a typed opener with that line indented by one space. CC-1613 is re-pinned; clause cases CC-1653 to CC-1655 are added. Measured on `carve-js` `next2` `b52c31a2` with the list close removed: conformance differs only in CC-1613.

- `carve-js`: drop the list close before a typed opener (CC-1613) and write the indent of C2-W-154 (CC-1653); it reports `structure-unspellable` there today.
- `carve-php` and `carve-rs`: the same two rules, with their ports of #6324.

## Engine gaps from the opener-after-a-closed-list ruling of 23 November

The ruling on #6394 (option 1) writes a typed-opener paragraph directly after a list whose last block takes no lazy line, as a closed code block, a closed div, a table or a heading: on the next line, at column 0 and with no blank line, the source form that C2-B-026 and C2-B-232 read back (C2-W-154). With an attribute line the paragraph keeps the blank line and the indent. Clause cases CC-1656 to CC-1661 are added. Measured on `carve-js` `next2` `bc0e1fcf`: the trees of CC-1655 to CC-1659 and CC-1661 already match; `fmt` refuses CC-1656 to CC-1660 with `structure-unspellable`. Each expected source reads back as the tree of its input, and so do 1,200 variants of the direct spelling (list markers, nesting, fences, divs, tables, headings, thematic breaks, format names).

- `carve-js`: write the paragraph directly after the list (CC-1656 to CC-1659) and keep the indent below an attribute line (CC-1660).
- `carve-php` and `carve-rs`: the same, with their ports of #6389.

## Engine gaps from the frontmatter cross-reference fix of 23 November

The `frontmatter-crossref` row of `data/lint-model.json` (#6390) matches ids under NFC, as C2-I-097 and the `broken-crossref` row do, and reports only where the id has no cross-reference target (the `xref` field of C2-W-150), so a heading that shares the id keeps the reference resolved (C2-I-096). Clause cases CC-1663 to CC-1665 are added; CC-1665 combines both, a decomposed metadata id and a precomposed heading id that the reference matches under NFC. Measured with the readiness runner on the engine heads of `scripts/next2-readiness-baseline.json`: CC-1664 passes in all three engines; on `carve-js` `next2` `9947883` all three cases pass, in data mode with the fixed row and with the hand-written rule.

- All three engines at the baseline heads: a precomposed reference to a decomposed metadata id reports `broken-crossref` instead of `frontmatter-crossref` (CC-1663).

## Engine gaps from the indented-list ruling of 23 November

The ruling on #6398 (option 1) gives the typed-opener paragraph after a list whose last block takes a lazy line a spelling: every line of the list is written indented by one space, and the paragraph follows below a blank line with its first line indented by one space (C2-W-155). Clause cases CC-1673 to CC-1678 are added. Measured on `carve-js` `next2` `3700e6d`: the trees of CC-1673 and CC-1675 already match, and CC-1678 already passes; `fmt` refuses CC-1674, CC-1676 and CC-1677 with `structure-unspellable`. 9,282 variants (ten marker kinds, one to three items, tight and loose, twelve lazy endings: paragraphs of one and two lines, quotes, nested quotes, nested lists of two levels, a paragraph after a fence; five preceding contexts including an attribute line; three format names) read back as the list followed by the text paragraph, with the list unchanged.

- `carve-js`: write a list whose last block takes a lazy line indented by one space before a typed-opener paragraph (CC-1674, CC-1676, CC-1677).
- `carve-php` and `carve-rs`: the same, with their ports of #6394.

## Engine gaps from the opener-after-a-closed-container ruling of 23 November

The ruling on #6397 (option 1) extends the direct spelling of C2-W-154 from lists to footnotes and descriptions: where the container ends in a block that takes no lazy line, the typed-opener paragraph goes on the line directly after it, at column 0 and with no blank line; where it ends in one that takes lazy lines, the shape keeps the loss report. Clause cases CC-1666 to CC-1672 are added. Measured on `carve-js` `next2` `99478833`: the trees of CC-1666, CC-1668, CC-1670 and CC-1671 already match; `fmt` refuses CC-1667, CC-1669 and CC-1672 with `structure-unspellable`. 1,200 variants of the direct spelling (footnotes and descriptions, the closed block on the marker line or below it at three indents, a second note or term, fences, divs, tables, headings, a nested list, four preceding contexts, three format names) read back as the container followed by the text paragraph, with the container unchanged.

- `carve-js`: write the paragraph directly after a footnote or a description that ends in a closed block (CC-1667, CC-1669) and keep the indent below an attribute line (CC-1672).
- `carve-php` and `carve-rs`: the same, with their ports of #6394.

## Engine gaps from the indented description list ruling of 23 November

The ruling on #6409 (option 1) extends C2-W-155 to description lists: where a typed-opener paragraph follows a description list whose last block takes a lazy line, every line of the description list is written indented by one space, and the paragraph follows below a blank line with its first line indented by one space. A footnote that ends in such a block keeps the loss report (C2-W-154). This narrows the description part of the #6397 ruling above. Clause cases CC-1679 to CC-1684 are added. Measured on `carve-js` `next2` `3700e6d`: the trees of CC-1679 and CC-1681 already match, and CC-1684 already passes; `fmt` refuses CC-1680, CC-1682 and CC-1683 with `structure-unspellable`. 1,350 variants (fifteen lazy endings: paragraphs of one and two lines, a paragraph after a blank line, quotes, nested quotes, bullet and ordered lists, nested lists, a quoted list, a paragraph after a fence, a nested description list, inline markup; one to three terms with one or two descriptions; six preceding contexts including attribute lines; three format names) read back as the description list followed by the text paragraph, with the description list unchanged. In none of them does the direct column-0 spelling read back.

- `carve-js`: write a description list whose last block takes a lazy line indented by one space before a typed-opener paragraph (CC-1680, CC-1682, CC-1683).
- `carve-php` and `carve-rs`: the same, with their ports of #6398.

## Engine gaps from the indented list below an open container (#6418)

C2-W-155 now keeps its spelling only where the indented list stays top-level. Where the block directly above it is a list, a description list or a footnote, that container would own the indented list below the blank line (C2-B-025), so the writer departs in a fixed order, the smallest departure first (C2-W-005): an attribute line of the written list goes to column 0, which closes the container (C2-B-097, C2-B-091); otherwise a list or description list above is indented by one space as well, and the same test applies to it; otherwise, as below a footnote, the paragraph reports `structure-unspellable` (C2-W-117). The writer adds no attribute. Clause cases CC-1685 to CC-1698. Measured on `carve-js` `next2` `95298e5`: the trees of CC-1685 and CC-1688 already match; `fmt` writes the old C2-W-155 spelling for CC-1686, CC-1687 and CC-1689 to CC-1694, which reads back to another tree, and `write` gives no loss report for CC-1695 to CC-1697. A generator over chains of up to three blocks above the list (paragraphs, quotes, fences, headings, footnotes, description lists, lists, nested lists, closed and lazy endings, with and without attribute lines; 35,352 trees without a comment node) found every tree the rule spells reading back, and no spelling of the enumerated columns, indents and attribute-line positions for the 1,600 trees it refuses. Of the trees with a comment node between the container and the list, the ones with an attribute line already read back; the rest keep the comment rules.

- `carve-js`: apply the departures of C2-W-155 below a list, description list or footnote (CC-1686, CC-1687, CC-1689 to CC-1694, CC-1698) and report `structure-unspellable` where none keeps the tree (CC-1695 to CC-1697).
- `carve-php`: carve-php#5642 refuses every such shape; it needs the same spellings.
- `carve-rs`: the same, with its port of #6398 and #6409.

## Engine gaps from a line comment above the indented list (#6430)

C2-W-155 named a comment between the indented list and the container above as something that keeps the list top-level. A line comment does not: a comment-only line closes no container (C2-B-137), so the container still takes the indented list. The clause now says that only a comment block, a region marker line, or the line comment of C2-W-123 that ends the container with its open fence, closes it. A line comment there that C2-W-122 does not spell is written at column 0 and reported, and the blocks around it are written as without it. Clause cases CC-1705 to CC-1712. Measured on `carve-js` `next2` `7dfff21`, `carve-php` `next2` `a17010d` and `carve-rs` `next2` `78ae0ae`: the comment block cases (CC-1709) pass in all three.

- `carve-js`: indent the list or description list above across a line comment (CC-1705 to CC-1707), and report the paragraph as well below a footnote (CC-1708).
- `carve-php`: indent the list above a paragraph that follows it across a line comment (CC-1707), and take no departure behind the open fence of C2-W-123 (CC-1711).
- `carve-rs`: report the line comment instead of the paragraph and indent the container above (CC-1705 to CC-1708, carve-rs#4608), and keep the spellings of CC-1710 to CC-1712, which it now reports as losses.

## Engine gaps from the closing-note ruling of 23 November (#6453)

The ruling on #6453 (B with the tie-break) keeps C2-I-089's "Unclosed, the two characters are text": what follows an `^[` that never closes reads as ordinary inline content, so a footnote reference or an inline footnote there opens as usual. The new sentence of C2-I-089 decides a note whose closing depends on a caret pair inside it: that note is text, and the caret pair an ordinary bracket. Clause cases CC-1713 to CC-1716. Measured on `carve-js` `next2` `ed72bbf0`: CC-1714 and CC-1715 pass; the ticket measured `carve-php` `next2` `33bccd4d` and `carve-rs` `next2` `ba50b123`.

- `carve-js`: read the note of CC-1713 and CC-1716 as text, with no note inside a note.
- `carve-php` and `carve-rs`: open the footnote reference and the inline footnote behind an `^[` that never closes (CC-1714, CC-1715).

## Engine gaps from the command-line extension ruling of 23 November (#6436)

The ruling on #6436 (option 2) gives `render`, `fmt`, `lint` and `ast` the flags `--extensions`, a JSON list of the standard extension names of `data/extensions.json`, and `--extension-options`, a JSON object of their renderer options keyed by extension name (C2-T-010). A name that is no standard extension is a usage error; a host extension or renderer stays an option of the library calls only, and there is no `--extensions all`. The flags restore the 0.1 command-line output of tabs, mermaid, details and the other standard extensions. CC-533, which pinned the refusal of `--extensions`, now expects the core output of an empty list; clause cases CC-1717 to CC-1722 are added. No engine at the baseline heads offers the flags: the ticket measured `carve[usage]: unknown flag --extensions for render` in all three.

- All three engines: take `--extensions` and `--extension-options` on the four commands (CC-533, CC-1717, CC-1718, CC-1721, CC-1722) and refuse an unknown name with `usage` (CC-1719, CC-1720).

## Engine gaps from the table key order ruling of 23 November

The maintainer ruling on #6431 places the table keys the writer makes from the table fields (C2-W-136): they stand after the keys of `attrs`, in the order C2-W-136 lists them. Clause cases CC-1699 to CC-1704. Measured on `carve-js` `next2` `7ccf200`, `carve-php` `next2` `1992f1c` and `carve-rs` `next2` `887141d`: in every case the expected output reads back to the tree of the input in all three engines, and CC-1699 passes in all three.

- All three engines: the made keys are written before the keys of `attrs` (CC-1701 to CC-1704).
- `carve-php`: the body keys are written before `header-rows` and `footer-rows` (CC-1700).

## Engine gaps from the tag and mention end guard of 21 November

The ruling on #6327 ends a mention or a tag only at a word edge: where the run of name characters behind the sigil is directly followed by a Unicode letter, number or mark, the sigil and the run are text (C2-I-092). C2-W-125 escapes a hyphen or dot that would keep the node from forming, and C2-W-117 reports a node that no backslash keeps apart. Clause cases CC-1634 to CC-1644. Measured on `carve-js` `next2` `d627349`; the ticket measured the same split in all three engines.

- All three engines: the tag or mention ends at the last ASCII name character, so `#größe` gives the tag `#gr` (CC-1634 to CC-1637, CC-1639 to CC-1641); the writer writes the hyphen or dot behind a tag bare (CC-1643) and reports no loss for a tag glued to a letter outside ASCII (CC-1644). The emoji boundary (CC-1638) and the format case (CC-1642) pass.

## Engine gaps from the braced-sibling ruling of 23 November (#6420)

The ruling on #6420 keeps C2-W-069 as written: an emphasis or strong node directly after a braced sibling of its own kind is written bare where the bare delimiter opens and closes at that position, since C2-W-070 braces only an ancestor or a descendant of the same kind. Clause cases CC-1723 to CC-1728. Measured on `carve-js` `next2` `cad54c1`, `carve-php` `next2` `0f97efc` and `carve-rs` `next2` `d7dc5e0`: every expected source reads back to the tree of its input in all three engines, and `carve-php` passes all six. Of 362 generated sibling trees (emphasis and strong, a first span braced for a space edge, a letter before it or a nested span, fifteen second contents, six contexts), 159 differ, all in this direction.

- `carve-js` and `carve-rs`: a same-kind span directly after a span braced for C2-I-047 or C2-I-048 is braced too (CC-1723 to CC-1728).

## Engine gaps from the last lint rows as data (#6186)

Every active lint rule is now a rule of `data/lint-model.json` or names, in `hand_written`, the fact it needs that the line model does not give (C2-W-139); `spec2-data-check` enforces it. Nine rows move to data: `carve-version-unsupported`, `deprecated-indented-line-under-heading`, `djot-intraword-underscore`, `emphasis-marker-before-attributes`, `figure-group-panel-number`, `sigil-after-letter`, `unattached-inline-attribute`, `unclosed-braced-comment` and `unclosed-inline-emphasis`. Seven stay hand-written. Clause cases CC-1729 to CC-1752 pin the catalog reading where the hand-written rules of `carve-js` `next2` `cad54c1` differ. Measured on that commit: the hand-written rules fail 21 of the 24 cases; with the new rows generated into it, `carve-js` passes all 24 and the 72 earlier cases of these codes.

- `carve-js` hand-written rules: `sigil-after-letter` (CC-1729, CC-1730), `djot-intraword-underscore` (CC-1731, CC-1732), `deprecated-indented-line-under-heading` (CC-1733), `unclosed-braced-comment` (CC-1734, CC-1735), `unclosed-inline-emphasis` (CC-1736 to CC-1740), `emphasis-marker-before-attributes` (CC-1741, CC-1742), `carve-version-unsupported` (CC-1743, CC-1744, CC-1752) and `unattached-inline-attribute` (CC-1746 to CC-1751).

## Engine gaps from the early-closer ruling of 23 November (#6471)

The ruling on #6471 (option A) gives C2-W-125 an eighth case: where the opener a round would escape is a text `^[` that the C2-I-089 tie-break keeps as text, the bare `]` that closed the note early takes the backslash and `^[` stays bare, so a tree from a parse is kept (C2-W-091). Clause cases CC-1753 to CC-1756. Measured on `carve-js` `next2` `ce5de13`: of 30,000 generated trees of the shape (five contexts, five prefixes, ten note contents, five texts between, eight collapsed reference texts, three tails), the form of the eighth case reads back to the tree in every one, the form that escapes the opener instead reads back in none, and `carve-js` refuses all of them with `field-unspellable`. `carve-php` and `carve-rs` do not read the #6453 tie-break yet.

- `carve-js`: the writer refuses the tree instead of escaping the early closer (CC-1753 to CC-1756).

## Engine gaps from the kind-round strong ruling of 23 November (#6482)

The ruling on #6482 (option A) applies C2-W-069 in every round of C2-W-088, the kind rounds included: a strong or emphasis whose bare delimiter would not open or close where it stands keeps its braced form there too. CC-1633 now expects the form of the kind rounds, which escape every backtick opener of the paragraph. The fallback of C2-W-088 keeps a case built for it, CC-1757: the kind round escapes the bracket inside a collapsed reference text, which turns the link into text, so only the reported opener takes a backslash. Measured on `carve-js` `next2` `fd6bcc33`, `carve-php` `next2` `f7f4ee23` and `carve-rs` `next2` `05e843ca`: `carve-php` passes both cases, and CC-1757 passes in all three.

- `carve-js` and `carve-rs`: take the braced form of C2-W-069 in the kind rounds as well, not only in the rounds of the reported openers (CC-1633).

## Engine gaps from the opaque-body comment line ruling of 23 November (#6439)

The ruling on #6439 (Reading 1) reads C2-B-137 as written: where a comment-only line ends the opaque body of a nested item and no item owns the line, only the container that holds the body closes with it. The line is then a comment-only line and closes no container, so the outer item stays open. This holds for a code fence and a comment block alike. Clause cases CC-1758 to CC-1760; CC-1760 is row D of the ticket. Measured on `carve-js` `next2` `200f575` and `carve-php` `next2` `c2d9115`; the ticket measured `carve-rs` `next2` `05e843ca`. `carve-js` with markup-carve/carve-js#5492 passes all three.

- All three engines: the comment-only line also closes the outer item, so `y` is a paragraph after the list (CC-1758, CC-1759), and the `%%%` below it opens a comment block at the root that hides `z` (CC-1760).

## Engine gaps from the migration-notice ruling of 23 November (#6499)

Mark's ruling on #6499: a lint rule that reports valid 0.2 text only because 0.1 read it differently does not fire on a 0.2 document. C2-W-156 gives these five rules the default `upgrade`: `deprecated-indented-line-under-heading`, `comment-fence-closer-with-text`, `sigil-after-letter`, `blank-reference-label` and `tight-list-item-with-blank-line`. They are on for a document whose line-1 frontmatter declares Carve 0.1 and under the new lint option `upgrade` (`--upgrade`). CC-683, CC-687, CC-699, CC-817, CC-987, CC-1729 and CC-1733 now set `upgrade`; CC-1761 to CC-1773 are new. Measured on `carve-js` `next2` `50e973c3`: it refuses the option `upgrade` (CC-683, CC-687, CC-699, CC-817, CC-987, CC-1729, CC-1733, CC-1765, CC-1766) and reports the four rules by default (CC-1761, CC-1764, CC-1769 to CC-1771, CC-1773); CC-1762, CC-1763, CC-1767, CC-1768 and CC-1772 pass.

- All three engines: read the default `upgrade` of `data/lint-rules.json`, the 0.1 declaration of the line-1 frontmatter and the option `upgrade` with its flag `--upgrade` on `lint` and `fix` (C2-W-156).

## Engine gaps from the lint path ruling of 23 November (#6498)

The auto-ruling on #6498 states which node the `path` of a data-rule finding names, per kind of record (C2-W-157, `paths` of `data/lint-model.json`): a block or inline record its node, a text run the node whose children make it, an attribute record its owner, a line record its leaf block (a verbatim leaf and a `table_row` count), and a line of no leaf block the innermost block whose source holds it. Clause cases CC-1774 to CC-1785 pin the path for each kind. Measured on the 573 lint clause cases at the `next2` heads carve-js `50e973c`, carve-php `5812c2d1` and carve-rs `b144f270`.

- carve-js and carve-php: `list-item-body-below-content-column` names the item, not its block (CC-1774); a frontmatter line and a div closer name the document (CC-1783, CC-1785); a line of a pipe table names the table, not the row (CC-1784). carve-js reaches CC-1774 and CC-1782 through per-id code in `lint/data-rules.ts`, which the general line rule replaces.
- carve-rs: a text-run finding names the `text` child at its start (CC-1776, CC-1777), at a line break a `soft_break`; a line of a line block names the line block (CC-1779), a caption line the caption (CC-1780); a lazy heading line, a comment block line, a frontmatter line and a div closer name the document (CC-1781 to CC-1783, CC-1785); a line of a pipe table names the table (CC-1784).

## Engine gaps from the heading continuation in a footnote body (#6502)

A heading on the marker line of a footnote continues on lines indented past its marker (C2-B-154), which stands right of the footnote content column. `fmt` writes such a source unchanged (CC-1786). Measured on `carve-js` `next2` `4deb322e`: the writer puts the continuation at the content column and refuses the source with a loss report. markup-carve/carve-js#5499 passes CC-1786.

- `carve-js`: refuses CC-1786 with a loss report (fixed by markup-carve/carve-js#5499, merged into `next2` as `383040ef`).

## Engine gaps from the definition continuation ruling of 24 November (#6507)

The ruling on #6507 lets a link definition and an abbreviation definition continue on the lines directly below them that are indented past their marker (C2-B-083, C2-B-084). A link definition takes one such line when it holds exactly the rest of its tail; that line is no attribute line of the next block (C2-B-091). An abbreviation definition takes every such line, without its leading and trailing spaces and tabs, joined with one space. Examples syntax-blocks-290 and syntax-blocks-291, clause cases CC-1787 to CC-1805; the shapes that stay as before (CC-1795 to CC-1800, CC-1805) pin the boundary. The playground bundle of `carve-js` `next2` `50e973c3` reads every definition as one line.

- All three engines: take the indented tail line of a link definition and the indented expansion lines of an abbreviation definition and write them back on one line (syntax-blocks-290, syntax-blocks-291, CC-1787 to CC-1794, CC-1801 to CC-1804).

## Engine gaps from the second migration-notice ruling of 24 November (#6499)

Mark's second ruling on #6499: the `deprecated-` rules and every other rule whose only job is help in moving from 0.1 or Djot are migration notices too, so a valid 0.2 document lints clean with the default options. Nineteen more rows get the default `upgrade` of C2-W-156: the ten `deprecated-` rules of removed spellings, seven `djot-` rules (all but `djot-highlight-braces`), `description-term-multi-line` and `thematic-break-spelling`. CC-701, CC-703, CC-705, CC-709, CC-711, CC-713, CC-715, CC-717, CC-719, CC-721, CC-839, CC-893, CC-967, CC-969, CC-970, CC-972, CC-974, CC-975, CC-977, CC-982, CC-1024, CC-1026, CC-1083, CC-1117, CC-1164, CC-1377, CC-1378, CC-1468, CC-1469, CC-1742 now set the option `upgrade`, CC-1353 the flag `--upgrade`; CC-1806 to CC-1850 are new. Measured on `carve-js` at `b838714f` (carve-js#5500, the port of C2-W-156) with the data of this change: every lint clause case passes except CC-1076 and CC-1124, which fail without it too.

- carve-js: its catalog is generated from `data/lint-rules.json`, so the new defaults arrive with the spec pin once C2-W-156 is ported.
- carve-php and carve-rs: give the twenty-three rows the default `upgrade` (`description-term-multi-line` left the list with #6508) in their own rule lists (C2-W-156).

## Engine gaps from the label continuation ruling of 24 November (#6508)

Mark's ruling on #6508 makes the caption and the term labels like the heading (C2-B-234): they continue only on lines indented past their marker. With #6507 this gives one rule for every block: only a paragraph takes unindented lines, and every other block continues only on lines indented past its marker, except a fenced block, whose body runs to its closing fence or the end of its container (C2-B-111). A caret line directly below a caption in the same container is text with `unattached-caption` (C2-B-149). `description-term-multi-line` reports only a term line that starts with a description mark `:` and a space. Measured on the `carve-js` `next2` bundle the 0.2 playground pins (`063576947`); carve-php and carve-rs read captions and terms lazily too and are expected to show the same gaps.

- All three engines: an unindented line below a caption or a term still continues it. CC-070 (the last line captions the outer quote, C2-B-018), CC-721, CC-791, CC-1853 to CC-1860, CC-1865 to CC-1867, syntax-blocks-168 and syntax-blocks-293.
- All three engines: a second caret line directly below a caption continues it instead of being unattached text (CC-1861).
- All three engines: `description-term-multi-line` still reports every term continuation line (CC-982).
- carve-js `upgrade`: U-442 (#6716) writes a line 0.1 joined to a caption at the column of the caption text; a description mark 0.1 read below a term across a comment line is U-180. Clause cases CC-2095 to CC-2099 pin the spellings.

## Engine gaps from the follow-up ruling on #6507 (24 November)

The follow-up ruling on #6507 ends an abbreviation definition at every indented line that ends a heading continuation (C2-B-154, C2-B-234): a fence line, a table row, a thematic break or a region marker line starts its block, and only text lines continue the expansion. Example syntax-blocks-294, clause cases CC-1868 to CC-1879. Measured on `carve-js` `next2` `383040ef`, which reads every definition as one line: CC-1868 to CC-1875 pass and pin the end of the expansion for the port of #6507; CC-1876 to CC-1879 fail.

- All three engines: end the expansion of an abbreviation definition at an indented fence line, table row, thematic break or region marker line, and continue it on every other indented line (syntax-blocks-294, CC-1868 to CC-1879).
- carve-js `upgrade`: U-443 (#6717) writes a blank line between an abbreviation definition and an indented line 0.1 read as a paragraph. Clause cases CC-2105 and CC-2106 pin the spelling.

The same ruling adds the hint `link-definition-indented-line` (C2-B-083): an indented line below a link definition or its tail that is neither a title nor an attribute block is the next block, so a destination never continues on the next line. Example syntax-blocks-295, clause cases CC-1880 to CC-1889 and CC-1914 to CC-1916. Measured on `carve-js` `next2` `383040ef` with the data rows of this change: every case passes except CC-1883, whose tail line `carve-js` does not take yet.

- carve-js: the row arrives with the spec pin, since `lint/data-tables.ts` is generated from `data/lint-model.json`; CC-1883 passes once the tail of C2-B-083 is ported.
- carve-php and carve-rs: add `link-definition-indented-line` from its data row (CC-1880 to CC-1887, CC-1914 to CC-1916).

The same ruling lets the tail of a link definition span two indented lines: a title line, then an attribute block line, at most one of each (C2-B-083). `fmt` writes such a tail as it writes the same tail on the definition line. Example syntax-blocks-296, clause cases CC-1890 to CC-1899. `carve-js` `next2` `383040ef` takes no tail line, so all ten cases fail there.

- All three engines: take a title line and then an attribute block line as the tail of a link definition, and read a later tail part, a second title or a second attribute block as the next block (syntax-blocks-296, CC-1890 to CC-1899).

The same ruling adds the migration notice `continuation-reading-changed` (default `upgrade`, C2-W-156): the first indented line a link or abbreviation definition takes, the first indented line a term takes, and an unindented text line directly below a caption, which 0.1 took into the caption (measured on `carve-js` 0.1.17 and `carve-rs` 0.1.14). It is stated as two data rows of `lint-model.json`, a block row for the definitions and a line row for terms and captions. Example writer-47, clause cases CC-1900 to CC-1913 and CC-1917. Measured on `carve-js` `next2` `383040ef` with the data rows of this change and the rule turned on by `rules`: the term row reports CC-1907 and CC-1917; the cases with the option `upgrade` wait for the port of C2-W-156 (carve-js#5500), the definition cases for the port of #6507 and the caption cases for the port of #6508.

- carve-js: the rows arrive with the spec pin; the cases pass once C2-W-156, #6507 and #6508 are ported.
- carve-php and carve-rs: add `continuation-reading-changed` from its two data rows (writer-47, CC-1900 to CC-1913, CC-1917).

The ruling on #6523 keeps the lint default of every rule under `--fix` (C2-T-049, C2-W-156): a migration notice that has a fix rewrites only a document that declares a Carve version below 0.2, under `--upgrade`, or when `--rules` names it, and `--rules` turning it off keeps it off over both. CC-1352 keeps the `+` bullet of a 0.2 document, CC-1354 adds `--upgrade` and so ends with status 1, because `djot-subscript-tilde-braced` still reports the `{~s~}` it writes (C2-T-050, #6532), and clause cases CC-1926 to CC-1951 cover the five shapes of the ticket in a 0.2 document, under a `carve: 0.1` or `carve-version: 0.1.13` declaration, under `--upgrade`, named in `--rules`, and turned off by `--rules` under `--upgrade`. No default in `data/lint-rules.json` changes.

- All three engines: run `fix` with the lint defaults in place of turning every fixable rule on; `carve upgrade` and `applyMigrationFixes` keep turning the migration rules on.

## Engine gaps from the Djot migration-notice ruling of 24 November (#6522)

The ruling on #6522 adds five migration notices, each a hint with the default `upgrade` (C2-W-156) and no fix, stated as data rows in `lint-model.json`: `djot-emphasis-underscore-braced`, `djot-typography-sign`, `djot-definition-list`, `djot-ordered-marker` and `djot-tag-mention`. Clause cases CC-1952 to CC-1978.

- carve-js: the rows arrive with the spec pin, since `lint/catalog.ts` and `lint/data-tables.ts` are generated from the data files; the cases pass with the generated tables and no matcher code.
- carve-php and carve-rs: add the five rules from their data rows (CC-1952 to CC-1978).

## Engine gaps from the code span padding ruling of 24 November (#6525)

Mark's ruling on #6525: the spaces at the ends of a code span are part of its value. Only a space between a backtick and the opening or closing run is removed (C2-I-016, the Djot rule); 0.1 and earlier 0.2 removed one space from each end when both ends held one. The writer pads a side only when that side of the value is a backtick (C2-W-077), and a value that starts with a space and a backtick or ends with a backtick and a space has no spelling. The same holds for literal-text, math and raw inline spans. Example syntax-inline-8, clause cases CC-1979 to CC-1995. Measured on `carve-js` `next2` `9e136b0`: CC-1979, CC-1980, CC-1983, CC-1985, CC-1987, CC-1989, CC-1992, CC-1993 and CC-1995 fail; the others pass and pin the shapes that read as before.

- All three engines: keep the padding of a code, literal-text, math and raw inline span and remove only a space next to a backtick (syntax-inline-8, CC-1979 to CC-1993); pad a written code value only on its backtick side and report `field-unspellable` for a value that starts with a space and a backtick or ends with a backtick and a space (CC-1994, CC-1995).

The same ruling adds the migration notice `code-span-padding-kept` (default `upgrade`, C2-W-156), stated as one inline row of `lint-model.json`, and the upgrade row U-441. U-439 now reports a 0.1 value that starts with a space and a backtick or ends with a backtick and a space; a value that starts with a line break and ends with a backtick is spelled by U-258, with one space before the closing run. Clause cases CC-1996 to CC-2006. The row has no fix: it also reports a span where 0.2 removes a space 0.1 kept, whose 0.1 value often has no 0.2 spelling (C2-W-077), so its message names no single replacement (C2-T-049).

- carve-js: the rows arrive with the spec pin, since `lint/data-tables.ts` is generated from `data/lint-model.json`; CC-1996, CC-1998, CC-1999, CC-2003, CC-2004 and CC-2005 pass once C2-I-016 is ported. Its `upgrade` tool writes U-441 and moves the line-break shape from U-439 to U-258.
- carve-php and carve-rs: add `code-span-padding-kept` from its data row (CC-1996 to CC-2006).

## Engine gaps from the heading numbers ruling of 24 November (#6531)

The ruling on #6531 numbers headings by depth and has `carve.headingNumbers`, `carve.toc` and `carve.tocPlacement` count only the headings a section wraps. No 0.2 clause covers these extensions; extension cases EXT-095 to EXT-103 cite the ruling. Measured on `carve-js` `next2` `8924bed4` and `carve-php` `next2` `a335b4f5`: all nine pass. `carve-rs` at the head of carve-rs#4697 (`a4458689`) passes eight.

- `carve-rs`: `table_of_contents()` nests the entry after a skipped level by level, not by depth (EXT-101, carve-rs#4701).

## Engine gaps from the attribute value line break ruling of 24 November (#6542)

The ruling on #6542 (option A) gives an attribute value of a supplied tree that holds a line feed its nearest form: one space in place of each line feed, in double quotes, with `field-unspellable` at the path of the value; the node and its other attributes are kept (C2-W-050, C2-W-117). Clause cases CC-2010 to CC-2012 are added. Measured on `carve-js` `next2` `fdd53bf7`: the import refuses with `writer-refused`, and the write reports `structure-unspellable` for the span and the document. The issue measured `carve-php` writing the value over two lines with no report and `carve-rs` writing it unquoted over two lines; both read back as text.

- All three engines: write the value with one space per line feed and report `field-unspellable` at the value (CC-2010 to CC-2012).

## Engine gaps from the nested-link bracket ruling of 24 November (#6544)

The ruling on #6544 places a backslash in link text only where a C2-W-088 round or a C2-W-125 case for a node that did not form places it; a nested link alone is no reason. For a tree from a parse whose bare text reads back, the text brackets around a nested link stay bare (C2-W-088, C2-W-091). CC-1567 now expects its input unchanged. Measured on `carve-js` `next2` `fdd53bf7` and `carve-php` `next2` `2fb117558`: both escape every text bracket around the nested links; `carve-rs` `next2` writes the same escapes.

- All three engines: write CC-1567 unchanged, without `\[` and `\]` around the nested links.

## Engine gaps from the copied heading title ruling of 24 November (#6540)

The ruling on #6540 (option A) keeps a heading cross-reference inside the title copy of a `number-title` reference a reference: it is not expanded again and renders as a plain link with its target's title, so copies do not nest (C2-X-070). It moves the column Clauses of `extensions.md`; Rules and Exceptions wait for a recount. Extension cases EXT-104 to EXT-106 are added. Measured on `carve-js` `next2` `ac8afa9f` and `carve-php` `next2` `f6a50999`: both expand the copy again and fail EXT-104 and EXT-105; on EXT-106, a title that references its own heading, carve-js writes no numbers and carve-php exhausts 1 GiB of memory. The issue measured `carve-rs` `next2` with the same growth.

- All three engines: leave a cross-reference inside a title copy unexpanded (EXT-104 to EXT-106).

## Engine gaps from the div interrupter ruling of 24 November (#6545)

The ruling on #6545 (option 2) counts a list marker indented past a marker as interrupter (b) inside a div only when that marker belongs to an item, a description or a footnote body opened inside the div (C2-B-235). Clause cases CC-2013 to CC-2017 are added. Measured on `carve-js` `next2` `ac8afa9f` and `carve-php` `next2` `f6a50999`: all five pass. `carve-rs` `next2` `d2192115` passes CC-2013 and CC-2016.

- `carve-rs`: a bullet below a description inside a div, indented past the item's or the outer description's marker but not past the inner description's mark, closes the description and opens a list in the div; it is a lazy line of the description (CC-2014, CC-2015), and the library lint does not report it (CC-2017).

## Engine gaps from the tree-opener ruling of 24 November (#6566)

The ruling on #6566 (reading 2) makes a construct that opens on the opener of a node of the tree that node, also where it reads on past the tree's closer or ends early at a closer the tree holds as text. It is not reported and gives no kind; C2-W-125 repairs it (C2-W-088). Clause cases CC-2018 to CC-2020 are added. Measured on `carve-js` `next2` `8b4d4a7a` and `carve-php` `next2` `cd08d2e2e`: carve-js passes CC-2019 and escapes the last text `{,` in CC-2018 and CC-2020; carve-php passes CC-2018 and CC-2020 and writes `- {^}^\{a\^}\{^\^}^},,,}` for CC-2019. `carve-rs` was not measured.

- `carve-js`: report no kind for a span on the tree's own opener that reads on (CC-2018, CC-2020).
- `carve-php`: report no kind for a span on the tree's own opener that ends early (CC-2019).
- `carve-rs`: measure CC-2018 to CC-2020.

## Engine gaps from the attribute-block opener ruling of 24 November (#6570)

The ruling on #6570 (option A) adds case nine to C2-W-125: where a braced opener reads as the key of a valid attribute block, the first character of its content that makes the block valid gets the backslash, so an underline of `=.` is written `{_\=._}`. Clause case CC-2021 is added. Measured on `carve-js` `next2` `08df6978`: it writes `{_=._}` and reports `structure-unspellable`; `carve-php` `next2` `cd08d2e2` reports `writer-refused`. The issue measured `carve-rs` `next2` `3f79f926` writing `{_=._}` with `structure-unspellable`.

- All three engines: place the backslash of case nine (CC-2021).

## Engine gaps from the brace-kind ruling of 24 November (#6561, #6559)

The rulings on #6561 and #6559 let the text of C2-W-088 win over the older form pinned in CC-1568: every potential opener of a reported kind takes the backslash, and pairing does not count. CC-1568 now expects `\{^\^}` where it expected `\{\^\^}`; no other byte moves. Measured on `carve-js` `next2` `08df6978` and `carve-php` `next2` `cd08d2e2`: both write the old form. The head of carve-js#5550 (`0058adb0`) writes the new one.

- `carve-js`: carve-js#5550 (CC-1568 and the writer-slow fixture `4e78df2a673d1efc.out`).
- `carve-php` and `carve-rs`: write the new CC-1568 form.

## Engine gaps from the canonical caret and fence closer ruling of 24 November (#6585)

The ruling on #6585 (A1 + A2) has two parts. A1: canonical output also passes `unattached-caption`, so a caret line that it reports and whose caret the writer wrote takes a backslash, after a blank line, on a marked quote line or inside a paragraph (C2-W-146, C2-W-092): `^ second` below a captioned table and a blank line is written `\^ second`, and `> ^ cap` is written `> \^ cap`. A2: `fence-closer-indented` counts a closer below an opener on the marker line of an item, a description or a footnote body inside that container's content as C2-B-027 strips it, so a closer at or left of its content column is not reported; the data row and the catalog row say so. CC-2026 now expects no finding for the footnote fence of U-250. Clause cases CC-2029 to CC-2044 are added. Measured on `carve-js` `next2` `42644b71` and `carve-php` `next2` `99b0fd55`: both keep the caret bare (CC-2029 to CC-2035, CC-2037) and report the closers of CC-2026, CC-2039 and CC-2040; the new data row run in carve-js passes every lint case. `carve-rs` was not measured.

- All three engines: escape the caret that `unattached-caption` reports in written text (CC-2029 to CC-2035, CC-2037).
- All three engines: take the `fence-closer-indented` row of `data/lint-model.json` (CC-2026, CC-2039, CC-2040).

## Engine gaps from the write diagnostics order ruling of 24 November (#6619)

The auto-ruling on #6619 (option A) orders the entries of the writer on a supplied tree by their paths, as C2-L-011 orders sidecar entries: a node's own fields before the nodes in its slots (C2-W-158). CC-2045 compares four entries position by position, with the new conformance field `diagnosticsOrdered`. Measured on carve-js `next2` `9aa2b4d`: it lists `structure-unspellable` first, before the three `field-unspellable` entries. carve-php already lists them in path order.

- `carve-js` and `carve-rs`: list write diagnostics in path order (CC-2045).

## Engine gaps from the col style ruling of 24 November (carve-js#5574)

Mark's ruling on markup-carve/carve-js#5574 (B) reads the `style` of a `<col>` as CSS declarations (C2-M-041): split at `;`, each declaration trimmed, the property name compared without ASCII case, and the last `width` with a percentage value gives the column width. A col style still keeps no key, so one that gives no width or holds another declaration is reported as before. Cell alignment declarations stay exact (C2-M-040, C2-M-055). Clause cases CC-2046 to CC-2053. Measured on `carve-js` `next2` `3b24e235`: CC-2051 to CC-2053 pass; the ticket measured the exact reading in `carve-php` `next2` `3cd302834` and `carve-rs` `next2` `bd95dbe6`.

- All three engines: read the declarations of a `<col>` style (CC-2046 to CC-2050).

## Engine gaps from the leading header row ruling of 24 November (#6623)

Mark's ruling on #6623 (B) moves the leading rows of the first body of a table with no `<thead>` into the head when every cell of the row is a `<th>` with no `scope` or with `scope` `col` (C2-M-037). The move is not reported, and a body it leaves empty is dropped. A row with a `<th>` of `scope` `row`, a row that holds a `<td>`, and a `<th>` row below a body row stay in the body. CC-1450 and CC-2046 to CC-2052 move to the `|=` head. New clause cases CC-2054 to CC-2064. Measured on `carve-js` `next2` `3b24e23`: CC-2056, CC-2058, CC-2059, CC-2061 and CC-2063 pass; the ticket measured the body header row in `carve-php` and `carve-rs` `next2` as well.

- All three engines: import the leading `<th>` rows as the head (CC-1450, CC-2046 to CC-2052, CC-2054, CC-2055, CC-2057, CC-2060, CC-2062, CC-2064).

## Engine gaps from the head and foot ruling of 24 November (#6637)

Mark's ruling on #6637 (C) gives a table with a head, a foot whose first row has header cells only, and no body a spelling: with an empty `body-rows`, a `footer-rows` count smaller than the number of rows ends the head above the foot when the head would take one of its rows (C2-B-187), and the writer writes that form (C2-W-136). The ruling's sample put `body-rows` first; the made keys keep the C2-W-136 order, and the empty value is written bare (C2-W-049), so the form is `{footer-rows=1 body-rows}`. 0.1 wrote this table as `{header-rows=1 footer-rows=1 body-rows}`, which now reads as head and foot again. Clause cases CC-2065 to CC-2074. Measured on `carve-js` `next2` `8ae9ecdd`: CC-2067, CC-2068 and CC-2072 pass; the imports of CC-2073 and CC-2074 refuse with `structure-unspellable`. `carve-php` `next2` `fbcd050a` and `carve-rs` `next2` `441bc045` read CC-2065 as two head rows as well.

- All three engines: end the head above the foot (CC-2065, CC-2066, CC-2069), write the empty `body-rows` (CC-2070, CC-2071) and import such tables (CC-2073, CC-2074).

## Engine gaps from the dropped body attributes of the head move (#6640)

The head move of C2-M-037 drops a body it leaves empty. The text decides what happens to that body's attributes: C2-M-037 exempts only the move from the report, and C2-M-082 reports every fact the tree no longer holds, so they are reported with one `import-attribute-dropped` entry at the `<tbody>`. C2-M-037 now says so, and the code row cites it. Clause cases CC-2075 and CC-2076. Measured on `carve-js` `next2` `8ae9ecdd`: both pass. `carve-php` and `carve-rs` have not ported the #6623 move yet.

- `carve-php`, `carve-rs`: report the attributes of a body the head move drops (CC-2075, CC-2076).

## Engine gaps from the headless table alignment ruling of 25 November (#6607)

Mark's ruling on #6607 (C) adds a guard to the last sentence of C2-M-040: in a table with no head, a column gives its cells' shared alignment to the column only on an axis where every column before it gives one too, since an `aligns` or `valigns` list has no empty entry (C2-B-211). The cells of the other columns keep their own marks. Clause cases CC-2077 and CC-2078. Measured on `carve-js` `next2` `0f1cba78` with the #6637 port on top: CC-2077 writes `{aligns=,right}` and CC-2078 `{aligns=right,right valigns=,bottom}`, both with `field-unspellable`. The ticket measured the same list in `carve-rs` `next2`, and `carve-php` `next2` drops the alignment.

- All three engines: keep the cell mark where a column before it has no alignment on that axis (CC-2077, CC-2078).

## Engine gaps from the case backslash ruling of 25 November (#6656)

Mark's ruling on #6656 (A) keeps the escape of a kind that a round reports beside a C2-W-125 backslash placed in the same round, also where that backslash alone would already break the reported construct. C2-W-125 now says so in one sentence; the text of C2-W-088 already decided it. Clause cases CC-2079 and CC-2080 are CommonMark examples 526 and 538. Measured on `carve-js` `next2` `68b21a39`: it writes both inputs back unchanged, without the escape of the kind `[`. The ticket measured `carve-rs` `next2` writing the expected forms; `carve-php` was not measured.

- `carve-js`: carve-js#5587 (CC-2079, CC-2080).
- `carve-php`: measure CC-2079 and CC-2080.

## Engine gaps from the task box line block ruling of 25 November (#6670)

The auto-ruling on #6670 (A) strips the lines of a line block behind a task box by the item's content column only, the task mark's column (C2-B-027), so a line aligned under the opener keeps the spaces past that column (C2-B-130). C2-B-029 strips only a code fence, and CC-001 already pins that a line block keeps its opener's indent. The text decided the case, so no clause changes. Clause cases CC-2081 to CC-2084: behind a task box, in a div behind a task box, behind the task box of a nested item, and at the top level. Measured on `carve-js` `next2` `d8ee8f2a`: it strips the lines to the opener column in CC-2081 to CC-2083 and passes CC-2084. `carve-php` `next2` `9de538c9` gives all four. The ticket measured `carve-rs` `next2` as `carve-js`.

- `carve-js` and `carve-rs`: keep the spaces past the task mark column (CC-2081 to CC-2083).

## Engine gaps from the spanned cell fragment order ruling of 25 November (#6691)

The auto-ruling on #6691 keeps the 0.1 order (PART 9 section 5 T6) for continuation fragments under a cell that covers several grid positions: position by position, the positions in row-major order with the cell's own first, and the fragments of one position in the order of their rows. C2-B-184 states the order and C2-A-094 points at it. Clause cases CC-2088 (render) and CC-2089 (tree) pin the reproduction. Measured on `carve-js` `next2` `40bb405d` and `carve-php` `next2` `b4272403`: both join in source order, `a b c d e`. `carve-rs` `next2` `fb77a058` gives `a b d c e`.

- `carve-js` and `carve-php`: join the fragments column by column (CC-2088, CC-2089).

## Engine gaps from the strengthened copied title cases of 25 November (#6701)

EXT-105 and EXT-106 checked only the start of the first heading, so an engine that still expanded a reference inside a copied title passed them (#6540). Both now expect the whole document, as EXT-104 does. No clause changes: the reference inside the copy stays a reference (C2-X-070), inside link text it writes its generated plain text (C2-H-081, C2-H-096), and that is the plain text of the heading untrimmed (C2-H-143), so the copy of `Ref </#a>` writes `Ref Ref ` with a trailing space. Measured on `carve-js` `next2` `252cfc09` and `carve-php` `next2` `7bfa56f8`: both trim that text and fail EXT-105 and EXT-106. `carve-rs` `next2` `fb77a058` passes both.

- `carve-js` and `carve-php`: write the untrimmed plain text of a reference inside a copied title (C2-X-070, EXT-105 and EXT-106).

## Engine gaps from the wrap column ruling of 25 November (#6712)

Mark's ruling on #6712 (option 1) adds `col` to the wraps of a cell that covers more than one column, the index of the covered column that holds the fragment, counted from the cell's own column (C2-L-020), on every wrap of such a cell and sorted after `line` and `row` (C2-L-048). The writer writes each fragment under its column on its line (C2-W-067). Clause cases CC-2090 to CC-2093, layout fixtures `layout-wrap-columns` and `unsorted-layout-wrap-columns`. Measured on `carve-js` `next2` `6fb89a38`, `carve-php` `next2` `2d16d069` and `carve-rs` `next2` `6d42c38a`: no engine records `col`, so all four cases fail in each.

- All three engines: record `col` on the wraps of a cell with `colspan` above 1, read it in the writer, and refuse a sidecar whose wraps are not sorted by `line`, `row` and `col` (CC-2090 to CC-2093).
- `carve-rs`: also record the wrap of every fragment and the range of such a cell (carve-rs#4805).

## Engine gaps from the head data cell ruling of 25 November (#6663)

Mark's ruling on #6663 (A) reads every `<td>` of the `<thead>` that becomes the `table_head` as a header cell, since no source spells a head of data cells (C2-B-178), and reports the change with one `import-structure-repaired` entry at the `<thead>` (C2-M-037). The `<td>` of a further `<thead>`, which is read as a body, stays a data cell. Clause cases CC-2100 to CC-2104. Measured on the carve-js draft markup-carve/carve-js#5593 (`6c02a54`): all five pass. The ticket measured `carve-js` `next2` `9cddeb2` writing the head row of CC-2100 into the body with `structure-unspellable`; `carve-php` and `carve-rs` were not measured.

- All three engines: read the `<td>` of the head as header cells and report it once (CC-2100 to CC-2103).

## Engine gaps from the overlapping row span ruling of 25 November (#6737)

The ruling on #6737 (B) keeps both counts where an imported row span runs into a column span of the next row. The writer writes the nearest form and reports `field-unspellable` for the row span (C2-M-074, C2-W-117), and `carve import` fails with `writer-refused` (C2-T-034). Clause cases CC-2107 and CC-2108; no text changes. Measured on `carve-js` `next2` `64bbfacb`: both import with no report, exit 0. `carve-rs` `next2` `1741fa8` reports the row span on both.

- carve-js: report the row span instead of dropping it (CC-2107, CC-2108).
- carve-php: not measured.

## Engine gaps from the row span column count ruling of 25 November (#6738)

The ruling on #6738 (A) has the importer count a table's `columns` as a parse counts them, with the slots that row spans from above take (C2-M-039, C2-M-068, C2-B-172). C2-M-039 gains the sentence that states the count. Clause cases CC-2109 and CC-2110. Measured on `carve-js` `next2` `d7decb40`: both report `field-unspellable` at `/children/0/columns`, with 2 and 1 columns. The ticket measured `carve-rs` `next2` `1741fa8` reporting the same entry and `carve-php` `next2` `543b9b67` giving 2 columns with no report.

- All three engines: count the columns with the row span slots (CC-2109, CC-2110).

## Engine gaps from the allowed writer loss ruling of 25 November (#6746)

The ruling on #6746 (A) reads an allowed code as no loss for the writer's entries too (C2-T-025, C2-T-034), so `carve import --allow-loss field-unspellable` writes the nearest source and exits 0 (C2-T-026). Clause case CC-2126; no text changes. carve-rs fixed it in markup-carve/carve-rs#4826; carve-php already did this.

- carve-js: decide `writer-refused` on the entries left after `--allow-loss` (CC-2126).

## Engine gaps from the cite mode ruling of 25 November (#6752)

The ruling on #6752 (option 1) gives the `carve.cite` row the renderer option `mode`, `numbered` or `author-date` with `numbered` the default, so `--extension-options '{"carve.cite":{"mode":"author-date"}}'` reaches it (C2-T-010, C2-X-068). C2-X-068 states the values and the default, as C2-X-056 does for tabs. Clause cases CC-2127 to CC-2129. Measured on `carve-js` `next2` `ba51e9e5`, `carve-php` `next2` `1b55e1f6` and `carve-rs` `next2` `d52b1fbd`: CC-2129 passes in all three, since each refuses every `mode` as an unknown option.

- All three engines: take the `mode` of the `carve.cite` row in `--extension-options` and pass it to the citations renderer (CC-2128).
- `carve-php` and `carve-rs`: render citations with the standard cite renderer on `render --extensions '["carve.cite"]'`; both write the fallback with `extension-fallback-rendered` (CC-2127).
- `carve-js`: the library `citations()` takes a `mode` outside the two values without failing (C2-X-068).

## Engine gaps from the term list marker ruling of 25 November (#6758)

The auto-ruling on #6758 (A) ends a term inside an item, a description or a footnote body at a bullet, a bare dot or a value-1 marker indented past the term's `::`, as it ends a heading or a caption there: the description list closes and the marker opens a nested list (C2-B-234, C2-B-015). The text decided the case, so no clause changes. Clause cases CC-2130 to CC-2142: an item, an ordered item, a footnote body and an item inside a quote (CC-2130 to CC-2133); a marker of another value and a term in a div inside an item, which stay term text (CC-2134, CC-2135); a marker at the description list's column, a blank line, a heading and a caption, which already open the list (CC-2136 to CC-2139); the lint near miss and the term advice of a marker of another value (CC-2140, CC-2141); and the escape that keeps such a marker term text in the writer (CC-2142). Measured on `carve-js` `next2` `b79958ee`: it reads the marker as term text in CC-2130 to CC-2133, reports `list-marker-without-blank-line` in CC-2140 and writes `\- x` back as `- x` in CC-2142, and passes the other seven. The ticket measured `carve-php` `next2` `1b55e1f6` and `carve-rs` `next2` `d52b1fbd` reading the reproduction as `carve-js` does.

- All three engines: end the term at the marker and open the nested list (CC-2130 to CC-2133), drop the term advice there (CC-2140), and escape a term continuation that starts with such a marker (CC-2142).

## Engine gaps from the pool-only citation ruling of 25 November (#6759)

The ruling on #6759 (option 1) lists a cited key that only the host's citation data defines in the last claimed `references` or `bibliography` directive, after that directive's own entries, so its list number agrees with its label (C2-X-058). Directive entries keep their source-order numbers across all directives; with no directive the generated list stays at the document end. No clause case: the host data reaches the extension only through the library (`citations({ bibliography })` in carve-js), and neither the case options nor the `carve.cite` renderer options carry it. carve-js `next2` `a5a7bbd2` puts such a key in the first directive's list.

- carve-js: list a pool-only key in the last claimed directive (C2-X-058).
- carve-rs: the same, in the port of the citations transform (markup-carve/carve-rs#4834).

## Engine gaps from the catalog keys ruling of 25 November (#6766)

The ruling on #6766 (option B) adds 26 rows to `data/extensions.json`: the diagram presets, `carve.colorSwatch`, `carve.listTable`, `carve.term` and `carve.indexTerm` with a matcher, and 13 document extensions marked `transform` (C2-X-071 to C2-X-075). `--extensions` takes them as it takes the other rows (C2-T-010), and `carve.smartQuotes` takes the renderer option `locale`. Clause cases CC-2146 to CC-2148, extension cases EXT-107 to EXT-112. Read from the sources of `carve-js` `next2` `ba51e9e5`, `carve-php` `next2` `1b55e1f6` and `carve-rs` `next2` `d52b1fbd`: each CLI refuses every new name, while each library has all of them.

- `carve-js`: add the rows to the `STANDARD` table of `cli/standard-extensions.ts`.
- `carve-php`: add the rows to `Standard::definitions()` and the renderer-option check of `Options`.
- `carve-rs`: register the rows marked `transform`, which the CLI skips today as rows without a matcher; declare the `title`, `body` and `list` slots of `carve.tocPlacement`.

## Engine gaps from the verse whitespace ruling of 25 November (#6762)

The ruling on #6762 has a line block keep the whitespace of its lines as 0.1 did (C2-H-043): the leading run and every inner run of two or more columns are written as `&nbsp;`, one per column, a tab advancing to the next multiple of 4 from the start of its text node. Clause cases CC-002 (changed) and CC-2143 to CC-2145. Measured on `carve-js` `next2` `ba51e9e5`: CC-002, CC-2143, CC-2144 and CC-2145 fail, since it writes the tabs and runs as they stand.

- All three engines: write the runs of C2-H-043 in a line block.
- `carve-js`: `carve upgrade` stops the U-265 rewrite to `Roses\ \ are red`.

## Engine gaps from the line-block no-break space ruling of 25 November (#6777)

The ruling on #6777 adds C2-M-111: in a line block read from `data-carve-line-block`, a run of U+00A0 with no space or tab of its text node beside it reads as spaces when it leads the line or holds two or more characters, and a lone one inside the line stays. Row 26 of C2-H-195 names the exception. Clause cases CC-2149 to CC-2155. Measured on `carve-js` `next2` `c1da7a6`: CC-2149 to CC-2152 and CC-2155 pass; CC-2153 and CC-2154 fail, since it reads a run beside a space as spaces. `carve-php` was not run; its importer (carve-php#6025) keeps such a run by its source. `carve-rs` was not measured.

- `carve-js`: keep a U+00A0 run beside a space or tab (carve-js#5638).
- `carve-rs`: check its HTML importer against CC-2149 to CC-2155.

## Engine gaps from the list-table import ruling of 25 November (#6771)

The ruling on #6771 brings back the 0.1 list-table import as the option `listTable` (C2-M-112, flag `--list-table`, #6100 item 3): a table one of whose cells holds two or more blocks, or one block that is not a paragraph, is imported as a `list-table` div. Clause cases CC-2156 to CC-2164. No engine at `next2` offers it: `carve-js` implements it first, then `carve-php` and `carve-rs`.

## Engine gaps from the escape-round ruling of 25 November (#6772)

The ruling on #6772 makes the escape rounds of C2-W-088 read every reference from the tree; the verbatim text of C2-W-075 goes back after them, so `fmt` stays stable beside a verbatim reference (C2-W-003). Clause cases CC-2165 and CC-2166.

- `carve-js`: implements it (carve-js#5632).
- `carve-php` and `carve-rs`: check their writers against CC-2165 and CC-2166.

## Engine gaps from the line-block hard break ruling of 26 November (#6786)

The ruling on #6786 narrows row 18 of C2-H-195: on import, a line-block line keeps the hard break before its `<br>` where it holds nothing else or its last inline node is text ending in a space or tab, so CC-156 and CC-157 render the same HTML again. Clause cases CC-2167 to CC-2171. Measured on `carve-js` `next2` `4aa2407`: CC-2171 passes; CC-2167 to CC-2170 fail, since it drops every such break.

- `carve-js`, `carve-php` and `carve-rs`: keep the hard break on those lines.

## Engine gaps from the empty list-table cell ruling of 26 November (#6794)

The ruling on #6794 fills the item of an empty list-table cell with one empty line comment, the tree of `- %%`, with nothing reported (C2-M-112), so `carve import --list-table` no longer refuses a table with an empty cell. Clause cases CC-2177 to CC-2179.

- `carve-js`, `carve-php` and `carve-rs`: fill the empty cell item as they implement `listTable` (carve-js#5646 for `carve-js`).

## Engine gaps from the list-table span mark ruling of 26 November (#6795)

The ruling on #6795 (option D, replacing option C) spells a list-table cell whose blocks are one paragraph holding only the text `<` or `^` as the literal-text span `` !`<` `` or `` !`^` `` (C2-M-112, C2-I-018), with nothing reported, and `carve.listTable` reads a span mark only from a text node (C2-X-076), so the cell renders as text. Clause cases CC-2180 to CC-2182 and CC-2183 to CC-2187. Measured on `carve-js` `next2` `71e03e1`: the importer writes the bare `<` or `^`; the renderer already renders a literal-text span as text, and joins a `<` whose left cell a row span covers from above (CC-2187).

- `carve-js`, `carve-php` and `carve-rs`: spell such a cell as a literal-text span as they implement `listTable`, and join no `<` beside a cell covered from above.
