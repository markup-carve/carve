## A definition list ends at its last placed child too

A `definition_list` has no closer, so PART 12 §4 ends it at its last placed
`definition_term` or `definition_description` - the same sentence that governs
the list above. It used to be the one container that answered otherwise: a
floating attribute is scoped to the container that holds it
(markup-carve/carve#1281), so the attribute line below was one the definition
list had consumed, and consuming it was read as owning it.

Scope and extent are different questions. Scope decides which blocks an
attribute may reach and answers "not past this container"; extent decides which
source a node claims and answers "not past my last child". The `{.k}` below
attaches to nothing, leaves no attributes anywhere, and is the unattached
attribute block §4 excludes by name - exactly as it is under a bullet item.
Ruled at markup-carve/carve#1530.

The HTML is unchanged; the pair is here because the SPANS the same document
publishes are what moved.

::: compare

```carve
:: t
:  d
   {.k}
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p>tail</p>
```

:::

A definition written at the description's content column is the other half, and
it is the shape markup-carve/carve#1522 ruled one container over: PART 12 §7
hoists it to the DOCUMENT, so it leaves the definition list and becomes its
sibling while its own span still sits inside the source the list encloses. The
list ends where its description ends, and the offsets after that belong to the
`link_reference_definition` alone.

::: compare

```carve
:: t
:  a
   [r]: /u
tail

[r][]
```

```html
<dl>
  <dt>t</dt>
  <dd>a</dd>
</dl>
<p>tail</p>
<p><a href="/u">r</a></p>
```

:::
