## A tab is content in a heading key and in a cross-reference id

Inline spacing is a run of U+0020 and nothing else (markup-carve/carve#2978).
The heading index a collapsed reference falls back to takes the label key of
PART 9R R1, so only space runs collapse there, and a cross-reference id ends at
a space, not at a tab (`crossref_id`).

<!-- The heading holds a TAB between `A` and `B`. -->
A tab in a heading is a character of its key, so a label spelled with a space
does not find it and stays literal.

::: compare

```carve
# A	B

see [A B][]
```

```html
<section id="A-B">
  <h1>A	B</h1>
  <p>see [A B][]</p>
</section>
```

:::

<!-- The heading and the label each hold a TAB between `A` and `B`. -->
The same tab in the label finds it.

::: compare

```carve
# A	B

see [A	B][]
```

```html
<section id="A-B">
  <h1>A	B</h1>
  <p>see <a href="#A-B">A	B</a></p>
</section>
```

:::

Space runs still collapse on both sides, and spaces at either end are trimmed.

::: compare

```carve
# A  B

see [ A B ][]
```

```html
<section id="A-B">
  <h1>A  B</h1>
  <p>see <a href="#A-B"> A B </a></p>
</section>
```

:::

<!-- The id holds a TAB between `no` and `pe`. -->
A tab inside `</#...>` belongs to the id. No id holds one, so the reference
names nothing and stays literal, and nothing inside it is parsed.

::: compare

```carve
a </#no	pe> b
```

```html
<p>a &lt;/#no	pe&gt; b</p>
```

:::
