# Layout ownership prototype

This prototype models the boundary transition table and the column-only owner
selection in `CARVE-P0-003`, in [Part 0 of the grammar](../../resources/grammar.ebnf).
It follows the approach of [djot.v](https://github.com/hon-gyu/djot.v): state a
parser property precisely, supply a proof, and compare the model with existing
implementations.

The JavaScript evidence check runs independently and must not be reported as
proof verification. The proof command compiles the model and checks each
theorem's reported assumptions.

## Model and assumptions

`Ownership.v` contains eleven theorem scripts:

- A boundary other than end of input leaves its containing frame open.
- Comments close the paragraph while leaving the containing frame open.
- A closed frame stays closed when another boundary arrives.
- Boundary transitions give the same open/closed state for quotes, list items,
  definition bodies and footnote bodies.
- Changing paragraph flags throughout the stack does not change column ownership.
- A line at or below a frame's base is considered by an ancestor.
- A line past an open frame's base belongs to that frame before its ancestors.
- A line reaching the content column belongs to an open, well-formed frame.
- Processing two boundary sequences together gives the same state as resuming
  after the first sequence.
- Equal complete frame states produce equal final states for the same suffix.
- End of input closes the frame, and later boundaries cannot reopen it.

The input is already classified. The model assumes that prefix decoding,
comment recognition and opaque-body handling have finished. Column selection
applies only when there is no eligible stored continuation claim. Frames have
`base_column < content_column`; the content-column theorem states that
precondition explicitly. The stack is stored innermost first and has distinct
frame identifiers in intended use. The document is the fallback owner.

These statements cover a small part of layout. Boundary uniformity does not
establish uniform parsing of source inside containers: the model deliberately
uses one boundary operation for all four kinds. The two sequence laws are
algebraic properties of this state reducer. They do not establish incremental
parsing of arbitrary edits. The model
does not cover inline parsing, prefix recognition, lazy-claim construction,
fence lookahead, block construction, rendering, source positions, roundtrips or
complexity. No theorem connects the JS, PHP or Rust implementation to the model.

## Run the checks

Use the repository's Node version and installed npm dependencies. CI pins OCaml
4.14.2, Rocq core 9.2.0 and standard library 9.1.0. To install the proof packages
in an existing opam switch:

```sh
opam install rocq-prover rocq-core.9.2.0 rocq-stdlib.9.1.0
opam exec -- npm run proof:layout
```

With Rocq or Coq already on `PATH`, run:

```sh
npm run proof:layout
```

The runner accepts `rocq compile` or `coqc`. It copies the model into a temporary
directory, generates 28 examples from the normative JSON transition table and
six examples from the authored source traces, then compiles both files. An
exhaustive match checks that the model has no extra boundary constructors. A
missing compiler or failed proof returns a nonzero exit status. The runner
rejects local axiom and admission tokens, reported theorem assumptions, and
disabled kernel checks. It generates a named assumption report for every theorem
declaration and rejects missing or mismatched reports. Review the theorem statements as well: compilation
checks the stated proposition, including its preconditions. The build removes
temporary proof artifacts on exit. The `Layout proofs` workflow runs this check
and the evidence tests on relevant pull requests and pushes.

The source traces compare the executable specification and the pinned JS engine.
Three also compare the corpus source and expected HTML. All six use one
top-level list item opened with `- ` at column zero, with content column two.
The runner checks that restriction and the follower's authored column. It
measures membership in that item, without distinguishing a new paragraph from
lazy folding. Boundary classification remains manual. Source equality checks
prevent a corpus edit from silently reusing an old trace; they do not prove the
classification correct. These traces exercise the column-only branch, so the
blank and comment cases have the same modeled owner for the same column.

To run only that evidence comparison:

```sh
npm run proof:layout:evidence
```

Both commands report known discrepancies explicitly. Successful checks mean the
observations match the recorded evidence, including those discrepancies. They
do not mean that the readers conform to the model. The ordinary test suite runs
the evidence checks without requiring a proof compiler.

## Discrepancies requiring a specification decision

The six traces contain two disagreements with the Part 0 interpretation.
`cases.mjs` names both and records the observed result, so changed behavior or a
removed declaration fails the evidence check.

**After a blank:** corpus case
`143-post-blank-list-continuation-content-column-model` puts a column-one follower
outside a list item whose base is zero and content column is two. Both readers
match that fixture. Part 0's owner table assigns the band strictly above the
base and below the content column to the surviving frame. The post-blank
content-column rule and Part 0 need to be reconciled before treating this as an
implementation defect.

**After a comment:** for the source string `- intro\n%% c\ntail\n`, both readers
keep `tail` in the list item. Part 0 says the comment clears the continuation
claim and a subsequent line at the base belongs to an ancestor. The model
therefore assigns `tail` to the document. This needs the same review against
the construct-specific rules.

The prototype changes no language rules or engine behavior. Resolve these
disagreements before widening the model to stored claims and prefix handling.
The next proof obligation is that source classification supplies the preconditions
used here. Further engine comparisons remain tests until an implementation
correspondence proof exists.
