## Implicit heading references with no definition

A `[text][]` that matches no link definition falls back to the document's
headings by their rendered text (PART 11 R1). The label and the heading text
are both trimmed, whitespace-collapsed and NFC-normalized, then compared
exactly: case is not folded, so `[getting started][]` does not reach
`# Getting Started` and stays literal.

A heading under a blockquote is declined - quoted text names the quoted
document's headings, not this one's - while a list item resolves, because that
is the author's own grouping. An unmatched label stays literal, and a real link
definition wins the tie.

Worth pinning because every case that existed paired `[X][]` with an `[X]: url`
definition, so the fallback branch had no coverage at all and the executable
spec had never implemented it (carve#453).

::: compare

```carve
# Getting Started

See [Getting Started][], [getting started][] and [Missing][].

> # Quoted

See [Quoted][].

- # In an item

See [In an item][].

# Defined

[Defined]: /wins

See [Defined][].
```

```html
<section id="Getting-Started">
  <h1>Getting Started</h1>
  <p>See <a href="#Getting-Started">Getting Started</a>, [getting started][] and [Missing][].</p>
  <blockquote>
    <h1 id="Quoted">Quoted</h1>
  </blockquote>
  <p>See [Quoted][].</p>
  <ul>
    <li>
      <h1 id="In-an-item">In an item</h1>
    </li>
  </ul>
  <p>See <a href="#In-an-item">In an item</a>.</p>
</section>
<section id="Defined">
  <h1>Defined</h1>
  <p>See <a href="/wins">Defined</a>.</p>
</section>
```

:::
