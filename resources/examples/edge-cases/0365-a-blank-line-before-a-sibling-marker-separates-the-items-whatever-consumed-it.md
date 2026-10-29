## A blank line before a sibling marker separates the items, whatever consumed it

Section 17 L1's first disjunct is a question about the LIST: is one item followed
by a blank line before the next sibling marker? It reads what stands BETWEEN two
items, and a blank line with nothing of the item after it stands between them
whatever the item's interior was doing with it. An unterminated container above
the blank does not change that, any more than it changes where the item ends.

The executable spec answered it by what the line was doing INSIDE the item.
A blank inside an open fence is fence content, so it recorded no separator and
the list stayed tight - for a `:::` div, an admonition, a code fence, a tilde
fence, a raw block and a comment fence alike, while the same document with the
closer written loosens in every reader. carve-js and carve-rs loosen all six;
carve-php loosens four of the six and stays tight for a code or tilde fence
(markup-carve/carve-php#1445, carve#1383).

::: compare

```carve
- ::: d
  b

- s
```

```html
<ul>
  <li>
    <div class="d">
      <p>b</p>
    </div>
  </li>
  <li><p>s</p></li>
</ul>
```

:::

The same holds where the blank is genuinely the container's CONTENT and can be
seen in the output. An unterminated code fence carries it as an empty payload
line, and it still separates the items - what L1 asks is where the line sits
relative to the marker, not which block absorbed it. Reading the payload instead
would make a structural answer depend on a detail readers already spell
differently: carve-php drops the same trailing blank from a raw block and keeps
it in a code block.

::: compare

````carve
- ```
  b

- s
````

````html
<ul>
  <li>
    <pre><code>b

</code></pre>
  </li>
  <li><p>s</p></li>
</ul>
````

:::

CONTROL. The blank must precede a marker of THIS list. A different bullet
character starts a different list under the section 11 axes, so nothing of the
first list is followed by a blank before one of its own siblings and it stays
tight - a reader that loosened on the blank alone would answer this one wrong.
The first item carries the plain text that makes the answer visible: with only
the fenced item, tight and loose render the same bytes and the case would assert
nothing.

::: compare

````carve
- a
- ```
  b

* s
````

````html
<ul>
  <li>a</li>
  <li>
    <pre><code>b

</code></pre>
  </li>
</ul>
<ul>
  <li>s</li>
</ul>
````

:::

The INTERIOR blank carve#326 C ruled on is untouched, and its own stated reason
is what separates the two: a sibling after such a fence "stays tight because no
blank line actually separates the two items". Content follows an interior blank
before the marker, so nothing stands between the items, and the case above in
this file stays tight in all four readers.
