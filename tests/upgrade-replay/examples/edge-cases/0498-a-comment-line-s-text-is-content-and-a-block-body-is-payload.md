## A comment line's text is content and a block body is payload

NO TRAILING WHITESPACE (paragraph, NORMATIVE, `CARVE-P2-025`) reaches a `%%`
comment line's text and stops at a `%%%` block comment's body. Exactly one space
or tab after the `%%` marker is the separator; a second one is text. Neither half
shows in HTML, since a comment renders nothing, so each pair carries a `.fmt`
sidecar and the canonical writer is what reads the text back.

The trailing run goes. This case sits inside a container, which is where the
engines disagreed (markup-carve/carve-rs#1951).

:::: compare

```carve
::: note
%% keep  
text
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p>text</p>
</aside>
```

::::

One space after the marker is the separator, so the second one is text and the
writer spells both back.

::: compare

```carve
%%  x

text
```

```html
<p>text</p>
```

:::

A no-break space is not `whitespace`, so it cannot be the separator and it
survives. The writer supplies the separator space ahead of it.

::: compare

```carve
%% x

text
```

```html
<p>text</p>
```

:::

A `%%%` body is the block's payload, so its trailing space keeps its byte.

::: compare

```carve
%%%
body  
%%%

text
```

```html
<p>text</p>
```

:::

A vertical tab after `%%` and after ordinary text is content at the end of
both lines. The comment stays hidden, and the text reaches HTML. The `.fmt`
sidecar checks that the writer keeps both bytes.

::: compare

```carve
%%

text
```

```html
<p>text</p>
```

:::
