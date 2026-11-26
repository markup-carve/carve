## The language sigil takes no padding

A space after `:` does not belong to the language attribute. The TAG is
optional, the separator is not, so `{: fr}` is the empty language attribute
followed by a SEPARATE boolean `fr` - not a language attribute reading `fr`,
and not a failed block. It follows from `':', [ language_tag ]` with no special
case, and the cost falls on a typo rather than on anything written
deliberately.

::: compare

```carve
[x]{: fr}
```

```html
<p><span lang="" fr="">x</span></p>
```

:::

The same source without the space is the ordinary form, which is the control:
the two differ by one character and by one attribute.

::: compare

```carve
[x]{:fr}
```

```html
<p><span lang="fr">x</span></p>
```

:::
