# Carve follow-up to the Djot differential checks

The 976-case sweep compared the executable spec, JavaScript, and Rust using Carve syntax. It found 31 exact HTML differences. Six came from one confirmed spec bug: a definition term inside nested quotes left the outer quote accepting a lazy continuation even though no paragraph was open. The fix reduces the differences to 25.

All 16 footnote-indentation cases and all 288 reference/incomplete-inline cases agreed. Carve's unindented footnote continuation ends the note; Djot's lazy-footnote rule must not become a Carve fixture unchanged.

The remaining differences are observations, not 25 established bugs. One is quote HTML indentation after a comment. Others concern fenced blocks, continuation markers, lists inside quotes, description boundaries, and lines below an ordered item's content column. The reports retain each input and all three outputs so these can be reduced and checked against the relevant rule without voting among implementations.

- [Before: 945 matches, 31 differences](container-differential-before.json)
- [After: 951 matches, 25 differences](container-differential-after.json)
- [Six regression fixtures](../tests/fixtures/nested-term-boundary.json)
- [Deterministic case generator](../scripts/lib/container-differential-cases.mjs)

## Prefix scanning

The parsers were classifying continuation state when no following line could use it. JavaScript also classified fenced-block membership for list bodies with no blank lines, although only its blank-line tightness check reads that result. Those unused walks are now skipped.

Regex calls at depth 128, with `end` after the repeated marker and a final newline:

| Parser / marker | Before | After |
| --- | ---: | ---: |
| Spec / quote | 28,749 | 1,557 |
| Spec / bullet | 45,014 | 2,966 |
| Spec / ordered | 78,804 | 4,244 |
| JavaScript / quote | 3,016 | 3,016 |
| JavaScript / bullet | 96,959 | 7,247 |
| JavaScript / ordered | 80,832 | 7,503 |

Doubling depth from 64 to 128 now roughly doubles these counts. The regression tests require a ratio below 2.25 and check that the counter is live and repeatable. Counts measure regex invocations, not regex character steps or a proof of linear parsing.

This fixes the measured end-of-input path. A following lazy line still requires state: the spec's bullet case remains 45,155 calls, and JavaScript's falls from 110,991 to 59,743 but remains superlinear. Carrying state between enclosing containers is still needed for that case. JavaScript quote scanning at EOF was already improved before this work.

Every before/after serialized parse tree agrees across the 18 profiling inputs per parser. The spec also preserves all 1,955 existing corpus trees, with no refusals. Raw profiles include elapsed times, but concurrent work on this machine makes counts the stronger comparison.

## Reproduction

Baseline revisions:

- Spec: `8323c14a79fbac5606f85cea7716d8a6ea954200`
- JavaScript: `74d38384ed756a3d7dfe3653d52929746d6da924`
- Rust: `cf6c75ac76723e0475825bb804dace5c770d70c0`

Build JavaScript with `npm ci && npm run build` and Rust with `cargo build --bin carve` in clean checkouts. From the spec checkout:

```sh
node scripts/container-differential.mjs \
  --js=/absolute/path/carve-js/dist/index.js \
  --rust=/absolute/path/target/debug/carve \
  --report=/tmp/carve-differential.json
node scripts/container-prefix-profile.mjs \
  --module=/absolute/path/parser/module.js \
  --report=/tmp/carve-prefix-profile.json
```

The differential command exits 1 for disagreements or refusals, and fails on engine errors. It compares exact HTML after trimming only outer whitespace. Run the profiler separately against each baseline and changed parser; the module must export `parse`.
