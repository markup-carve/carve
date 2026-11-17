# Candidate 10 rule inventory

Before each change, the named terms were searched over all of `spec/0.2/`. Paths below are the places found; the point commit contains the resulting edit.

## R1 opt-in lint defaults

Search: `emphasis-as-heading`, `duplicate-reference-url`, `non-descriptive-link-text`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/data/lint-rules.json`, `spec/0.2/writer.md`. Catalog defaults and CC-735, CC-737, CC-932, CC-951, CC-953.

## R2 unregistered extension writer

Search: `C2-X-023`, `C2-X-049`, `O24`.

Places: `spec/0.2/STATUS.md`, `spec/0.2/conformance/clause-cases.json`, `spec/0.2/extensions.md`, `spec/0.2/writer.md`. CC-906 holds the source-form result. The status point is removed in the final status update.
