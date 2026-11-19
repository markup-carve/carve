## An abbreviation term is one ASCII alphanumeric word

`abbreviation_term = (letter | digit)+`, and `letter` is enumerated as `a`..`z` plus `A`..`Z`. So the term is case-blind, may start with a digit, and may be a digit alone - every corpus abbreviation before this one was an uppercase multi-letter word, which is the one shape that hides all of those.

::: compare

```carve
*[dl]: definition list
*[3D]: three dimensional
*[9]: nine

A dl, a 3D one, and 9.
```

```html
<p>A <abbr title="definition list">dl</abbr>, a <abbr title="three dimensional">3D</abbr> one, and <abbr title="nine">9</abbr>.</p>
```

:::

A term outside that alphabet is not a definition, and the line stays as written rather than being dropped. An abbreviation has no marker at the use site, so a definition swallowed here would take its whole line of prose with it and leave nothing behind to explain the loss.

::: compare

```carve
*[ß]: sharp s
*[e.g.]: for example
*[HTTP API]: an interface

Text about ss and eg below.
```

```html
<p>*[ß]: sharp s
*[e.g.]: for example
*[HTTP API]: an interface</p>
<p>Text about ss and eg below.</p>
```

:::
