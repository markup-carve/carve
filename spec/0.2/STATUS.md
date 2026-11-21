# Carve 0.2: status

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

The upgrade replay of 19 November adds U-430, a delimiter that 0.2 pairs across a braced opener or an attribute block and 0.1 kept as text, and U-431, a hyphen run that C2-I-111 splits into other dashes than 0.1 (#6164). Source upgrade rows rose from 324 to 326. The second replay pass adds U-432, a line comment that 0.1 ended at a closer or read after an opener, written as a braced comment, and U-433, a blank line above a comment line that ended a 0.1 block; source upgrade rows rose from 326 to 328. The third replay pass adds U-434, one space between a bullet and a task box; U-435, a block moved out of a description to the column of its list; U-436, a line indented to the item column that 0.1 read into the item; and U-437, a blank line between item text and a paragraph 0.1 started outside the item. Source upgrade rows rose from 328 to 332. The fourth replay pass adds U-438 for a nested ordered list beginning above 1 after open item text; source upgrade rows rose to 333.

## Documents

Clauses are the paragraphs that start with a clause id. Rules and exceptions are counted by one rubric for all documents (an atomic normative statement that decides the tree, the output, the source written, a refusal or a report; an exception is a carve-out or a named interaction). *Labeled* is the number of clauses that start with the word "Exception", which each document counts at its end. The syntax chapters were counted construct by construct; the other documents were read more finely, so their rule counts are not comparable with the two chapters.

| Document | Prefix | Clauses | Rules | Exceptions | Labeled | Examples |
|---|---|---|---|---|---|---|
| `syntax-blocks.md` | C2-B | 209 | 217 | 31 | 8 | 289 |
| `syntax-inline.md` | C2-I | 109 | 136 | 30 | 14 | 131 |
| `ast.md` | C2-A | 199 | 422 | 65 | 3 | 0 |
| `html.md` | C2-H | 199 | 470 | 98 | 6 | 86 |
| `writer.md` | C2-W | 131 | 295 | 87 | 6 | 46 |
| `source-layout.md` | C2-L | 54 | 95 | 23 | 0 | 0 |
| `includes.md` | C2-N | 88 | 219 | 54 | 2 | 41 |
| `extensions.md` | C2-X | 69 | 89 | 9 | 0 | 0 |
| `import-html.md` | C2-M | 85 | 239 | 46 | 1 | 64 |
| `tooling.md` | C2-T | 46 | 105 | 7 | 0 | 0 |
| **Total** | | **1,189** | **2,287** | **450** | **40** | **657** |

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
- `carve-js`: the engine at the baseline head has none of the commands of C2-T-047 to C2-T-053; `next2` `7589dbc` passes CC-1352 to CC-1366 but CC-1359, where it writes the include entries before the category line that C2-T-039 puts first. C2-B-109: a `> %%%` line under a comment block opened in `> >` closes it (CC-1369). The upgrade tool has no entry for U-426 to U-429 and still treats U-393 as no change.
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
