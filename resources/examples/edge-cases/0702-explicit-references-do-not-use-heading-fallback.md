## Explicit references do not use heading fallback

An explicit reference needs a link definition. A heading with the same name only resolves the collapsed form (CARVE-P9R-001).

:::: compare

```carve
# Plan

See [x][Plan] and [Plan][].
```

```html
<section id="Plan">
  <h1>Plan</h1>
  <p>See [x][Plan] and <a href="#Plan">Plan</a>.</p>
</section>
```

::::

The same rule holds when the display text differs from the heading. A definition still resolves an explicit label and takes priority for a collapsed reference.

:::: compare

```carve
# Plan

[Plan]: /defined

See [x][Missing], [x][Plan] and [Plan][].
```

```html
<section id="Plan">
  <h1>Plan</h1>
  <p>See [x][Missing], <a href="/defined">x</a> and <a href="/defined">Plan</a>.</p>
</section>
```

::::
