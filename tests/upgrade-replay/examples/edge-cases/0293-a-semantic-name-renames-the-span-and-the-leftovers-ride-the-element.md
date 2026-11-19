## A semantic name renames the span, and the leftovers ride the element

An authored `[content]{attrs}` span renders its `<span>` element whether or not
any attribute reaches the output - hardening removes attributes, never the
element the author wrote. A semantic name is not an attribute that was removed:
it never reaches the output as one. It renames the element (PART 9 §9), so the
span does not survive as a wrapper and every remaining attribute lands on the
outermost semantic element.

::: compare

```carve
[x]{}
```

```html
<p><span>x</span></p>
```

:::

::: compare

```carve
[x]{onclick="steal()"}
```

```html
<p><span>x</span></p>
```

:::

::: compare

```carve
[x]{kbd onclick="steal()"}
```

```html
<p><kbd>x</kbd></p>
```

:::

::: compare

```carve
[x]{kbd}
```

```html
<p><kbd>x</kbd></p>
```

:::
