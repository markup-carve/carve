# Roundtrip export acceptance fixtures

`roundtrip-export-acceptance-fixtures.json` samples PART 10 §13 and CARVE-P11-063 to §10u.

HTML cases supply source, carrier values and hosts, ordinary attributes, import modes and promised AST fields. A null carrier value requires presence only. Payload carriers declare their text; their elements must contain no child markup. An array lists permitted encodings, allowing an abbreviation definition with or without its final LF. `expectedNodes` is a multiset of projections; dotted keys address nested fields, and null requires an absent field. Positions and incidental serialization choices are excluded.

Consumers export with preservation off and on, import the preserved output, compare projections, and compare ordinary rendering after reconstruction. Deprecated carrier prefixes use the same projections. Raw cases allow the documented text fallback on a declining importer. Negative cases specify absent fields, forbidden values and whether a diagnostic is required, without fixing its wording or code. A diagnostic control uses the same host with a valid carrier value or no carrier so unrelated losses cannot satisfy an invalid-value assertion. A contradictory-pair row also names, in `expectedDiagnostic`, the code and severity §13d sets for the pair.

Markdown rows sample container-kind recovery (§10s) and the attribute-line, definition-list, caption and inline carriers (§10t, §10u); existing §10s tests cover the wider container contract. Collision rows require the carrier to win and report the dropped authored attribute. A collision row whose `value` is null names a reserved name with no carrier: roundtrip export writes no attribute of that name and still reports the drop, and `defaultValue` is what default export keeps. The deprecated `data-djot-` spelling of a reserved name is dropped and reported the same way. A row marked `kept` is the control: roundtrip export keeps the attribute and reports no drop. The footnote recovery resource supplies the approved paired-carrier matrix.

Markdown rows include nested definition lists whose markers carry list depth (CARVE-P11-067). `markdownImportNegative` rows are hand-written Markdown imports; one with `expectedDiagnostic` must report that diagnostic.

Reference-link rows pin the native reference form roundtrip Markdown export writes (CARVE-P11-028). A row marked `defaultExportOnly` checks the default export alone: `ordinaryFragments` must appear in it and `forbiddenOrdinaryFragments` must not. The `bare-div` row compares a bare div's marker bytes, and the wrapped-term row holds a marker whose payload spans two lines (CARVE-P11-063).

The adjacent ordered-list row expects `list-delimiter-changed`; the separated-list row forbids it.

`lossCodes` lists render-loss codes an HTML case reports with preservation off and on, and that a Markdown row reports under roundtrip export. A Markdown row that declares a loss returns degraded by definition, so it asserts the loss and its projection and is not compared against the source's HTML; every other Markdown row must come back rendering the same HTML. `forbiddenLossCodes` lists codes a Markdown row must not report under roundtrip export, such as `list-style-dropped` once the list-style marker carries the style (CARVE-P11-067). `returnedSourceFragments` lists text the reconstructed source holds in every listed import mode.

An invalid carrier on a generic span is consumed in roundtrip mode too, never kept inside a raw-HTML fallback (CARVE-P10-021); the `-in-roundtrip-mode` rows pin that mode on its own so the flag can be dropped separately.

A `markdownImportNegative` row may also list `expectedNodes` that must be present and `forbiddenNodes` projections that must be absent, and `expectedDiagnostics` maps a diagnostic code to the exact number of rows the import reports, each with `degraded` fidelity and `fallback` confidence. An invalid opener drops together with its closer and is reported once as `carrier-marker-dropped` (CARVE-P11-063). A composite figure's caption marker drops with that pair and adds no second row. A depth on a marker that is not a definition-list marker makes it invalid, so it drops alone and is reported the same way (CARVE-P11-067).

A row marked `aheadOfPin` lists the assertion labels the pinned engine is expected to fail in `fails`. A flagged negative case is checked in every listed import mode. The test fails if an unlisted assertion fails, a listed assertion passes, or the row passes entirely. Remove passing labels or the flag when the pinned engine catches up.

A row with `exportedHtml` also records the exact export bytes of the reference engine that first implemented it. Every engine must produce the same bytes, up to the line breaks that end the document.
