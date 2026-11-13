# Data files of the 0.2 spec

The rules of Carve 0.2 that have the shape of a table, as plain JSON. An engine loads these files or generates code from them, so that the rule in the spec and the rule in the engine are one text.

The files are normative together with the clauses they cite. Every row has a `clauses` list with the ids of the clauses it encodes. Where a row and its clause disagree, the clause wins and the row is a defect.

| File | Holds |
|---|---|
| `line-shapes.json` | the line end, and every line shape of the block pass, keyed by the first character after the prefixes, with what must follow |
| `interrupters.json` | the five paragraph interrupters, and the shapes that are lazy lines |
| `containers.json` | each block that owns lines: how a line continues it, what closes it, how its body is read |
| `close-facts.json` | the five facts set when a block closes |
| `caption-number.json` | the number mark of a caption |
| `div-names.json` | what the name or the sigil of a div opener makes of the div |
| `ordered-styles.json` | the styles and delimiters of an ordered list |
| `task-states.json` | the task box and its nine characters |
| `table-marks.json` | cell split, cell prefix, span marks, alignment marks, table attributes |
| `limits.json` | the depth cap, the tab stop, the blank lines that end a list |
| `inline-scan.json` | the four steps of the inline scan, and what a failed form leaves as text |
| `inline-atoms.json` | the forms taken as one token |
| `inline-brackets.json` | the forms built on a bracket pair |
| `inline-delimiters.json` | the bare and the braced delimiters |
| `inline-braces.json` | the order of forms at an opening brace |
| `inline-sigils.json` | mention, tag, symbol and inline extension |
| `smart-punctuation.json` | the runs that smart typography replaces |
| `attribute-block.json` | the grammar of an attribute block |
| `options.json` | the 19 options |
| `lint-rules.json` | every diagnostic code |
| `escape-contexts.json` | the cases the writer tests for an escape |

Each file has a JSON Schema in `schemas/`, named after it. The schema says what every field means and which values it takes. A field that is absent from a row does not apply to that row. No value is left open.

Names that this directory introduces are in snake case. Option names, lint ids and div names are spelled as the documents spell them. Line shapes are ordered by the lowest code point of their first characters, ranked lists by rank, and every other list by its identifier.

## Use in an engine

Read a file at build time and generate the tables the engine needs from it, or load it at start. `line-shapes.json` keeps the two fields the dispatch generator of the reference engine reads: `name` and `first`, where an entry of `first` is one ASCII character or a range such as `a-z`. Do not copy a value from a file into engine source by hand.

## Check

```
npm run spec2:data
```

The script validates each file against its schema, checks that every cited clause id exists in the six documents of `spec/0.2/`, checks the order of the rows and the names one file takes from another, and prints the clauses of the two syntax chapters that no row cites. That list is a report for review and does not fail the run. It reads the six documents from `spec/0.2/`.
