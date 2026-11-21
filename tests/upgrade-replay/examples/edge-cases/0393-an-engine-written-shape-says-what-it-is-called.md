## An engine-written shape says what it is called

Four places carried a ROLE, or a state, and no accessible NAME (carve#1468).
An untitled admonition is named by its type word, drawn from the `labels` map
so it is not fixed English; a TITLED one points at the title the author already
wrote, so the visible name and the spoken one are one string.

:::: compare

```carve
::: note
Untitled.
:::

::: warning "Careful"
Titled.
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p>Untitled.</p>
</aside>
<aside class="admonition warning" aria-labelledby="adm-1">
  <p class="admonition-title" id="adm-1">Careful</p>
  <p>Titled.</p>
</aside>
```

::::

The author's own name WINS, and no id is minted: a second naming attribute
beside the author's would leave the name undefined.

:::: compare

```carve
{aria-label="Mine"}
::: note "Careful"
The author named it.
:::
```

```html
<aside class="admonition note" aria-label="Mine">
  <p class="admonition-title">Careful</p>
  <p>The author named it.</p>
</aside>
```

::::

A task box takes the item's own visible text, DERIVED rather than invented, so
nothing is written in English and a translated document translates it once.

::: compare

```carve
- [ ] read the /docs/
- [x] done
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="read the docs"> read the <em>docs</em></li>
  <li data-task-state="x"><input type="checkbox" checked disabled aria-label="done"> done</li>
</ul>
```

:::

Only the item's FIRST block sits beside the box, and only a paragraph carries
inline text, so a non-paragraph lead takes NO name - an empty one would be
worse than none. The checkbox and its state are still written.

::: compare

```carve
- [ ] > quoted lead
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> 
    <blockquote><p>quoted lead</p></blockquote>
  </li>
</ul>
```

:::

A math span says it is mathematics whether or not a typesetter ever runs, and
the NAME stays the author's on the same carrier. `role` is written last, so it
never moves an attribute the author placed, and an authored `role` is kept.

::: compare

```carve
An inline $`x = 1` and a named $`y`{aria-label="why"} one.
```

```html
<p>An inline <span class="math inline" role="math">\(x = 1\)</span> and a named <span class="math inline" aria-label="why" role="math">\(y\)</span> one.</p>
```

:::

The endnotes section is named for the reason its backlinks are: the role says
what the region IS and nothing said what it is CALLED.

::: compare

```carve
Text[^a]

[^a]: A note.
```

```html
<p>Text<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>A note.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
An author's attribute NAME is emitted verbatim and HTML attribute names are
case-insensitive, so the author-wins test is too: `ARIA-LABEL` and `ROLE` are
the same attributes as the lower-case spellings, and matching only the exact
case wrote a DUPLICATE of the attribute being checked for.

:::: compare

```carve
{ARIA-LABEL="Mine"}
::: note
body
:::

Math $`x`{ROLE="img"} here.
```

```html
<aside class="admonition note" ARIA-LABEL="Mine">
  <p>body</p>
</aside>
<p>Math <span class="math inline" ROLE="img">\(x\)</span> here.</p>
```

::::
