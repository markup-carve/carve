## An attribute block that attaches to nothing is text from the first pass

A block behind a delimiter that closes nothing attaches in no reading, so it is content before any block whose span a guard might block. Here the `_` closes inside `{t=c_}`, the `*` after it opens, and `*a*` takes `{t="_"}`, whose `_` is then out of reach.

::: compare

```carve
_*a*{t="_"} b/{t=c_}
```

```html
<p><u><strong t="_">a</strong> b/{t=c</u>}</p>
```

:::

::: compare

```carve
_*a*{t="_"} //b/{t=c_}
```

```html
<p><u><strong t="_">a</strong> //b/{t=c</u>}</p>
```

:::

::: compare

```carve
/_a_{t="/"} b*{t=c/}
```

```html
<p><em><u t="/">a</u> b*{t=c</em>}</p>
```

:::

::: compare

```carve
_*a*{t="_"} b/{t=c_} b/{t=c_}
```

```html
<p><u><strong t="_">a</strong> b/{t=c</u>} b/{t=c_}</p>
```

:::

::: compare

```carve
_x /*a*/{.q} b/{c_} c_
```

```html
<p><u>x <strong class="q"><em>a</em></strong> b/{c</u>} c_</p>
```

:::
