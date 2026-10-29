## A comment fence reached through a quote registers nothing either

The last of the three columns a comment fence can sit at. `markup-carve/carve#1309` ruled that a definition inside a comment fence is not registered wherever the fence sits, and the corpus pinned the column-0 spelling and the indented one inside a list item. The quoted spelling was left out on the grounds that all three engines registered there, which made it a disagreement rather than a coverage gap - a carve-out that expired once the three engine tickets existed (markup-carve/carve#1341, markup-carve/carve-js#1177, markup-carve/carve-php#1402, markup-carve/carve-rs#1078).

Nothing scopes the fence by container. `comment_block` gives its body as `{character | newline}`, verbatim, and §28 and §24 C3 name no container anywhere; a rule that distinguished a fence reached through a `>` prefix from one reached through indentation would make the same four lines register or not by their prefix. The quote is empty in all four implementations, so the fence IS consumed as a comment - and the definition inside it is then read by a later pass that was looking at lines the block parser had already swallowed.

A link reference definition:

::: compare

```carve
> %%%
> [r]: /url
> %%%

See [r][].
```

```html
<blockquote>

</blockquote>
<p>See [r][].</p>
```

:::

The same fence over a footnote definition. Both kinds are here because the leak sorts definitions BY KIND, which is the evidence that no rule is being followed: carve-js registers the reference above and leaves this note literal, while carve-php and carve-rs register both. A single-kind document would let carve-js pass on the half it happens to get right.

::: compare

```carve
> %%%
> [^f]: note
> %%%

See [^f].
```

```html
<blockquote>

</blockquote>
<p>See [^f].</p>
```

:::

The control is the same two definitions with the fence taken away. They register document-wide from inside a quote in all four implementations, so what the documents above pin is the comment, not the quote:

::: compare

```carve
> [r]: /url
> [^f]: note

See [r][] [^f].
```

```html
<blockquote>

</blockquote>
<p>See <a href="/url">r</a> <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The abbreviation kind is deliberately absent, for the reason *An abbreviation inside a comment defines nothing* gives above: PART 12 §7 recognizes an abbreviation definition only as a direct child of the DOCUMENT, so `> *[ab]: abbrev` defines nothing whether a comment fence wraps it or not - all four implementations leave the use literal either way. A document written that way could not tell the two reasons apart, and it is pinned at column 0 instead, where only the comment is doing the work.
