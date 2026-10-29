## Cyclic cross-reference resolves to one level

A `</#id>` cross-reference resolves to ONE level: it links to the target and
adopts the target's text, flattening any nested cross-reference in that text
(PART 9 §19). This makes a self-reference or a mutual cycle safe -- no infinite
expansion.

A self-reference resolves once:

::: compare

```carve
# A </#A>
```

```html
<section id="A">
  <h1>A <a href="#A">A </a></h1>
</section>
```

:::

A mutual cycle resolves to one level on each side:

::: compare

```carve
# A </#B>

# B </#A>
```

```html
<section id="A">
  <h1>A <a href="#B">B </a></h1>
</section>
<section id="B">
  <h1>B <a href="#A">A </a></h1>
</section>
```

:::

A normal (non-cyclic) cross-reference still resolves:

::: compare

```carve
# Intro

See </#Intro>.
```

```html
<section id="Intro">
  <h1>Intro</h1>
  <p>See <a href="#Intro">Intro</a>.</p>
</section>
```

:::
