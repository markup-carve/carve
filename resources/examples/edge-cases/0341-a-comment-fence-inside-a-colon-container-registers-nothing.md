## A comment fence inside a colon container registers nothing

A colon container's body is parsed as blocks, so a comment fence inside one is a comment fence and its body is opaque for the same reason it is anywhere else.

:::: compare

```carve
::: note
Body.

%%%
[r]: /url
%%%
:::

[r][]
```

```html
<aside class="admonition note" aria-label="Note">
  <p>Body.</p>
</aside>
<p>[r][]</p>
```

::::

The quoted spelling is pinned too, under *A comment fence reached through a quote registers nothing either* at the end of this file. It sits there rather than here only so that adding it renumbers no existing section.
