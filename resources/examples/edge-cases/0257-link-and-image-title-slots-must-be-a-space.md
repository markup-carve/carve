## Link and image title slots must be a space

The whitespace before a link or image title is a PADDING SLOT: the link is
already a link once its destination is read, and the title sits inline after
it. `link_title` spells that slot `space`, and `image_title = link_title`
inherits it. A tab is syntax only in a line's leading indentation run (PART 7,
MARKER SEPARATORS AND PADDING SLOTS), and this slot sits well past the first
non-whitespace character of its line.

A tab written there is therefore not padding, and the inline is not a link at
all: the bracket run stays literal text, with the tab where it was written.

A link title, tab-first:

::: compare

```carve
[t](/u	"T")
```

```html
<p>[t](/u	“T”)</p>
```

:::

The slot is a RUN, and the rule is about the whole run rather than either of
its ends. Both mixed spellings keep the text literal too -- the one that
survives a fix written as "the first character must be a space" is the one with
the space first, and the one that survives "the last character must be a space"
is the other.

::: compare

```carve
[t](/u 	"T")
```

```html
<p>[t](/u 	“T”)</p>
```

:::

::: compare

```carve
[t](/u	 "T")
```

```html
<p>[t](/u	 “T”)</p>
```

:::

An image title answers the same way. `image_title = link_title` is one
production defined by reference, and every engine serves the link tail and the
image tail from one function -- so the two agree by construction today, and
nothing would notice the day one of them splits:

::: compare

```carve
![a](/p.png	"T")
```

```html
<p>![a](/p.png	“T”)</p>
```

:::

::: compare

```carve
![a](/p.png 	"T")
```

```html
<p>![a](/p.png 	“T”)</p>
```

:::

::: compare

```carve
![a](/p.png	 "T")
```

```html
<p>![a](/p.png	 “T”)</p>
```

:::

A single space is the titled form, unchanged:

::: compare

```carve
[t](/u "T")
```

```html
<p><a href="/u" title="T">t</a></p>
```

:::
