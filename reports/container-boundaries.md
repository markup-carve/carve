# Container boundary follow-up

The follow-up resolves the structural and continuation-marker disagreements from [the earlier report](container-differential.md). The 976-case sweep now has 975 exact HTML matches and no refusals. The remaining case is quote HTML indentation after a comment: all three engines produce the same elements and text.

## Boundary decisions

The expected results follow the written rules, with 89 shared regression fixtures in [container-boundaries.json](../tests/fixtures/container-boundaries.json).

- A list at the start of a quote carries its first block's continuation state. A heading, table, comment, or definition leaves no ordinary-line claim for an unmarked follower. The follower belongs outside the quote. An explicit quote marker and a list marker folded into an existing paragraph are controls. This follows PART 0 S4 and CARVE-P0-007/009.
- A fence at the start of a nested quote leaves no paragraph open. Its unmarked follower closes the unmatched containers. Marker-line lists retain their separate term and fence folding rules; the fixtures include those controls.
- List markers continue an open description paragraph under §10 I2 and the `definition_body` production. The spec and Rust had treated the executable spec's marker exclusion as an additional ownership rule. That exclusion has been removed. A blank before the marker still ends the body.
- A heading, table, or thematic break on an ordered item's marker line leaves no paragraph to continue below its content column. Rust now applies the same collection floor as the other engines, following CARVE-P0-007/009.
- A rejected `+` attachment contributes no synthetic blank to a preceding fence. A successful attachment begins a separate block in the host, after any unfinished code or raw fence. A marker at the fence's content column is payload. CARVE-P9-033 now states this boundary explicitly.

The last decision corrects one existing spec regression expectation that placed an attached paragraph inside code. Rust's three description-marker expectations and JavaScript's quoted-table description expectation were also updated to match the written rules.

## Prefix classification

The spec carries marker suffix classifications and initial quote-prefix summaries within each parse. Both parsers key cached answers by source line and numeric suffix offset, avoiding repeated string hashing. JavaScript creates fresh mutable continuation state for each item and retains a nested quote's shared state only while lazy text leaves it unchanged. No cache survives the parse.

Regex calls at depth 128 with a following lazy line:

| Parser | Quote | Bullet | Ordered |
| --- | ---: | ---: | ---: |
| Spec before | 30,799 | 45,155 | 78,945 |
| Spec after | 6,045 | 4,008 | 5,794 |
| JavaScript before | 8,228 | 59,743 | 52,255 |
| JavaScript after | 8,232 | 19,103 | 19,616 |

Doubling depth from 64 to 128 roughly doubles these counts. The tests enforce a ratio below 2.25, a live counter, and repeatability for both EOF and lazy-follower inputs. Mixed quote/list prefixes have the same guard at depths 32 and 64, below the nesting cap. All 18 profiling parse trees per parser are unchanged. These counts measure regex invocations, not character work or overall parser complexity.

## Evidence

- [Differential before](container-boundaries-before.json)
- [Differential after](container-boundaries-after.json)
- [Spec profiles before](container-boundaries-spec-before.json) and [after](container-boundaries-spec-after.json)
- [JavaScript profiles before](container-boundaries-js-before.json) and [after](container-boundaries-js-after.json)

Use the differential and profiling commands in the earlier report to reproduce the checks. The differential command still exits 1 because it compares exact HTML and retains the formatting disagreement.

## Validation and remaining probes

The full spec suite passed 4,607 tests with 2 skipped. JavaScript passed 27,665 tests with 77 skipped, plus type checking and lint. Rust passed 204 library tests and 6,915 suite tests with 3 ignored before the last upstream rebase; the shared fixture check passed again afterward, with both position modes. Added controls cover fences after headings, colon interruption inside nested quotes, closed description bodies, successful raw attachments, heading IDs, link scope, and distinct source lines of equal length. After the JavaScript rebase, 2,077 focused and corpus checks passed. All 89 shared fixtures passed in Rust's two position modes. Claude reviewed the implementation and the follow-up fixes.

Two [recorded review cases](container-boundaries-additional.json) remain outside the original matrix. For `- ::: box` followed by `+` and `tail`, the spec and JavaScript put the paragraph inside the div; Rust puts it beside the div in the item. An authored blank after a rejected raw-fence attachment also produces different trailing whitespace in Rust. These need separate boundary and whitespace decisions. The original matrix's quote-comment indentation difference remains open.
