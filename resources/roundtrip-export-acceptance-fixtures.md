# Roundtrip export acceptance fixtures

`roundtrip-export-acceptance-fixtures.json` samples PART 10 §13 and PART 11 §10s.

HTML cases supply source, carrier values and hosts, ordinary attributes, import modes and promised AST fields. A null carrier value requires presence only. Payload carriers declare their exact text; their elements must contain no child markup. `expectedNodes` is a multiset of projections; dotted keys address nested fields, and null requires an absent field. Positions and incidental serialization choices are excluded.

Consumers export with preservation off and on, import the preserved output, compare projections, and compare ordinary rendering after reconstruction. Deprecated carrier prefixes use the same projections. Raw cases allow the documented text fallback on a declining importer. Negative cases specify absent fields, forbidden values and whether a diagnostic is required, without fixing its wording or code. A diagnostic control supplies a valid value on the same host so unrelated losses cannot satisfy an invalid-value assertion.

Markdown rows sample container-kind recovery; existing §10s tests cover the wider container contract. Collision rows require the carrier to win and report the dropped authored attribute. The footnote recovery resource supplies the approved paired-carrier matrix.

Invalid generic spans are tested in safe and semantic modes. Their trusted roundtrip raw-HTML fallback is excluded here; these fixtures do not settle that separate recovery question.
