## A braced hyphen pair is an en dash

The flanking rule above refuses a hyphen run that has whitespace before it and a
non-whitespace character after it, which is the shape every long CLI flag has.
It is also a shape an author sometimes means as a dash, and there was no way to
say so. `{--}` is that way: it renders a single en dash and the braces are
consumed (markup-carve/carve#1447).

::: compare

```carve
The bare run is flag-shaped and stays literal: a ---(p) b.

The braced form converts wherever it stands: a {--}(p) b, x{--}y, {--}start.
```

```html
<p>The bare run is flag-shaped and stays literal: a ---(p) b.</p>
<p>The braced form converts wherever it stands: a –(p) b, x–y, –start.</p>
```

:::

The spelling was an empty deletion, and it cost nothing to take: `{--}` is a
`{-` opener meeting its `-}` closer with nothing between them, and the
production never permitted that - its content slot is a one-or-more repetition.
Exactly one string moves. A deletion that holds a hyphen, or any other content,
is untouched.

::: compare

```carve
{---} and {-x-} still delete.
```

```html
<p><del>-</del> and <del>x</del> still delete.</p>
```

:::

There is no braced em dash. `{---}` deletes a hyphen, which is a thing an author
writes, so a tight em dash - the Spanish, French and Russian dialogue convention
- is still written as the literal character.
