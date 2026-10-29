## The rest of a split combined token is read again as inline content

A combined opener that cannot open is two bare candidates, and everything after them, its old closer included, is read like any other inline content (PART 9 SS9 THE COMBINED TOKEN, carve#3952). A later `/*` ... `*/` in that rest forms a combined token.

::: compare

```carve
x */*~/**b a*/~
```

```html
<p>x <strong>/</strong><s><strong><em>*b a</em></strong></s></p>
```

:::

::: compare

```carve
x a/*b~/*/*/*/
```

```html
<p>x a/<strong>b~/</strong><strong><em>/</em></strong></p>
```

:::

::: compare

```carve
- x */*~/**b a*/~
```

```html
<ul>
  <li>x <strong>/</strong><s><strong><em>*b a</em></strong></s></li>
</ul>
```

:::
