## A caret is a reference label, not an empty footnote

`footnote_label = {character - ']'}+` is one-or-more, so `[^]` has no footnote
label and `[^]: /u` is not a footnote definition. `reference_label = (character
- ']' - '@'), {character - ']'}` excludes exactly two characters, and `^` is not
one of them - so the line IS a link reference definition whose label is `^`, and
a reference spelled `[text][^]` resolves against it.

Pinned because all three engines and this repository's own oracle once
disagreed: the definition vanished in one, became an empty-label footnote in
another, and the oracle's label pattern excluded a character the production
admits (carve-rs#488, carve-rs#511, carve#589).

::: compare

```carve
[^]: /u

see [text][^].
```

```html
<p>see <a href="/u">text</a>.</p>
```

:::

A bare `[^]` with nothing defining it stays literal, since Carve has no
shortcut reference.

::: compare

```carve
see [^].
```

```html
<p>see [^].</p>
```

:::
