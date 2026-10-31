## A tab as the first character of a definition term

A tab right after the marker's separator space is a different question from
the previous one: the separator itself is a literal space, and it is present,
so the marker is satisfied and a term forms. The tab is the first character of
the term's *content*, not part of the separator, and it stays in the term
(CARVE-P2-010, carve#4610). The separator is spaces only (CARVE-P7-002), so the
tab is the first content character, as a tab after a heading's separator is
(CARVE-P2-002).

::: compare

```carve
:: 	x
```

```html
<dl>
  <dt>	x</dt>
</dl>
```

:::
