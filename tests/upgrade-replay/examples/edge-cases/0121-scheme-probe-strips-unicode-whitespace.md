## Scheme probe strips Unicode whitespace

The URL scheme probe strips ALL Unicode whitespace -- including NARROW NO-BREAK
SPACE (U+202F) -- before matching the scheme (PART 9 §25). A reference
definition cannot hand it such a destination: the separator after `:` is a run
of spaces (`CARVE-P3-009`), and a U+202F after that run is content, which leaves
the destination empty. The line is a paragraph and nothing links.

<!-- The separator space is followed by NARROW NO-BREAK SPACE (U+202F) before `javascript:`. -->

::: compare no-render

```carve
[click][a]

[a]:  javascript:alert(1)
```

```html
<p>[click][a]</p>
<p>[a]:  javascript:alert(1)</p>
```

:::
