## A link title takes exactly one space

`link_title = space, ('"' ... )` spells its padding slot as exactly ONE
character, and four artifacts read it as a run: carve-js, carve-php, carve-rs
and the executable spec all took the title after two spaces. carve#912 settled
which side gives. The production is right and the four are lax, so a second
space is no longer padding.

This is deliberately the opposite call from the one carve#905 made for the same
slots. That change settled WHICH character a slot admits (a space, never a tab)
and left HOW MANY alone; this one settles the cardinality, and settles it
tight.

With two spaces the quoted run is not a title, so the bracket run is not a link
at all and every character of the line survives as text:

::: compare

```carve
[t](/u  "T")
```

```html
<p>[t](/u  “T”)</p>
```

:::

`image_title = link_title` is one production defined by reference, so the image
tail answers the same way:

::: compare

```carve
![a](/p.png  "T")
```

```html
<p>![a](/p.png  “T”)</p>
```

:::

The CONTROL, and the point of the ruling: a single space is still the titled
form. This pair passed before carve#912 and passes after it, and it is what
distinguishes narrowing the slot from breaking it.

::: compare

```carve
[t](/u "T")
```

```html
<p><a href="/u" title="T">t</a></p>
```

:::

::: compare

```carve
![a](/p.png "T")
```

```html
<img src="/p.png" alt="a" title="T">
```

:::
