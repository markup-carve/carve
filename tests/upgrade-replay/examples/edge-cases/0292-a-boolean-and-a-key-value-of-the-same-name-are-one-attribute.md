## A boolean and a key/value of the same name are one attribute

A boolean and a `key=value` of the SAME name are one attribute, not two. A
boolean is a key/value whose value is empty (PART 4), so it takes that name's
slot and the repeated key keeps the LAST value at the FIRST position - the same
rule any repeated key follows. Emitting both would produce two HTML attributes
with one name, which is not valid HTML.

::: compare

```carve
[x]{a=1 a}
```

```html
<p><span a="">x</span></p>
```

:::

Order decides which value survives, not which spelling:

::: compare

```carve
[x]{a a=2}
```

```html
<p><span a="2">x</span></p>
```

:::

The slot is the FIRST appearance of the name, so an unrelated attribute written
between them keeps its own place:

::: compare

```carve
[x]{a .c a=2}
```

```html
<p><span a="2" class="c">x</span></p>
```

:::
