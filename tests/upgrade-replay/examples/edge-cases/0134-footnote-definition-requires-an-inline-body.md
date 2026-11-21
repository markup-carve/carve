## Footnote definition requires an inline body

A footnote definition carries its body on the marker line: `[^label]:` followed by a space and inline content (PART 9 §16). A bare `[^label]:` with nothing after the colon is **not** a definition — it stays an ordinary paragraph, and a following indented line folds into it as paragraph text. Continuation lines extend a definition only when the marker line itself opened one.

::: compare

```carve
Use [^a].

[^a]:
  First
```

```html
<p>Use [^a].</p>
<p>[^a]:
First</p>
```

:::
