## Trailing attributes on a link reference definition

A `{...}` block at the end of a definition line attaches to the DEFINITION and
reaches every link that resolves the label (PART 9R R1). That is what makes a
definition worth writing once: without it, attributing a destination used ten
times means repeating the attribute ten times.

::: compare

```carve
[Example][ex] and [again][ex]

[ex]: https://example.com {.external}
```

```html
<p><a href="https://example.com" class="external">Example</a> and <a href="https://example.com" class="external">again</a></p>
```

:::

The merge is the one stacked attribute lists already use (PART 9 §15 A3): the
definition's list first, the link's second, so a repeated key takes the LAST
value and classes ACCUMULATE.

::: compare

```carve
[Example][ex]{.internal #b}

[ex]: /u {.external #a}
```

```html
<p><a href="/u" class="external internal" id="b">Example</a></p>
```

:::

A `{...}` on its own line ABOVE a definition is a different construct: it floats
PAST the definition to the next visible block (§15 A2a). Both can appear at
once, and they do different things.

::: compare

```carve
{.a}
[ex]: /u {.b}

[E][ex] and text
```

```html
<p class="a"><a href="/u" class="b">E</a> and text</p>
```

:::
