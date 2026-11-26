## A multi-letter ordered marker opens no list

PART 2 spells the marker as `ordered_marker = (digit+ | letter | roman_numeral),
('.' | ')')`. `abc` is not a run of digits, not the single `letter` the
production admits, and not a roman numeral, so `abc. item` matches nothing and
the line is an ordinary paragraph.

`ABC)` is the same reading in the other case and with the other delimiter. Note
that a SINGLE letter still is a marker - it is the second letter that ends the
match - and that a roman run of any length still is one, so `iv. item` is a
list.

The executable spec refused both instead, and no corpus document began a line
with a multi-letter word and a dot (markup-carve/carve#1188).

::: compare

```carve
abc. item
```

```html
<p>abc. item</p>
```

:::

::: compare

```carve
ABC) item
```

```html
<p>ABC) item</p>
```

:::
