## Editorial markup closes outside a cross-reference or a bracket run

PART 8 resolves a cross-reference and a bracket run before editorial markup,
so an insertion or deletion closer inside one is content, and the editorial
span closes at the next closer outside it (PART 9 §9 E2b). A substitution's
closer and arrow are found the same way: an arrow inside a bracket run or at
the end of a cross-reference is content, so the pair is a strikethrough.

::: compare

```carve
{+a </#x+}> b+}
```

```html
<p><ins>a &lt;/#x+}&gt; b</ins></p>
```

:::

::: compare

```carve
{+a [x+}](u) b+}
```

```html
<p><ins>a <a href="u">x+}</a> b</ins></p>
```

:::

::: compare

```carve
{-a [x](u-}) b-}
```

```html
<p><del>a <a href="u-}">x</a> b</del></p>
```

:::

::: compare

```carve
{~a [x~>y](u) b~}
```

```html
<p><s>a <a href="u">x~&gt;y</a> b</s></p>
```

:::

::: compare

```carve
{~a </#x~>y> b~}
```

```html
<p><s>a &lt;/#x~&gt;y&gt; b</s></p>
```

:::
