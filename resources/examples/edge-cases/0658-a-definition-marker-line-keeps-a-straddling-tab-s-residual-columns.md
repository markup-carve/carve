## A definition marker line keeps a straddling tab's residual columns

PART 9 §24 C5 strips a container's indent by columns and, on a list-marker line, re-inserts the columns a straddling tab leaves past the strip as spaces. A `:: ` term line and a `: ` description line are list-marker lines too (carve#3550). The tab before `:: t` reaches column 4 and the description body strips two of those columns, so the two left over put the nested term two columns into the body. `  : zq` sits at the body's own column, left of that term, so it ends the nested list and stays text. Consuming the tab whole would put the term at the body's column and make `zq` its description.

::: compare

```carve
:: a
: b
	:: t
  : zq
```

```html
<dl>
  <dt>a</dt>
  <dd>
    <p>b</p>
    <dl>
      <dt>t</dt>
      <dd>zq</dd>
    </dl>
  </dd>
</dl>
```

:::
