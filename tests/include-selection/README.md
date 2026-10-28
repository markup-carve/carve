# Delimited table include selection

`cases.json` records the #3762 selection cases. `tests/include-selection.test.mjs` checks the HTML and literal fallback cases against the executable spec model, including 1,024 generated variants.

The `markdown` expectations and `lintVectors` are processor targets for markup-carve/carve-js#3804 and later engine ports. They join the portable include-conformance goldens when the reference engine implements the ruling.
