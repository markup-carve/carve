# Candidate 10 rule inventory

Before each change, the named terms were searched over all of `spec/0.2/`. Paths below are the places found; the point commit contains the resulting edit.

## R1 opt-in lint defaults

Search: `emphasis-as-heading`, `duplicate-reference-url`, `non-descriptive-link-text`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/writer.md`. Catalog defaults and CC-735, CC-737, CC-932, CC-951, CC-953.

## R2 unregistered extension writer

Search: `C2-X-023`, `C2-X-049`, `O24`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/extensions.md`, `spec/0.2/writer.md`. CC-906 holds the source-form result. The status point is removed in the final status update.

## R3 references placement void

Search: `references-placement-in-container`, `C2-I-101`, `C2-H-158`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/inline-brackets.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/html.md`, `spec/0.2/import-html.md`, `spec/0.2/includes.md`, `spec/0.2/syntax-inline.md`, `spec/0.2/writer.md`. Catalog row and CC-809/810 are the applicable result places.

## R3 references placement void

Search: `references-placement-in-container`, `C2-I-101`, `C2-H-158`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/inline-brackets.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/html.md`, `spec/0.2/import-html.md`, `spec/0.2/includes.md`, `spec/0.2/syntax-inline.md`, `spec/0.2/writer.md`. Catalog row and CC-809/810 are the applicable result places.

## R4 term-folding message

Search: `definition-term-block-folded`, `C2-B-075`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/line-shapes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. CC-697 and CC-992 exercise the trigger.

## R5 preserve a div class claimed by a matcher

Search: `C2-W-039`, `C2-X-008`, `carve.tabs`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/UPGRADING.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/README.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/ast-schema.json`, `spec/0.2/data/extensions.json`, `spec/0.2/data/node-slots.json`, `spec/0.2/extensions.md`, `spec/0.2/source-layout.md`, `spec/0.2/writer.md`. A writer case supplies a core div with the tabs matcher enabled.

## R6 duplicate-id message

Search: `duplicate-id`, `C2-A-039`.

Places: `spec/0.2/UPGRADING.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/html.md`, `spec/0.2/import-html.md`, `spec/0.2/includes.md`, `spec/0.2/writer.md`. The generated-id near miss is CC-997.

## R7 narrow malformed table wording

Search: `C2-B-180`, `C2-B-181`, `delimited-table-malformed`.

Places: `spec/0.2/UPGRADING.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/data/table-marks.json`, `spec/0.2/includes.md`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. Existing malformed-table cases exercise an unclosed quote.

## R8 per-line lint change from 0.1

Search: `list-marker-without-blank-line`, `table-shaped-paragraph`, `C2-B-022`, `C2-B-168`.

Places: `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/interrupters.json`, `spec/0.2/data/line-shapes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/data/schemas/interrupters.schema.json`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. Clauses and cases report each line; add upgrade rows U-372 and U-373.

## R9 migration loss promise

Search: `C2-A-178`, `C2-A-180`, `migration-loss`, `migrateTree`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/UPGRADING.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/README.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/data/cli.json`, `spec/0.2/data/schemas/upgrade-map.schema.json`, `spec/0.2/data/upgrade-map.json`, `spec/0.2/tooling.md`. Draft fields are represented, derived, or spelling-only; no separate loss code is needed.

## R10 carried open points

Search: `O-31-7`, `O-31-8`, `O-30-3`, `O-30-5`, `O24`.

Places: `spec/0.2/STATUS.md`. Four carried points have no new ruling and stay open.

## CR9-01

Search: `C2-X-048`, `tabs-1-0`, `C2-H-024`, `C2-H-146`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/extensions.json`, `spec/0.2/extensions.md`, `spec/0.2/html.md`, `spec/0.2/includes.md`. Generated heading ids join authored ids in the reserved set; new render case.

## CR9-02

Search: `C2-T-005`, `decodeTree`, `validateTree`, `extensions`.

Places: `spec/0.2/README.md`, `spec/0.2/STATUS.md`, `spec/0.2/UPGRADING.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/README.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/refused-trees.json`, `spec/0.2/conformance/schema.json`, `spec/0.2/data/README.md`, `spec/0.2/data/ast-schema.json`, `spec/0.2/data/cli.json`, `spec/0.2/data/extensions.json`, `spec/0.2/data/node-slots.json`, `spec/0.2/data/options.json`, `spec/0.2/data/schemas/extensions.schema.json`, `spec/0.2/extensions.md`, `spec/0.2/html.md`, `spec/0.2/includes.md`, `spec/0.2/tooling.md`, `spec/0.2/trees/nodes.json`, `spec/0.2/trees/refused.json`. Tree calls now read registered extensions; CC-468 to CC-472 already require this; new near miss.

## CR9-03

Search: `C2-A-179`, `checked`, `task.mark`, `CC-505`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/UPGRADING.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/schemas/table-marks.schema.json`, `spec/0.2/data/schemas/task-states.schema.json`, `spec/0.2/data/task-states.json`, `spec/0.2/data/upgrade-map.json`, `spec/0.2/extensions.md`, `spec/0.2/html.md`, `spec/0.2/import-html.md`, `spec/0.2/includes.md`, `spec/0.2/syntax-blocks.md`, `spec/0.2/trees/README.md`, `spec/0.2/trees/layouts.json`, `spec/0.2/writer.md`. The 1.2 migration states the exact defaults exercised by CC-505.

## CR9-04

Search: `C2-T-009`, `C2-T-015`, `CC-911`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/data/schemas/cli.schema.json`, `spec/0.2/tooling.md`. Repeated instances are reduced before report collisions and ordering.

## CR9-05

Search: `unattached-caption`, `C2-B-147`, `C2-N-073`.

Places: `spec/0.2/UPGRADING.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/conformance/refused-trees.json`, `spec/0.2/data/ast-schema.json`, `spec/0.2/data/close-facts.json`, `spec/0.2/data/line-shapes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/data/upgrade-map.json`, `spec/0.2/includes.md`, `spec/0.2/syntax-blocks.md`, `spec/0.2/trees/nodes.json`, `spec/0.2/trees/refused.json`, `spec/0.2/writer.md`. A valid code include is a caption target; new near miss uses the supplied input.

## CR9-06

Search: `duplicate-reference-url`, `C2-B-081`, `U-210`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/UPGRADING.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/escape-contexts.json`, `spec/0.2/data/line-shapes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/data/upgrade-map.json`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. U-210 records the 0.1 container-definition difference; count parsed definitions only.

## CR9-07

Search: `footnote-labels-differ-only-in-whitespace`, `C2-B-081`, `U-213`.

Places: `spec/0.2/UPGRADING.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/escape-contexts.json`, `spec/0.2/data/line-shapes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/data/upgrade-map.json`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. U-213 records the 0.1 container-definition difference; count parsed definitions only.

## CR9-08

Search: `bidi-control-in-source`, `C2-H-172`, `C2-H-048`.

Places: `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/html.md`, `spec/0.2/import-html.md`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. A title rendered in an attribute is excluded; new code-title near miss.

## CR9-09

Search: `table-column-overlap`, `C2-B-178`, `C2-B-213`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/UPGRADING.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/data/table-marks.json`, `spec/0.2/data/upgrade-map.json`, `spec/0.2/html.md`, `spec/0.2/import-html.md`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. Only head marks can overlap column attributes; new body-mark near miss.

## CR9-10

Search: `C2-W-138`, `carrier-attribute-dropped`, `block-opener-overindented`, `CC-649`, `CC-914`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/UPGRADING.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/data/schemas/lint-rules.schema.json`, `spec/0.2/data/upgrade-map.json`, `spec/0.2/html.md`, `spec/0.2/writer.md`. Attribute extent is the key and value; opener extent is the mark.

## CR9-11

Search: `definition-term-block-folded`, `C2-B-075`, `CC-697`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/line-shapes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. R4 changed the message; CC-697 covers the given input.

## CR9-12

Search: `setext-heading-underline`, `C2-B-160`, `CC-961`.

Places: `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. CC-961 covers the equals-run input.

## CR9-13

Search: `region-marker-renders-as-text`, `C2-B-217`, `C2-N-038`.

Places: `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/includes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/includes.md`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. A line comment with differently cased keyword is not a region marker; new case.

## CR9-14

Search: `blockquote-marker-without-space`, `C2-B-031`, `C2-B-161`.

Places: `spec/0.2/UPGRADING.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/containers.json`, `spec/0.2/data/escape-contexts.json`, `spec/0.2/data/line-shapes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/includes.md`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. Frontmatter input reports without producing quote or text output.

## CR9-15

Search: `table-row-cell-count`, `C2-B-178`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/UPGRADING.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/data/table-marks.json`, `spec/0.2/data/upgrade-map.json`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. A table without a head still has a first row.

## CR9-16

Search: `duplicate-id`, `C2-A-039`, `CC-997`.

Places: `spec/0.2/UPGRADING.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/html.md`, `spec/0.2/import-html.md`, `spec/0.2/includes.md`, `spec/0.2/writer.md`. R6 removed the obsolete message; CC-997 covers generated-id input.

## CR9-17

Search: `empty-reference-definition`, `C2-B-082`, `C2-B-083`.

Places: `spec/0.2/UPGRADING.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/attribute-block.json`, `spec/0.2/data/line-shapes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/data/upgrade-map.json`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. A footnote-shaped empty definition needs content.

## CR9-18

Search: `definition-in-container`, `C2-B-081`.

Places: `spec/0.2/UPGRADING.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/escape-contexts.json`, `spec/0.2/data/line-shapes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/data/upgrade-map.json`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. Top-level indented definition shape is already outside containers.

## CR9-19

Search: `comment-shaped-emphasis`, `C2-I-046`, `C2-I-052`.

Places: `spec/0.2/UPGRADING.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/inline-delimiters.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/data/upgrade-map.json`, `spec/0.2/syntax-inline.md`, `spec/0.2/writer.md`. The input is a strong span; neutral message covers both span types.

## CR9-20

Search: `deprecated-continuation-marker`, `C2-B-059`, `CC-715`.

Places: `spec/0.2/UPGRADING.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/line-shapes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/data/upgrade-map.json`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. CC-715 covers the standalone plus input.

## Catalog audit: djot-heading-continuation

Search: `djot-heading-continuation`, `C2-B-154`.

Places: `spec/0.2/UPGRADING.md`, `spec/0.2/ast.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/line-shapes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. An indented line continues a Carve heading and must be excluded; message no longer promises a changed id.

## Catalog audit: djot-plus-bullet

Search: `djot-plus-bullet`, `C2-B-034`, `C2-B-161`.

Places: `spec/0.2/conformance/README.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/containers.json`, `spec/0.2/data/escape-contexts.json`, `spec/0.2/data/line-shapes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/includes.md`, `spec/0.2/syntax-blocks.md`, `spec/0.2/writer.md`. Frontmatter is not a paragraph; only parsed paragraph lines trigger this rule.

## Catalog audit: fence-opener-fallback

Search: `fence-opener-fallback`, `C2-B-105`, `C2-B-225`.

Places: `spec/0.2/UPGRADING.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/line-shapes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/html.md`, `spec/0.2/syntax-blocks.md`, `spec/0.2/syntax-inline.md`, `spec/0.2/writer.md`. A plain div name also reaches the row; make its message name any opener.

## Catalog audit: fence-title-syntax

Search: `fence-title-syntax`, `C2-B-122`, `C2-B-225`.

Places: `spec/0.2/UPGRADING.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/conformance/examples.json`, `spec/0.2/data/line-shapes.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/data/upgrade-map.json`, `spec/0.2/html.md`, `spec/0.2/syntax-blocks.md`, `spec/0.2/syntax-inline.md`, `spec/0.2/writer.md`. Raw fences and sigil divs have further words but no title; use one neutral message.
