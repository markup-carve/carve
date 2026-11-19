## Ordered marker vs prose

Letter and roman markers are ambiguous: a lone `a.` in running prose stays
text (it would need a blank line before, a sibling marker, or indentation
to start a list). Decimal markers always start a list.

::: compare

```carve
Pick option a. it is the best one here.
```

```html
<p>Pick option a. it is the best one here.</p>
```

:::
