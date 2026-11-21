## Widened verbatim fences

A verbatim run widens so its content can hold a shorter backtick run: the span
ends at a run of EXACTLY the opening width, and any shorter run inside is
content. That applies uniformly to the whole verbatim family - inline code, the
inline literal, and both math forms - because each is the same backtick run with
a different sigil in front.

Worth pinning because a highlighter or engine that only handles the one- and
two-backtick widths closes at the first shorter run inside a wider fence and
leaks the rest of the span as prose, which is exactly what happened in the
highlight.js grammar (markup-carve/carve-grammars#52). No other corpus case uses
a fence wider than two backticks for these constructs.

::: compare

```carve
A ```span with `` inside``` stays one code span.

A !```literal with `` inside``` stays prose.

Then $```a `` b``` ends the run.

$$```x `` y```
```

```html
<p>A <code>span with `` inside</code> stays one code span.</p>
<p>A literal with `` inside stays prose.</p>
<p>Then <span class="math inline" role="math">\(a `` b\)</span> ends the run.</p>
<p><span class="math display" role="math">\[x `` y\]</span></p>
```

:::
