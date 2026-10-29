## A tab as the first character of a definition term

A tab right after the marker's separator space is a different question from
the previous one: the separator itself is a literal space, and it is present,
so the marker is satisfied and a term forms. The tab is the first character of
the term's *content*, not part of the separator - ordinary leading whitespace
there, stripped the same way a bullet's own extra separator spaces never reach
the item's text. It is not protected by the tabs-in-code verbatim rule, which
covers fenced code content and inline code spans only (carve#698).

::: compare

```carve
:: 	x
```

```html
<dl>
  <dt>x</dt>
</dl>
```

:::
