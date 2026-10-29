## A container's span ends at its last placed child

PART 12 §4 ends a container "at their closer, or at their last child when they
have no closer", and a list has no closer. A definition written at an item's
content column is nonetheless collected by PART 12 §7 and hoisted to the
DOCUMENT, so it leaves the list entirely; the list's last placed child is still
the item above it.

Every engine ended the list after the definition instead, which put the same
offsets in two nodes at once - the list and its own document-level sibling - and
a consumer resolving a position to a node got two answers. Ruled at
markup-carve/carve#1522: hoisting breaks the correspondence between tree nesting
and source nesting, and a span follows the TREE. The accepted cost is that a
list reports a shorter extent than the author typed, which is worse for folding
and better for anything that has to resolve a position.

The HTML below is what the hoisting already produced; the pair is here because
the SPANS the same document publishes are what moved.

::: compare

```carve
- a

  [r]: /u

see [text][r]
```

```html
<ul>
  <li>a</li>
</ul>
<p>see <a href="/u">text</a></p>
```

:::

An attribute block that attaches to nothing is the same question with no ruling
needed, because §4 already names the construct: "a following line terminator,
blank line, or unattached attribute block does not [belong] and is excluded".
The `{.x}` below reaches no block - PART 9 §15 A4 drops it and reports
`unattached-block-attribute` - so it yields no child, and the list that covered
it was covering source nothing in it owns (markup-carve/carve#1524).

::: compare

```carve
- a

  {.x}

tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
```

:::
