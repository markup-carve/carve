## An idle escape does not spread from the occurrence that needed one

PART 11 §2 escapes a character IF AND ONLY IF omitting the escape would change
the re-parsed document, and it takes that decision per OPENER OCCURRENCE. PART
11 §2b bounds how far the conservative fallback REACHES - the smallest unit
whose minimal form fails, never the whole document - and corpus 396 pins that
bound. It does not make the unit itself finer, and this pair is the half it
leaves: WHICH occurrences inside a unit that did escalate carry a backslash.

The paragraph below is indented, so its text is `{.note}` and not a block
attribute. Written back at column zero the first line WOULD open one, so the
`{` is load bearing and comes back escaped. The `.` and the `}` beside it are
not: neither opens anything at that position, and `\{.note}` re-parses as the
paragraph the author wrote. So does the `.` ending the second line.

The unit-scoped fallback wrote `\{\.note\}` here - one knob per unit, so a
unit that failed was written conservatively in full and every candidate in it
was escaped beside the one that needed it. That spelling renders the HTML below
and re-parses to the same tree, so the `.fmt` sidecar beside this pair - not the
HTML - is what measures the occurrence.

::: compare

```carve
 {.note}
 This paragraph.
```

```html
<p class="note">This paragraph.</p>
```

:::
