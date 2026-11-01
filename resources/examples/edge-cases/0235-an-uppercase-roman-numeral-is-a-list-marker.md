## An uppercase roman numeral is a list marker

Roman markers are case-blind: `I.` opens a list with `type="I"` as `i.` does with `type="i"`. A single uppercase letter with `.` is a marker only with two or more spaces before its content (carve#4811), so `I.` takes two spaces and `II.` takes one.

::: compare

```carve
I.  one
II.  two
```

```html
<ol type="I">
  <li>one</li>
  <li>two</li>
</ol>
```

:::
