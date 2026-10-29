## Emphasis span closes before a following delimiter

A completed emphasis span closes at its valid closer regardless of what follows,
per the §9 close-first rule: a valid closer closes the nearest matching open
entry. So `_z_` closes into `<u>z</u>` even when more bare delimiters come right
after it. The trailing `/y/` stays literal, because a `/` opener is suppressed
immediately after the closing `_` (the slash-adjacency guard above).

::: compare

```carve
_z_/y/
```

```html
<p><u>z</u>/y/</p>
```

:::
