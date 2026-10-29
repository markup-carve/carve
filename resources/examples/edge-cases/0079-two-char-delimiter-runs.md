## Two-char delimiter runs

Every bare delimiter is single-char. A doubled (or longer) run of any delimiter
is literal by the same-delimiter-adjacency rule, so `==x==` and `~~y~~` are
doubled `=` / `~` and render literal, while the single-char `=z=` and `~w~`
mark.

::: compare

```carve
==x== ~~y~~ =z= ~w~
```

```html
<p>==x== ~~y~~ <mark>z</mark> <s>w</s></p>
```

:::
