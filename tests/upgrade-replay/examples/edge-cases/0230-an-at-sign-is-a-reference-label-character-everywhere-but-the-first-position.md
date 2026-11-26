## An at sign is a reference label character everywhere but the first position

`reference_label = (character - ']' - '@'), {character - ']'}`. The exclusion is positional: it keeps `[@key]` free for citations and costs nothing after the first character.

A label that STARTS with `@` is a citation definition in the extension layer, so the core corpus cannot state its rendering here - the executable spec refuses that input (carve#798). The engines agree on it: `[@x]: /u` defines nothing and the label renders as a mention.

::: compare

```carve
[a@b]: /v

see [u][a@b].
```

```html
<p>see <a href="/v">u</a>.</p>
```

:::
