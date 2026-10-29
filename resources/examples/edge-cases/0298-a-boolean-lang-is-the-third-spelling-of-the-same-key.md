## A boolean lang is the third spelling of the same key

`{lang}` means `lang=""` under PART 4's boolean rule, so the key has three
spellings - `:TAG`, `lang=TAG` and the bare name - and all three land in one
slot with the last value winning. This was stated in the grammar and pinned
nowhere until `markup-carve/carve#1125` made the executable spec merge a
boolean with a key/value of the same name.

::: compare

```carve
[a]{:fr lang} [b]{lang :fr}
```

```html
<p><span lang="">a</span> <span lang="fr">b</span></p>
```

:::

The bare name on its own is the empty language attribute written the long way,
so it declares the language unknown exactly as `{:}` does.

::: compare

```carve
[x]{lang}
```

```html
<p><span lang="">x</span></p>
```

:::
