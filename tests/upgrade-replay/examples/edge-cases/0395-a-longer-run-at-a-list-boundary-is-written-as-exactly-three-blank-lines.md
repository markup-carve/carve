## A longer run at a list boundary is written as exactly three blank lines

The canonical writer normalizes a blank-line run between two blocks to ONE.
PART 9 §11 N1a's hard list boundary is the exception: one blank line would
MERGE the two lists, so the run has to survive. PART 11 §10i fixes what
survives at EXACTLY THREE, whatever the author typed - N1a reads THREE OR MORE,
so every longer run parses the same and the writer would otherwise have
unboundedly many canonical spellings for one document.

The source below has SIX. Its rendered HTML is the same two lists a three-blank
source gives, which is why the `.fmt` sidecar beside this pair - not the HTML -
is what measures the collapse.

::: compare

```carve
- apples






- oranges
```

```html
<ul>
  <li>apples</li>
</ul>
<ul>
  <li>oranges</li>
</ul>
```

:::
