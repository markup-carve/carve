## A captioned quote holds more than one block

A caption makes its host a figure, and PART 9 §4b says a quote is no exception:
the quote goes inside a `<figure>` and the caption becomes its `<figcaption>`,
which is where the HTML Standard puts a quotation's attribution.

Nothing counts the quote's blocks. A multi-paragraph epigraph is ordinary, and so
are a quoted list, a nested quote, a quoted code block and a quoted heading. Each
one takes its caption the same way, in the same place.

This needed pinning because the executable spec refused every shape but a single
paragraph, and no corpus document held any of the others - so the refusal was
unreachable, `npm run core:check` reported every input conformant either way, and
the gap was guarded by the absence of a fixture rather than by a decision
(markup-carve/carve#1181, the markup-carve/carve#755 class).

::: compare

```carve
> Nothing in this world is certain except death and taxes.
>
> The second of the two arrives rather more often.
^ Benjamin Franklin
```

```html
<figure>
  <blockquote>
    <p>Nothing in this world is certain except death and taxes.</p>
    <p>The second of the two arrives rather more often.</p>
  </blockquote>
  <figcaption>Benjamin Franklin</figcaption>
</figure>
```

:::

A quoted list. The caption belongs to the quote as a whole, so the list stays the
quote's only child and the caption sits outside it.

::: compare

```carve
> - Be skeptical.
> - Be kind.
^ House rules
```

```html
<figure>
  <blockquote>
    <ul>
      <li>Be skeptical.</li>
      <li>Be kind.</li>
    </ul>
  </blockquote>
  <figcaption>House rules</figcaption>
</figure>
```

:::

A nested quote. The caption attaches to the OUTER quote - the one whose marker
column the caption line sits against - so the inner quote carries no caption of
its own.

::: compare

```carve
> > I never said that.
^ Quoted in the report
```

```html
<figure>
  <blockquote>
    <blockquote><p>I never said that.</p></blockquote>
  </blockquote>
  <figcaption>Quoted in the report</figcaption>
</figure>
```

:::

A quoted code block. The `<pre>` is the quote's only child and the caption still
lands beside the quote, which is the case that shows the rule is about the quote
rather than about a paragraph.

::: compare

```carve
> ~~~
> git bisect run ./check
> ~~~
^ The release runbook
```

```html
<figure>
  <blockquote>
    <pre><code>git bisect run ./check
</code></pre>
  </blockquote>
  <figcaption>The release runbook</figcaption>
</figure>
```

:::

A quoted heading. The heading keeps its id, and PART 9R leaves it out of the
implicit-reference index because it sits inside a quote - the caption does not
change that either way.

::: compare

```carve
> ## Terms
>
> Delivery is at the discretion of the vendor.
^ Appendix B
```

```html
<figure>
  <blockquote>
    <h2 id="Terms">Terms</h2>
    <p>Delivery is at the discretion of the vendor.</p>
  </blockquote>
  <figcaption>Appendix B</figcaption>
</figure>
```

:::
