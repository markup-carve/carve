## An attribute block after a span behind a guarding opener belongs to that span

A `_` or `/` that opens a span that closes is not the character before the next opener, so the inner span opens and its attribute block is part of it. A delimiter inside that block closes nothing outside it.

::: compare

```carve
/_a_{title="/"} b/
```

```html
<p><em><u title="/">a</u> b</em></p>
```

:::

::: compare

```carve
_*a*{title="_"} b_
```

```html
<p><u><strong title="_">a</strong> b</u></p>
```

:::
