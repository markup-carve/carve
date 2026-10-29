## A marker-line link definition is collected where no paragraph is open

A definition written directly after a list marker is metadata, not item content,
and what stands above it does not change that. NO OPEN PARAGRAPH, NO LAZY LINE
decides it: a definition line, a heading, a comment and a marker line are each
non-blank and none of them leaves a paragraph for the marker line to fold into,
so the item is real and the definition in it defines a reference. The item is
structurally present and renders empty.

::: compare

```carve
[f]: t
* [d]: u

[go][d]
```

```html
<ul>
  <li></li>
</ul>
<p><a href="u">go</a></p>
```

:::


Only an OPEN paragraph makes the marker line lazy text. A list does not
interrupt one (PART 9 section 10), so here both lines are one paragraph, the
definition is part of its text, and nothing is defined.

::: compare

```carve
para
* [d]: u
```

```html
<p>para
* [d]: u</p>
```

:::
