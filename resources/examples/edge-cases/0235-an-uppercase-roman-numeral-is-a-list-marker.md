## An uppercase roman numeral is a list marker

Roman markers are case-blind: `I.` opens a list with `type="I"` as `i.` does with `type="i"`.

::: compare

```carve
I. one
II. two
```

```html
<ol type="I">
  <li>one</li>
  <li>two</li>
</ol>
```

:::
