# Carve 0.2: tooling

Status: part of the freeze candidate of Carve 0.2 on `next2` (`STATUS.md`).

This document defines what every engine offers a caller: the library calls and the command line program built on them, with its flags, streams, exit codes and reports. The options are the rows of `data/options.json` (C2-H-137); this document only says how each command reads them. The commands, flags, categories, calls and entry fields are also in `data/cli.json`.

## Scope

**C2-T-001** Every engine offers the calls of the section "Library" and the program of the section "Commands". A port spells a call, a result field and an error by the convention of its language, as it spells an option (C2-H-137).

**C2-T-002** The program is `carve`.

**C2-T-003** Outside this specification are the Markdown, GFM and Djot importers of the reference engine (`--from markdown`, `gfm` and `djot`), its `upgrade` command, which is part of the JavaScript engine only and is described in `UPGRADING.md` ("Running the rewrite tool"), its `diff` command, which the calls of C2-T-043 to C2-T-046 serve on the command line, the directory import of its `import` command (C2-M-100), and its scanner and event helpers. Every engine also offers Markdown, plain-text and ANSI export renderers through its library API and `carve render --to markdown`, `--to plain` and `--to ansi`. Their output, options and export-only loss codes are engine behavior outside this specification, except the option `headingShift`, which the Markdown export reads and the plain-text and ANSI exports refuse (C2-H-209); those codes are outside `data/lint-rules.json` (C2-W-106). An engine may offer further commands, flags, flag values and calls; none of them takes a name of `data/cli.json` with another meaning.

**C2-T-004** `data/cli.json` holds the commands, flags, failure categories, calls and entry fields of this document. A row is normative together with the clauses it cites; where a row and its clause disagree, the clause wins.

## Library

**C2-T-005** An engine offers the calls of this table. Each reads the options of `data/options.json` whose `read_by` names a stage the call runs and refuses the others (C2-H-137). `decodeTree` and `validateTree` read `extensions` as the registered standard extensions for their tree reader checks (C2-X-038). Each also takes an optional annotation-range sidecar. When given, it checks the sidecar against the tree under C2-A-203, C2-A-207 and C2-A-214; when absent, it runs the tree-only checks.

| Call | Takes | Returns | Clauses |
|---|---|---|---|
| `parse` | Carve source as text or bytes, the parse and resolution options, `positions` (default on) | the resolved tree | C2-A-106, C2-B-218 |
| `parseWithDiagnostics` | as `parse` | the tree, the diagnostics record and `suppressedDiagnostics` | C2-A-172, C2-T-024 |
| `parseWithLayout` | as `parse` | the tree, the layout sidecar and the record | C2-A-003 |
| `render` | Carve source or a tree, the parse, resolution and render options | HTML | C2-H-137 |
| `renderWithDiagnostics` | as `render` | HTML, the record and `suppressedDiagnostics` | C2-A-172, C2-H-130 |
| `format` | Carve source, `alignTables`, `normalize`, `extensions` | Carve source | C2-W-001, C2-W-134 |
| `formatWithDiagnostics` | as `format` | Carve source and the record | C2-W-134 |
| `write` | a tree, optionally its sidecar, `alignTables`, `extensions` | Carve source | C2-W-001, C2-W-102 |
| `writeWithDiagnostics` | as `write` | Carve source and the record | C2-W-134 |
| `lint` | Carve source, `rules`, `platforms`, `upgrade`, `includes`, `extensions`, `headingIds` | the record | C2-W-103, C2-W-109, C2-W-156, C2-N-085, C2-T-042 |
| `importDocument` | HTML text, `from: "html"`, `rawHtml`, `strictLosses`, `labels`, `adapter`, `listTable` | the tree, its Carve source and the record | C2-M-001, C2-M-066, C2-M-082, C2-M-100, C2-M-102, C2-M-112 |
| `includeDependencies` | a tree | its dependencies | C2-N-083 |
| `encodeTree` | a tree | its JSON text | C2-A-012, C2-A-217 |
| `encodeEnvelope` | a tree | the JSON text of its envelope | C2-A-012 |
| `decodeTree` | the JSON text of a 2.0 tree or envelope, `extensions`, optionally the annotation-range sidecar | the tree | C2-A-188 |
| `validateTree` | a tree, `extensions`, optionally the annotation-range sidecar | nothing, or the refusal | C2-A-188 |
| `migrateTree` | the JSON value of a 1.x or draft tree, bare or in an envelope | the 2.0 tree, its envelope where the input was one, and the record | C2-A-178, C2-A-180 |
| `positionOf` | Carve source as text or bytes, an offset in its UTF-8 bytes | `line` and `column` | C2-T-019, C2-T-041 |
| `diffTree` | two trees | a JSON Patch | C2-T-043 |
| `applyPatch` | a tree, a JSON Patch, optionally `fingerprint`, `extensions` | a tree | C2-T-044, C2-T-045 |
| `sourceFingerprint` | Carve source as text or bytes | a fingerprint | C2-T-046 |
| `treeFingerprint` | a tree | a fingerprint | C2-T-046 |

**C2-T-006** A call refuses with the typed error of its row in the table of C2-T-040, and with no other error; the command line turns that error into the category of the row.

**C2-T-043** `diffTree` takes two trees and returns a JSON Patch (RFC 6902): a list of operations that, applied in order by `applyPatch` to the first tree, give a tree whose JSON value is that of the second. Every `path` and `from` is an RFC 6901 pointer into the JSON value of `encodeTree` of the tree the operation applies to, the form of the `path` of a diagnostic (C2-A-173). Two trees whose JSON values are equal give the empty list. The operations an engine chooses and their order are not fixed, so two engines may give two patches for one pair of trees; a host compares the trees a patch gives, not patches.

**C2-T-044** `applyPatch` applies the operations of RFC 6902 (`add`, `remove`, `replace`, `move`, `copy`, `test`) in order to the JSON value of `encodeTree` of the tree and decodes the result as `decodeTree` does (C2-A-188), with the standard extensions of `extensions` registered. It returns the decoded tree and leaves the given tree unchanged. There is no reversible patch and no three-way merge.

**C2-T-045** `applyPatch` refuses with one `CarvePatchError` that carries `path` and `reason`, and applies nothing, in three cases. When `fingerprint` is given and is not the `treeFingerprint` of the tree, `path` is the empty pointer. When an operation is no operation of RFC 6902, its `path` or `from` names no member, or a `test` fails, `path` points into the patch, at the field of that operation (`/0/op`, `/0/path`, `/0/value`). When the result is no tree of contract 2.0, `path` points into the result, at the place where `decodeTree` refuses it.

**C2-T-046** A fingerprint is `sha256:` followed by the 64 lower-case hex digits of the SHA-256 of bytes: for `sourceFingerprint` the UTF-8 bytes of the source as given, text encoded and bytes hashed as they are, with no normalization, so the text and the bytes of one source give one fingerprint; for `treeFingerprint` the UTF-8 bytes of `encodeTree` of the tree (C2-A-217).

## Commands

**C2-T-007** A command line is `carve [COMMAND] [FLAG...] [FILE...]`, and its commands are the rows of this table. With no command it is `render`.

| Command | Reads | Writes on standard output | Clauses |
|---|---|---|---|
| `render` | Carve source, or a tree in JSON with `--from-ast` | HTML and a line feed for each file | C2-H-137 |
| `ast` | Carve source | the tree in JSON and a line feed | C2-A-012 |
| `fmt` | Carve source, or a tree in JSON with `--from-ast` | the canonical source | C2-W-100 |
| `lint` | Carve source | the entries of the call `lint` | C2-W-103 |
| `diagnostics` | Carve source | the entries of the parse channel | C2-A-172 |
| `import` | HTML | the Carve source of the imported tree | C2-M-001 |
| `migrate-ast` | a 1.x or draft tree in JSON | the 2.0 tree in JSON and a line feed | C2-A-180 |
| `flatten` | Carve source | the expanded tree as canonical Carve source | C2-T-047 |
| `fix` | Carve source | what `lint --fix` writes | C2-T-049 |
| `upgrade` | 0.1 source | outside this specification (C2-T-003) | |

**C2-T-008** A flag is `--name value` or `--name=value`. A switch is `--name` and takes no value; `--no-name` turns it off. `--` ends the flags, and every argument after it is a file. A flag that the table of its command does not list is refused with the category `usage`.

**C2-T-009** A flag given twice takes its last value, except `--allow-loss`, which collects every value. `--ignore` collects every value too.

**C2-T-010** A flag that sets an option is named by the option in lower case with hyphens, so `urlPolicy` is `--url-policy`: a `boolean` option is a switch, an `enum` option takes one of its values, a `count` option takes a decimal integer, so `--heading-shift=1`, and a `list`, `map` or `structure` option takes JSON text. The one option set otherwise is `includes`, which `--includes` and `--include-root` set (C2-T-018). `allowLosses` and `maxLosses` keep the 0.1 flags: `--allow-loss` gives one code per instance (C2-T-027) and `--max-render-losses` the count (C2-T-029). `extensions` and `renderers` take host code, which JSON text cannot name, so a host extension or renderer is an option of the library calls only (C2-T-005). The standard extensions of `data/extensions.json` have names: on `render`, `fmt`, `lint` and `ast`, `--extensions` takes a JSON list of them and registers each, with its standard renderer on `render`, and `--extension-options` takes a JSON object of their renderer options keyed by extension name, so `--extension-options '{"carve.tabs":{"mode":"aria"}}'`. A name that is no standard extension is refused with the category `usage`. `codeBlockRenderer` takes host code as well and has no flag either. A value the option refuses is refused with the category `usage`. An option that the table of a command lists no flag for, or whose flag is not given, has its default; for `includes` C2-T-018 says what holds.

## Input and output

**C2-T-011** A file is a path, or `-` for standard input. A command with no file reads standard input. The files are read in order, and the outputs of the files follow each other on standard output.

**C2-T-012** Carve source is read as bytes and is never refused for its encoding (C2-B-218). A tree in JSON is read as strict UTF-8, and a file that is not is refused with the category `input-unreadable`. HTML is read as UTF-8.

**C2-T-013** A line or a report names a file by its path as given and standard input as `<stdin>` (C2-W-100).

**C2-T-014** Standard output carries the product of the command and nothing else. The product of `lint` and `diagnostics` is their entries, as lines or as a report, and that of `fmt --check` and `fmt --diff` the report of C2-W-100; every other line of a diagnostic, a note or a failure goes to standard error.

**C2-T-015** A report flag takes a path, or `-` for standard error. The report is one JSON document for the whole run, followed by a line feed. After repeated instances of one flag have been reduced by C2-T-009, the collision and order rules of this clause apply. Two report flags of one run whose paths resolve to the same absolute path, against the working directory and with `.` and `..` segments removed, are refused with the category `usage` before any input is read. Two report flags with `-` are not refused: both reports go to standard error at the end of the run, in the order of the flags on the command line.

**C2-T-016** `--write` replaces each file whose output differs from it and leaves the others untouched. With standard input among the files it is refused with the category `usage`.

**C2-T-053** `--output` (`-o`) on `render`, `fmt`, `import` and `flatten` takes a path and writes the product of the run to that file instead of standard output, the products of the files before a failure of status 2 included (C2-T-017). `fmt` refuses it with `--write`, `--check` or `--diff`, and a run whose output path resolves to the path of a report flag, as C2-T-015 compares two report paths, is refused, both with the category `usage` before any input is read. A file it cannot write ends the run with the category `output-unwritable`.

**C2-T-017** A failure of status 2 stops the run at its file; what earlier files wrote stays written. Otherwise the status of a run is the highest status of its files.

**C2-T-018** `render`, `ast`, `lint` and `diagnostics` expand includes as C2-N-004 and C2-N-085 state, through the resolver of C2-N-012. `--no-includes` turns expansion off and `--include-root` names the root. `fmt`, `import` and `migrate-ast` expand nothing (C2-N-005), and neither does a command that reads a tree with `--from-ast`.

## Diagnostics and reports

**C2-T-019** A diagnostic line is `FILE:LINE:COLUMN: SEVERITY CODE MESSAGE`, and an entry with no range is written `FILE: SEVERITY CODE MESSAGE`. FILE is the `file` of the entry where it has one (C2-N-063) and the input otherwise. LINE counts line feeds from 1, and COLUMN counts the code points of that line from 1, both at the start of the range.

**C2-T-020** An entry of the record (C2-A-173) is a JSON object with the fields of this table. The library gives every field but `line` and `column`; the command line adds those two where the entry has a range, and to each object of `includedBy`. `includedBy` is the 0.1 field of that name; an engine may give it and a comparison does not require it. The `message` is the text of the engine, for which the catalog row gives the reference wording (C2-W-106); a comparison of two reports does not compare it. A conformance case that states `messageWhen` compares the selected catalog condition separately, as C2-W-106 defines it.

| Field | Value | Present | Clauses |
|---|---|---|---|
| `code` | a code of `data/lint-rules.json` | always | C2-W-106 |
| `severity` | `hint`, `warning` or `error` | always | C2-W-105 |
| `channel` | `parse`, `render-loss` or `lint` | always | C2-W-104 |
| `message` | text | always | C2-A-173 |
| `path` | an RFC 6901 pointer into the tree | where the entry is about a node | C2-A-173, C2-W-157 |
| `range` | an object of `startOffset` and `endOffset`, in UTF-8 bytes | where the entry has a position in source | C2-A-173 |
| `file` | the id of the included file the range is counted in | where that is not the top-level document | C2-N-063 |
| `foreignType` | the name of the HTML node | on an entry of the importer that has one | C2-M-081 |
| `includedBy` | the include chain: a list of objects of `file`, absent for the top-level document, and `range`, one per include node from the top-level document inward to the one that read `file` | optional, on an entry that has `file` | C2-N-063 |
| `line` | the LINE of C2-T-019 | on the command line, with `range` | C2-T-019 |
| `column` | the COLUMN of C2-T-019 | on the command line, with `range` | C2-T-019 |

**C2-T-021** A diagnostics report is `{"files": [...]}` with one object per file in order: `file`, the name of C2-T-013; `diagnostics`, the retained entries in the order of the record; and `suppressed`, the number of entries of that file a cap held back (C2-T-024, C2-T-029). `diagnostics --json`, `lint --json` and `--report-losses` write it.

**C2-T-022** An include report is `{"files": [...]}` with one object per file in order: `file`, and `dependencies`, the dependencies of its tree (C2-N-083), each an object of `path`, `from` (the including file, absent for the top-level document), `file` (absent where the include was not read) and `read`. A host that watches files reads it as C2-N-084 says. `--report-includes` writes it.

**C2-T-023** Reports are compared as JSON values: the order of the members of an object is no contract, and the order of a list is.

**C2-T-024** An expansion retains at most `include_diagnostics` of `data/limits.json`, 100, entries whose code is the code of a cause in `data/includes.json`, the first in the order the failures occur. The result of a call that returns a record gives the number of the others as `suppressedDiagnostics`, 0 where there are none, and the command line counts them in `suppressed` (C2-T-021). An include whose entry is held back stays unexpanded as C2-N-061 says.

**C2-T-041** `positionOf` takes a source as `parse` takes it and an offset in its UTF-8 bytes, counted as the offsets of a range are (C2-A-141, C2-B-218), and returns `line` and `column`: the LINE and COLUMN of C2-T-019 for a range that starts at that offset, so a library host shows the positions the command line writes. `line` is 1 plus the number of line feeds before the offset; a carriage return is no line feed. `column` is 1 plus the number of code points between the offset and the last line feed before it, or the start of the source; a U+FFFD that replaces an ill-formed sequence or a U+0000 counts as the one code point it is (C2-B-218). An offset equal to the length of the source gives the position after its last character. An offset that is negative, no integer, greater than the length, or inside the bytes of one code point, an ill-formed sequence that one U+FFFD replaces included, is refused with `CarveOptionError` naming `offset`. The call reads no option.

## Command flags

### Every command

| Flag | Value | Meaning |
|---|---|---|
| `--help` | switch | writes the usage of the command on standard output and exits with status 0 |
| `--version` | switch | writes the version of the engine and a line feed on standard output and exits with status 0 |

### `carve render`

| Flag | Value | Meaning |
|---|---|---|
| `--heading-ids` | `off`, `keep-case`, `lower`, `ascii`, `ascii-lower`, `ascii-strict`, `ascii-strict-lower` | the option `headingIds` |
| `--heading-shift` | count, 0 | the option `headingShift` (C2-H-208, C2-H-209) |
| `--labels` | JSON | the option `labels` |
| `--mode` | `interactive`, `static` | the option `mode` |
| `--profile` | `full`, `article`, `comment`, `minimal` | the option `profile` |
| `--raw-html` | switch | the option `rawHtml` |
| `--roundtrip` | switch | the option `roundtrip` |
| `--sections` | switch | the option `sections` |
| `--smart-typography` | switch | the option `smartTypography` |
| `--social` | JSON | the option `social` |
| `--soft-break` | `newline`, `space`, `br` | the option `softBreak` |
| `--source-lines` | switch | the option `sourceLines` |
| `--strict-losses` | switch | the option `strictLosses`, with the allow list of C2-T-026 |
| `--symbols` | JSON | the option `symbols` |
| `--url-policy` | JSON | the option `urlPolicy` |
| `--extensions` | JSON | the option `extensions`, standard extensions only (C2-T-010) |
| `--extension-options` | JSON | the renderer options of those extensions (C2-T-010) |
| `--from-ast` | switch | reads each file as a tree in JSON (C2-A-188) |
| `--includes` | switch, on | expands includes (C2-T-018) |
| `--include-root` | path | the containment root of includes (C2-N-004) |
| `--report-includes` | path | writes the include report (C2-T-022) |
| `--report-losses` | path | writes the losses as a diagnostics report (C2-T-021) |
| `--allow-loss` | code, repeatable | a code that is no loss (C2-T-027) |
| `--max-render-losses` | count, 100 | the losses retained per file (C2-T-029) |
| `--strict` | switch | ends a file that wrote an entry with status 1 (C2-T-051) |
| `--output` | path | writes the product to a file (C2-T-053); `-o` is the same |

**C2-T-025** A loss is a render-loss entry of a file whose code is not on the allow list. `render` writes each retained loss as a line on standard error, and no entry of the parse or the lint channel, which `diagnostics` and `lint` write (C2-T-031, C2-T-032).

**C2-T-026** With `--strict-losses` and a loss, `render` writes no HTML for that file and the file ends with status 1 and the category `render-loss` (C2-H-130). The command applies the allow list before `strictLosses`, so an allowed code alone never fails a file.

**C2-T-027** `--allow-loss` takes a code of the render-loss channel of `data/lint-rules.json`; any other value is refused with the category `usage`. An allowed code is neither written on standard error nor in the report. The codes of the run are the option `allowLosses` (C2-H-204).

**C2-T-028** `--report-losses` writes the losses of the run, and without a loss it writes the report with empty lists.

**C2-T-029** `--max-render-losses` takes a count, a decimal integer of at least 0, and its default is 100. It sets the option `maxLosses` (C2-H-205). Each file retains its first losses up to that count; the others are counted in `suppressed` and written on no line.

### `carve ast`

| Flag | Value | Meaning |
|---|---|---|
| `--positions` | switch, on | writes `pos` on the nodes |
| `--envelope` | switch | writes the envelope of C2-A-012 instead of the bare tree |
| `--extensions` | JSON | the option `extensions`, standard extensions only (C2-T-010) |
| `--extension-options` | JSON | the renderer options of those extensions (C2-T-010) |
| `--includes` | switch, on | expands includes (C2-T-018) |
| `--include-root` | path | the containment root of includes (C2-N-004) |
| `--report-includes` | path | writes the include report (C2-T-022) |

### `carve fmt`

| Flag | Value | Meaning |
|---|---|---|
| `--check` | switch | changes nothing and reports the first changed line (C2-W-100) |
| `--diff` | switch | writes a unified diff (C2-W-100) |
| `--write` | switch | replaces each file (C2-T-016); `-w` is the same |
| `--normalize` | switch | the option `normalize` |
| `--align-tables` | switch | the option `alignTables` |
| `--extensions` | JSON | the option `extensions`, standard extensions only (C2-T-010) |
| `--extension-options` | JSON | the renderer options of those extensions (C2-T-010) |
| `--from-ast` | switch | writes each file read as a tree in JSON (C2-W-102) |
| `--output` | path | writes the product to a file (C2-T-053); `-o` is the same |

**C2-T-030** `fmt` refuses `--write` with `--check` or with `--diff`, `--check` with `--diff`, and `--normalize` with `--from-ast`, with the category `usage`. Without one of `--check`, `--diff` and `--write` it writes the output on standard output. A writer loss of C2-W-134 ends the file with status 1 and the category `writer-refused`.

### `carve lint`

| Flag | Value | Meaning |
|---|---|---|
| `--rules` | JSON | the option `rules` (C2-W-109) |
| `--platforms` | JSON | the option `platforms` (C2-W-109) |
| `--upgrade` | switch | the option `upgrade`: turns on the migration notices (C2-W-156) |
| `--heading-ids` | `off`, `keep-case`, `lower`, `ascii`, `ascii-lower`, `ascii-strict`, `ascii-strict-lower` | the option `headingIds` (C2-T-042) |
| `--extensions` | JSON | the option `extensions`, standard extensions only (C2-T-010) |
| `--extension-options` | JSON | the renderer options of those extensions (C2-T-010) |
| `--json` | switch | writes a diagnostics report (C2-T-021) instead of lines |
| `--includes` | switch, on | expands includes (C2-T-018) |
| `--include-root` | path | the containment root of includes (C2-N-004) |
| `--fix` | switch | rewrites the findings of the rules that are on and have a fix (C2-T-049) |
| `--write` | switch | with `--fix`, replaces each file (C2-T-016, C2-T-050); `-w` is the same |
| `--strict` | switch | ends a file that wrote an entry with status 1 (C2-T-051) |
| `--ignore` | file, repeatable | drops the entries of that file (C2-T-052) |

**C2-T-031** `lint` writes the entries that the call `lint` returns, as lines or as a report, and ends a file with status 1 when an entry has the severity `warning` or `error`; a run of hints alone ends with 0. The call `lint` returns the record of its run (C2-W-103): the entries of its parse in the parse channel and its findings in the lint channel (C2-W-113), as 0.1 lint reported an unclosed fence. A rule that is off by default, as `djot-highlight-braces` is, is turned on by its id in `--rules`. A migration notice, as the other `djot-` rules are, is on for a document that declares a Carve version below 0.2 and under `--upgrade`, and `--rules` turns it on or off by its id over both (C2-W-156).

**C2-T-042** `lint` reads `headingIds` (C2-H-131), so a host lints with the option map it renders with. A rule that compares a fragment with the ids of the rendered HTML, as `broken-fragment-link` does, compares it with the heading ids that value generates: under `lower` the heading `= Alpha` has the id `alpha`, so a link to `#alpha` reports nothing, and under the default `keep-case` it has the id `Alpha`, so the same link reports the case-only message that names `Alpha`. Under `off` a heading has no generated id.

**C2-T-049** `lint --fix` rewrites each finding of a rule whose row in `data/lint-rules.json` has a `fix` to the one replacement its message names, at the range of the finding; the `before` and `after` of the `fix` show it on one source. A rule whose message names two replacements, as `deprecated-bare-underline` does, has no fix. The command `fix` is `lint --fix` with the same flags. Under `--fix` every rule keeps the state it has under `lint` (C2-T-031, C2-W-156): a rule that has a fix and is on rewrites its findings, and one that is off rewrites nothing. So a migration notice rewrites only a document that declares a Carve version below 0.2, under `--upgrade`, or where `--rules` turns it on, and `--rules` turning it off keeps it off over the declaration and over `--upgrade`; a valid 0.2 document keeps every spelling that a migration notice reports. A range that two findings with different replacements report stays as written: in `~t~`, `djot-subscript-tilde` and `deprecated-bare-strike` disagree, and `--rules` turning one of them off picks the other. A fix is kept only where the fixed source, parsed again, has the construct of its replacement where the finding started: `+ item` directly below a line of paragraph text opens no list with `-` either, so it stays. The fixes repeat until a pass changes nothing.

**C2-T-050** Without `--write`, `lint --fix` writes the fixed source of each file on standard output and the entries that remain as lines on standard error. With `--write` it replaces each file whose fixed source differs from it (C2-T-016), and the entries that remain are its product, as lines or, with `--json`, as a report. A file ends with the status that `lint` gives its fixed source (C2-T-031). `--write` without `--fix`, and `--json` with `--fix` but without `--write`, are refused with the category `usage`.

**C2-T-051** `--strict` on `render` and `lint` ends a file that wrote any entry with status 1 and no category, a hint included. `render --strict` still writes the HTML; `--strict-losses` is the flag that withholds it (C2-T-026).

**C2-T-052** `lint --ignore` takes a file and drops every entry whose `file` (C2-N-063) is that id, and every entry of an entry file whose name as given (C2-T-013) is that value.

### `carve flatten`

| Flag | Value | Meaning |
|---|---|---|
| `--include-root` | path | the containment root of includes (C2-N-004) |
| `--output` | path | writes the product to a file (C2-T-053); `-o` is the same |

**C2-T-047** `flatten` writes each file as one Carve document: it expands includes as `render` does (C2-T-018) and writes the expanded tree through the canonical writer (C2-W-100), so every include directive is replaced by the blocks it expanded to. It is the one command with Carve source as its product that expands (C2-N-005). A leading frontmatter block of an included file is not written. Later typed metadata blocks of that file are written in source order, including their attributes (C2-B-232, C2-W-052), though they render nothing.

**C2-T-048** A file of `flatten` writes no source and ends with status 1 in three cases: with the category `include-unresolved` when an include did not expand, and the entries of its causes follow as lines on standard error; with `flatten-changed` when the HTML of the flattened source with the default options differs from that of the expanded tree, as when two included files each define one footnote, link reference or abbreviation key, which are looked up per file (C2-N-054, C2-N-055); and with `writer-refused` for a writer loss of C2-W-134.

### `carve diagnostics`

| Flag | Value | Meaning |
|---|---|---|
| `--json` | switch | writes a diagnostics report (C2-T-021) instead of lines |
| `--includes` | switch, on | expands includes (C2-T-018) |
| `--include-root` | path | the containment root of includes (C2-N-004) |
| `--report-includes` | path | writes the include report (C2-T-022) |

**C2-T-032** `diagnostics` writes the entries of the parse channel and ends with status 0 whatever they report.

### `carve import`

| Flag | Value | Meaning |
|---|---|---|
| `--from` | `html` | the input format; required |
| `--adapter` | `generic`, `tiptap`, `prosemirror`, `ckeditor`, `tinymce`, `word`, `google-docs` | the option `adapter` of the importer (C2-M-102) |
| `--list-table` | switch | the option `listTable` of the importer (C2-M-112) |
| `--raw-html` | switch | the option `rawHtml` of the importer (C2-M-065, C2-M-066) |
| `--strict-losses` | switch | the option `strictLosses` of the importer (C2-M-082) |
| `--report-losses` | path | writes the losses as a diagnostics report (C2-T-021) |
| `--allow-loss` | code, repeatable | a code that is no loss (C2-T-027) |
| `--max-render-losses` | count, 100 | the losses retained per file (C2-T-029) |
| `--output` | path | writes the product to a file (C2-T-053); `-o` is the same |

**C2-T-033** `import` without `--from` is refused with the category `usage`. The value `html` reads the input as C2-M-001 states; the reference engine also takes `markdown`, `gfm` and `djot` (C2-T-003).

**C2-T-034** `import` applies C2-T-025 to C2-T-029 to the entries of the importer (C2-M-080) and of the writer: with `--strict-losses` a loss of either fails the file with the category `render-loss` and writes no source. Without it, a writer loss of C2-W-134 fails the file with the category `writer-refused`.

**C2-T-035** An HTML input the importer refuses ends the run with status 2 and the category `import-input-invalid` (C2-M-006). A tree of the importer that fails the reader checks (C2-A-188) is a defect of the importer, and the file ends with status 1 and the category `import-tree-invalid`.

### `carve migrate-ast`

`migrate-ast` takes no flag beyond those of every command.

**C2-T-036** `migrate-ast` writes the migrated tree, as an envelope when the input was one (C2-A-012), and writes each entry of the migration record as a line on standard error (C2-A-180). It ends with status 0, and with status 2 and the category `ast-json-invalid` for an input it cannot read as a tree.

## Exit codes

**C2-T-037** A run ends with status 0 when every file did what was asked and nothing it gates on was found.

**C2-T-038** A run ends with status 1 and no category when `fmt --check` or `fmt --diff` finds a file that would change (C2-W-100), or `lint` finds an entry of severity `warning` or `error` (C2-T-031), or `--strict` finds any entry (C2-T-051).

**C2-T-039** Every failure with a category in C2-T-040 writes as its first line on standard error `carve[CATEGORY]:` and a message (C2-W-101).

**C2-T-040** The failure categories, their status and the library error each comes from are the rows of this table.

| Status | Category | Error | When |
|---|---|---|---|
| 1 | `render-loss` | `CarveRenderError` | a loss under `--strict-losses` (C2-H-130, C2-M-082) |
| 1 | `writer-refused` | `CarveWriteError` | a writer loss of C2-W-134 in `fmt` or `import` |
| 1 | `import-tree-invalid` | | the importer returns a tree the reader refuses (C2-T-035) |
| 1 | `include-unresolved` | | an include that `flatten` did not expand (C2-T-048) |
| 1 | `flatten-changed` | | a flattened source that renders differently from the expanded tree (C2-T-048) |
| 2 | `usage` | `CarveOptionError` | an unknown flag, a bad or missing value, a refused combination, `--write` on standard input, an include root that cannot be read |
| 2 | `input-unreadable` | | a file that is missing or unreadable, a tree in JSON that is not UTF-8 |
| 2 | `input-invalid` | `CarveInputError` | a source longer than the `max_length` of its profile (C2-H-163) |
| 2 | `ast-json-invalid` | `CarveTreeError`, `CarveLayoutError`, `CarvePatchError` | a tree or a sidecar the reader refuses (C2-A-188, C2-L-058), a patch `applyPatch` refuses (C2-T-045) |
| 2 | `import-input-invalid` | `ImportInputError` | an HTML input the importer refuses (C2-M-006) |
| 2 | `output-unwritable` | | a file of `--write`, `--output` or a report that cannot be written |

## Not carried over

The 0.1 commands, flags and reports that this document does not carry over are listed in `UPGRADING.md`, Part 2, "Command line and missing features".

## Counts

| Section | Clauses |
| --- | ---: |
| Scope | 4 |
| Library | 6 |
| Commands | 4 |
| Input and output | 9 |
| Diagnostics and reports | 7 |
| Command flags | 19 |
| Exit codes | 4 |
| **Total** | **53** |

This document holds 53 clauses, none of them an exception. Ids run to C2-T-053.
