## Footnote definition separator must be a space

The separator after a footnote-definition marker must be a literal space (U+0020). A tab after `[^label]:` does **not** open a definition; the line stays an ordinary paragraph and the tab is preserved as text. This aligns with heading, list, and task markers, which already reject a tab, and with the grammar 's `space` production.

::: compare

```carve
Use [^a].

[^a]:	Tabbed
```

```html
<p>Use [^a].</p>
<p>[^a]:	Tabbed</p>
```

:::
