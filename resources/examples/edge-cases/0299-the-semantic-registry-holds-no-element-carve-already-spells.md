## The semantic registry holds no element Carve already spells

`abbr`, `time`, `samp`, `var`, `kbd`, `cite` and `dfn` render as their same-named
HTML element, in the `:name[…]` form and as a compact span attribute. A name is
admitted only where the language has no other spelling for that element, so
`code` and `mark` are NOT in the registry (PART 9 §9): a code span already writes
`<code>` and the highlight syntax already writes `<mark>`. The inline literal
beside them writes neither - it drops the wrapper, which is what it is for.

::: compare

```carve
`x` !`x` =x=
```

```html
<p><code>x</code> x <mark>x</mark></p>
```

:::

Both are ordinary extension names instead, and take the generic fallback.

::: compare

```carve
:code[*b*] :mark[*b*]
```

```html
<p><span class="ext-code"><strong>b</strong></span> <span class="ext-mark"><strong>b</strong></span></p>
```

:::

As compact span attributes they are ordinary booleans, and land on the outer span
beside whatever else the author wrote.

::: compare

```carve
[*b*]{code} [*b*]{mark}
```

```html
<p><span code=""><strong>b</strong></span> <span mark=""><strong>b</strong></span></p>
```

:::

`code` is the name that showed why one spelling per element is a rule and not a
preference: a code span is verbatim while an extension body is parsed, so the
registry entry gave one tag two content models, chosen by which spelling the
author reached for.

::: compare

```carve
`*b*`
```

```html
<p><code>*b*</code></p>
```

:::
