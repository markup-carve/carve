# Open points after candidate 10

- O-31-7: `writer-refused` has no portable byte-conformance input; leave it in engine tests under C2-W-133.
- O-31-8: annotation-range reader call and 8 MiB source-body fixture need a later API or corpus change.
- O-30-3: the recorded quote input has no term; a reproducing 0.1/0.2 pair is needed.
- O-30-5: making U-167 and U-168 escapes changes upgrade output; await a ruling.

- G-H1 / F13: Input `[x]{KBD} and [y]{abbr="a" ABBR="b"}`. C2-A-035 merges `abbr` and `ABBR`, giving `<abbr title="b">`; C2-H-013 and HTML Example 80 keep the uppercase key as an ordinary attribute, giving `<abbr title="a" ABBR="b">`. Recommendation: preserve the 0.1 render if confirmed, by excepting the three semantic keys from AST key merging; otherwise correct Example 80 and C2-H-013 to the merged tree. The 0.1 result is not established by the supplied evidence.

- G-H4: Inputs `{-{_a-}_} b-}` and `{-a-}{+{+b~}+}+}`. Reading one restores a report row for their 0.1/0.2 render difference; reading two leaves U-201 withdrawn. Recommendation: add a new report row limited to nested braced boundaries after confirming the 0.1 output.

- G-H5: Input `a^^[\n[^](u)\n`. Reading one keeps the inline note and treats the inner caret pair as text; reading two treats the opener as text and then permits the inner bracket to close it. Recommendation: use the engine fixed-point reading, with a stated pass bound, if the 0.1 result does not decide the issue.
