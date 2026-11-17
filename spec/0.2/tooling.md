# Carve 0.2: tooling

Status: part of the freeze candidate of Carve 0.2 on `next2` (`STATUS.md`).

This document defines what every engine offers a caller: the library calls and the command line program built on them, with its flags, streams, exit codes and reports. The options are the rows of `data/options.json` (C2-H-137); this document only says how each command reads them. The commands, flags, categories, calls and entry fields are also in `data/cli.json`.

## Scope

**C2-T-001** Every engine offers the calls of the section "Library" and the program of the section "Commands". A port spells a call, a result field and an error by the convention of its language, as it spells an option (C2-H-137).

**C2-T-002** The program is `carve`. An engine that installs it beside a 0.1 program may give it another name: the reference engine names it `carve2` on `next2`.

**C2-T-003** Outside this specification are the Markdown, GFM and Djot importers of the reference engine (`--from markdown`, `gfm` and `djot`), its `upgrade` command, which is part of the JavaScript engine only and is described in `UPGRADING.md` ("Running the rewrite tool"), and its scanner and event helpers. An engine may offer further commands, flags, flag values and calls; none of them takes a name of `data/cli.json` with another meaning.

**C2-T-004** `data/cli.json` holds the commands, flags, failure categories, calls and entry fields of this document. A row is normative together with the clauses it cites; where a row and its clause disagree, the clause wins.

## Library

**C2-T-005** An engine offers the calls of this table. Each reads the options of `data/options.json` whose `read_by` names its stage and refuses the others (C2-H-137).

| Call | Takes | Returns | Clauses |
|---|---|---|---|
| `parse` | Carve source as text or bytes, the parse and resolution options, `positions` (default on) | the resolved tree | C2-A-106, C2-B-218 |
| `parseWithDiagnostics` | as `parse` | the tree, the diagnostics record and `suppressedDiagnostics` | C2-A-172, C2-T-024 |
| `parseWithLayout` | as `parse` | the tree, the layout sidecar and the record | C2-L-001 |
| `render` | Carve source or a tree, the render options | HTML | C2-H-137 |
| `renderWithDiagnostics` | as `render` | HTML, the record and `suppressedDiagnostics` | C2-A-172, C2-H-130 |
| `format` | Carve source, `alignTables`, `normalize` | Carve source | C2-W-001, C2-W-134 |
| `formatWithDiagnostics` | as `format` | Carve source and the record | C2-W-134 |
| `write` | a tree, optionally its sidecar, `alignTables` | Carve source | C2-W-001, C2-W-102 |
| `writeWithDiagnostics` | as `write` | Carve source and the record | C2-W-134 |
| `lint` | Carve source, `rules`, `platforms`, `includes` | the record | C2-W-103, C2-W-109, C2-N-085 |
| `importDocument` | HTML text, `from: "html"`, `rawHtml`, `strictLosses` | the tree, its Carve source and the record | C2-M-001, C2-M-066, C2-M-082 |
| `includeDependencies` | a tree | its dependencies | C2-N-083 |
| `encodeTree` | a tree | its JSON text | C2-A-012 |
| `encodeEnvelope` | a tree | the JSON text of its envelope | C2-A-012 |
| `decodeTree` | the JSON text of a 2.0 tree or envelope | the tree | C2-A-188 |
| `validateTree` | a tree | nothing, or the refusal | C2-A-188 |
| `migrateTree` | the JSON value of a 1.x or draft tree, bare or in an envelope | the 2.0 tree, its envelope where the input was one, and the record | C2-A-178, C2-A-180 |

**C2-T-006** A call refuses with the typed error of its row in the table of C2-T-040, and with no other error; the command line turns that error into the category of the row.

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
| `upgrade` | 0.1 source | outside this specification (C2-T-003) | |

**C2-T-008** A flag is `--name value` or `--name=value`. A switch is `--name` and takes no value; `--no-name` turns it off. `--` ends the flags, and every argument after it is a file. A flag that the table of its command does not list is refused with the category `usage`.

**C2-T-009** A flag given twice takes its last value, except `--allow-loss`, which collects every value.

**C2-T-010** Each option a command reads is a flag named by the option in lower case with hyphens, so `urlPolicy` is `--url-policy`: a `boolean` option is a switch, an `enum` option takes one of its values, and a `list`, `map` or `structure` option takes JSON text. A value the option refuses is refused with the category `usage`. An option the command line does not set has its default.

## Input and output

**C2-T-011** A file is a path, or `-` for standard input. A command with no file reads standard input. The files are read in order, and the outputs of the files follow each other on standard output.

**C2-T-012** Carve source is read as bytes and is never refused for its encoding (C2-B-218). A tree in JSON is read as strict UTF-8, and a file that is not is refused with the category `input-unreadable`. HTML is read as UTF-8.

**C2-T-013** A line or a report names a file by its path as given and standard input as `<stdin>` (C2-W-100).

**C2-T-014** Standard output carries the product of the command and nothing else. Lines of diagnostics, notes and failures go to standard error. The product of `lint` and `diagnostics` is their entries.

**C2-T-015** A report flag takes a path, or `-` for standard error. The report is one JSON document for the whole run, followed by a line feed.

**C2-T-016** `--write` replaces each file whose output differs from it and leaves the others untouched. With standard input among the files it is refused with the category `usage`.

**C2-T-017** A failure of status 2 stops the run at its file; what earlier files wrote stays written. Otherwise the status of a run is the highest status of its files.

**C2-T-018** `render`, `ast`, `lint` and `diagnostics` expand includes as C2-N-004 and C2-N-085 state, through the resolver of C2-N-012. `--no-includes` turns expansion off and `--include-root` names the root. `fmt`, `import` and `migrate-ast` expand nothing (C2-N-005), and neither does a command that reads a tree with `--from-ast`.

## Diagnostics and reports

**C2-T-019** A diagnostic line is `FILE:LINE:COLUMN: SEVERITY CODE MESSAGE`, and an entry with no range is written `FILE: SEVERITY CODE MESSAGE`. FILE is the `file` of the entry where it has one (C2-N-063) and the input otherwise. LINE counts line feeds from 1, and COLUMN counts the code points of that line from 1, both at the start of the range.

**C2-T-020** An entry of the record (C2-A-173) is a JSON object with the fields of this table. The library gives every field but `line` and `column`; the command line adds those two where the entry has a range.

| Field | Value | Present | Clauses |
|---|---|---|---|
| `code` | a code of `data/lint-rules.json` | always | C2-W-106 |
| `severity` | `hint`, `warning` or `error` | always | C2-W-105 |
| `channel` | `parse`, `render-loss` or `lint` | always | C2-W-104 |
| `message` | text | always | C2-A-173 |
| `path` | an RFC 6901 pointer into the tree | where the entry is about a node | C2-A-173 |
| `range` | an object of `startOffset` and `endOffset`, in UTF-8 bytes | where the entry has a position in source | C2-A-173 |
| `file` | the id of the included file the range is counted in | where that is not the top-level document | C2-N-063 |
| `foreignType` | the name of the HTML node | on an entry of the importer that has one | C2-M-081 |
| `line` | the LINE of C2-T-019 | on the command line, with `range` | C2-T-019 |
| `column` | the COLUMN of C2-T-019 | on the command line, with `range` | C2-T-019 |

**C2-T-021** A diagnostics report is `{"files": [...]}` with one object per file in order: `file`, the name of C2-T-013; `diagnostics`, the retained entries in the order of the record; and `suppressed`, the number of entries of that file a cap held back (C2-T-024, C2-T-029). `diagnostics --json`, `lint --json` and `--report-losses` write it.

**C2-T-022** An include report is `{"files": [...]}` with one object per file in order: `file`, and `dependencies`, the dependencies of its tree (C2-N-083), each an object of `path`, `from` (the including file, absent for the top-level document), `file` (absent where the include was not read) and `read`. A host that watches files reads it as C2-N-084 says. `--report-includes` writes it.

**C2-T-023** Reports are compared as JSON values: the order of the members of an object is no contract, and the order of a list is.

**C2-T-024** An expansion retains at most `include_diagnostics` of `data/limits.json`, 100, entries whose code is the code of a cause in `data/includes.json`, the first in the order the failures occur. The result of a call that returns a record gives the number of the others as `suppressedDiagnostics`, 0 where there are none, and the command line counts them in `suppressed` (C2-T-021). An include whose entry is held back stays unexpanded as C2-N-061 says.

## Command flags

### Every command

| Flag | Value | Meaning |
|---|---|---|
| `--help` | switch | writes the usage of the command on standard output and exits with status 0 |
| `--version` | switch | writes the version of the engine and a line feed on standard output and exits with status 0 |

### `carve render`

| Flag | Value | Meaning |
|---|---|---|
| `--extensions` | JSON | the option `extensions` |
| `--heading-ids` | `off`, `keep-case`, `lower`, `ascii`, `ascii-lower`, `ascii-strict`, `ascii-strict-lower` | the option `headingIds` |
| `--labels` | JSON | the option `labels` |
| `--mode` | `interactive`, `static` | the option `mode` |
| `--profile` | `full`, `article`, `comment`, `minimal` | the option `profile` |
| `--raw-html` | switch | the option `rawHtml` |
| `--renderers` | JSON | the option `renderers` |
| `--roundtrip` | switch | the option `roundtrip` |
| `--sections` | switch | the option `sections` |
| `--smart-typography` | switch | the option `smartTypography` |
| `--social` | JSON | the option `social` |
| `--source-lines` | switch | the option `sourceLines` |
| `--strict-losses` | switch | the option `strictLosses`, with the allow list of C2-T-026 |
| `--symbols` | JSON | the option `symbols` |
| `--url-policy` | JSON | the option `urlPolicy` |
| `--from-ast` | switch | reads each file as a tree in JSON (C2-A-188) |
| `--includes` | switch, on | expands includes (C2-T-018) |
| `--include-root` | path | the containment root of includes (C2-N-004) |
| `--report-includes` | path | writes the include report (C2-T-022) |
| `--report-losses` | path | writes the losses as a diagnostics report (C2-T-021) |
| `--allow-loss` | code, repeatable | a code that is no loss (C2-T-027) |
| `--max-render-losses` | count, 100 | the losses retained per file (C2-T-029) |

**C2-T-025** A loss is a render-loss entry of a file whose code is not on the allow list. `render` writes each retained loss as a line on standard error.

**C2-T-026** With `--strict-losses` and a loss, `render` writes no HTML for that file and the file ends with status 1 and the category `render-loss` (C2-H-130). The command applies the allow list before `strictLosses`, so an allowed code alone never fails a file.

**C2-T-027** `--allow-loss` takes a code of the render-loss channel of `data/lint-rules.json`; any other value is refused with the category `usage`. An allowed code is neither written on standard error nor in the report.

**C2-T-028** `--report-losses` writes the losses of the run, and without a loss it writes the report with empty lists.

**C2-T-029** `--max-render-losses` takes a count, a decimal integer of at least 0, and its default is 100. Each file retains its first losses up to that count; the others are counted in `suppressed` and written on no line.

### `carve ast`

| Flag | Value | Meaning |
|---|---|---|
| `--positions` | switch, on | writes `pos` on the nodes |
| `--envelope` | switch | writes the envelope of C2-A-012 instead of the bare tree |
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
| `--from-ast` | switch | writes each file read as a tree in JSON (C2-W-102) |

**C2-T-030** `fmt` refuses `--write` with `--check` or with `--diff`, and `--normalize` with `--from-ast`, with the category `usage`. Without one of `--check`, `--diff` and `--write` it writes the output on standard output. A writer loss of C2-W-134 ends the file with status 1 and the category `writer-refused`.

### `carve lint`

| Flag | Value | Meaning |
|---|---|---|
| `--rules` | JSON | the option `rules` (C2-W-109) |
| `--platforms` | JSON | the option `platforms` (C2-W-109) |
| `--json` | switch | writes a diagnostics report (C2-T-021) instead of lines |
| `--includes` | switch, on | expands includes (C2-T-018) |
| `--include-root` | path | the containment root of includes (C2-N-004) |

**C2-T-031** `lint` writes the entries that the call `lint` returns, as lines or as a report, and ends a file with status 1 when an entry has the severity `warning` or `error`; a run of hints alone ends with 0. A rule that is off by default, as each `djot-` rule is, is turned on by its id in `--rules`.

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
| `--raw-html` | switch | the option `rawHtml` of the importer (C2-M-065, C2-M-066) |
| `--strict-losses` | switch | the option `strictLosses` of the importer (C2-M-082) |
| `--report-losses` | path | writes the losses as a diagnostics report (C2-T-021) |
| `--allow-loss` | code, repeatable | a code that is no loss (C2-T-027) |
| `--max-render-losses` | count, 100 | the losses retained per file (C2-T-029) |

**C2-T-033** `import` without `--from` is refused with the category `usage`. The value `html` reads the input as C2-M-001 states; the reference engine also takes `markdown`, `gfm` and `djot` (C2-T-003).

**C2-T-034** `import` applies C2-T-025 to C2-T-029 to the entries of the importer (C2-M-080) and of the writer: with `--strict-losses` a loss of either fails the file with the category `render-loss` and writes no source. Without it, a writer loss of C2-W-134 fails the file with the category `writer-refused`.

**C2-T-035** An HTML input the importer refuses ends the run with status 2 and the category `import-input-invalid` (C2-M-006). A tree of the importer that fails the reader checks (C2-A-188) is a defect of the importer, and the file ends with status 1 and the category `import-tree-invalid`.

### `carve migrate-ast`

`migrate-ast` takes no flag beyond those of every command.

**C2-T-036** `migrate-ast` writes the migrated tree, as an envelope when the input was one (C2-A-012), and writes each entry of the migration record as a line on standard error (C2-A-180). It ends with status 0, and with status 2 and the category `ast-json-invalid` for an input it cannot read as a tree.

## Exit codes

**C2-T-037** A run ends with status 0 when every file did what was asked and nothing it gates on was found.

**C2-T-038** A run ends with status 1 and no category when `fmt --check` or `fmt --diff` finds a file that would change (C2-W-100), or `lint` finds an entry of severity `warning` or `error` (C2-T-031).

**C2-T-039** Every failure writes as its first line on standard error `carve[CATEGORY]:` and a message (C2-W-101).

**C2-T-040** The failure categories, their status and the library error each comes from are the rows of this table.

| Status | Category | Error | When |
|---|---|---|---|
| 1 | `render-loss` | `CarveRenderError` | a loss under `--strict-losses` (C2-H-130, C2-M-082) |
| 1 | `writer-refused` | `CarveWriteError` | a writer loss of C2-W-134 in `fmt` or `import` |
| 1 | `import-tree-invalid` | | the importer returns a tree the reader refuses (C2-T-035) |
| 2 | `usage` | `CarveOptionError` | an unknown flag, a bad or missing value, a refused combination, `--write` on standard input, an include root that cannot be read |
| 2 | `input-unreadable` | | a file that is missing or unreadable, a tree in JSON that is not UTF-8 |
| 2 | `input-invalid` | `CarveInputError` | a source longer than the `max_length` of its profile (C2-H-163) |
| 2 | `ast-json-invalid` | `CarveTreeError`, `CarveLayoutError` | a tree or a sidecar the reader refuses (C2-A-188, C2-L-058) |
| 2 | `import-input-invalid` | `ImportInputError` | an HTML input the importer refuses (C2-M-006) |
| 2 | `output-unwritable` | | a file of `--write` or a report that cannot be written |

## Not carried over

The 0.1 commands, flags and reports that this document does not carry over are listed in `UPGRADING.md`, Part 2, "Command line and missing features".

## Counts

| Section | Clauses |
| --- | ---: |
| Scope | 4 |
| Library | 2 |
| Commands | 4 |
| Input and output | 8 |
| Diagnostics and reports | 6 |
| Command flags | 12 |
| Exit codes | 4 |
| **Total** | **40** |

This document holds 40 clauses, none of them an exception. Ids run to C2-T-040.
