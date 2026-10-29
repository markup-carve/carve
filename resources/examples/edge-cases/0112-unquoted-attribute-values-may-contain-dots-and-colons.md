## Unquoted attribute values may contain dots and colons

An unquoted attribute value admits `.` and `:` (besides letters, digits, `-`,
`_`) so version strings, paths, and namespaced tokens need no quoting.

::: compare

```carve
[a]{k=v.w}
```

```html
<p><span k="v.w">a</span></p>
```

:::
