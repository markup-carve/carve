## A tag inside a literal brace run is still a tag

A trailing `{…}` on a heading is not an attribute list - Carve is djot-strict, so the braces are inline content (§15 A7). Their CONTENTS are inline content too, which is where `#word` is a tag (§19). Both rules apply at once: the braces stay as typed and the tag inside them renders.

::: compare

```carve
# H {#id .cls}
```

```html
<section id="H-id-cls">
  <h1>H {<span class="tag"><strong>#id</strong></span> .cls}</h1>
</section>
```

:::
