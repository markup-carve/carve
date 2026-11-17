# Reference engine work for freeze candidate 10

| Point | Required change | Cases |
|---|---|---|
| R1 | Keep `emphasis-as-heading`, `duplicate-reference-url` and `non-descriptive-link-text` off unless selected. | CC-1046; CC-735, 737, 932, 951, 953 |
| R2 | An unregistered extension writer keeps a valid source form without a loss. | CC-906 |
| R3 | Retire `references-placement-in-container` until an extension places references. | Former CC-809, 810 removed |
| R4 | Use the revised term-line message. | CC-697, 992 |
| R5 | Write a core div's first class on its attribute line when an enabled matcher would claim its named opener. | CC-1047 |
| R6 | Emit only the authored-id message for `duplicate-id`. | CC-997 |
| R7 | Report `delimited-table-malformed` for an unclosed quote only. | Existing malformed-table cases |
| R8 | Report each eligible list-marker and table-shaped paragraph line. | Existing line-run cases; U-372, 373 |
| R9 | Do not report a migration loss for spelling or a field with a 2.0 representation. | CC-505 |
| R10 | No change until carried readings are decided. | - |
| CR9-01 | Reserve generated heading ids when assigning tab input ids. | CC-1048 |
| CR9-02 | Pass standard extension registration into `decodeTree` and `validateTree`. | CC-468 to 472 |
| CR9-03 | Default 1.2 unordered list character to `-`; map Boolean `checked` to task marks `x` or space. | CC-505, 1050 |
| CR9-04 | Reduce repeated report flags before collision and order checks. | CC-1051 |
| CR9-05 | Attach a caption directly below a valid code include. | CC-1052 |
| CR9-06 | Count parsed link definitions only for duplicate URLs. | CC-1053 |
| CR9-07 | Count parsed footnote definitions only for normalized labels. | CC-1054 |
| CR9-08 | Exclude titles written to HTML attributes from bidi lint. | CC-1055 |
| CR9-09 | Check column overlap only against head marks. | CC-1056 |
| CR9-10 | Range an attribute by key and value without braces, and an opener by its mark. | CC-649, 914, 1057 |
| CR9-11 to 16 | Adopt the revised term, underline, region, quote, table-width and duplicate-id messages. | CC-697, 961, 1058 to 1060, 997 |
| CR9-17 to 20 | Adopt the revised empty-definition, definition-location, comment-span and plus messages. | CC-1061 to 1063, 715 |
| Extra: Djot heading | Exclude indented Carve heading continuations; use the revised message. | CC-1064 |
| Extra: Djot plus | Search parsed paragraph lines only. | CC-1065 |
| Extra: fence fallback | Use a message that fits plain divs too. | CC-1066 |
| Extra: fence title | Use the neutral further-words message for all opener forms. | CC-1067 |
| Extra: GitHub alert | Use the neutral message across the reported block forms. | CC-1068 |
| Extra: profile loss | Name degradation under the profile, including a nesting limit. | CC-1069 |
| Extra: duplicate id | Describe authored id lookup even when rendering degrades the nodes. | CC-1070 |
| G-H1 / F13 | Held pending the semantic-key merge reading. | HTML Example 80 |
| G-H2 / F14 | A degraded resolved cross-reference writes its link text. | CC-358, HTML Example 34 |
| G-H3 | Treat uppercase semantic keys as the listed roundtrip loss. | C2-H-195 row 19 |
| G-H4 | Held pending upgrade-map classification. | - |
| G-H5 | Held pending inline-note closing rule. | - |
| F11 | Stored tree corrected; engine's alphabetic list result already agrees. | CC-287 |
| F12 | Preserve ASCII slug case; stored tree corrected. | HTML Example 81 |
| F15 | Stored HTML corrected; engine's degraded code value already agrees. | CC-005 |
