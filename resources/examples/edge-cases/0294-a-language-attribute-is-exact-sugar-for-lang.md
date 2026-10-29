## A language attribute is exact sugar for lang

`{:TAG}` sets the natural language of the content it attaches to. It is sugar
for `lang=TAG` and nothing else: the attribute reaching the AST, the merge, and
the HTML are the ones the long form already produced (`language_attribute` in
`resources/grammar.ebnf`, `markup-carve/carve#1114`).

::: compare

```carve
The title is [Le Bon Usage]{:fr}.
```

```html
<p>The title is <span lang="fr">Le Bon Usage</span>.</p>
```

:::

A tag is structure, not a registry lookup: any hyphen-separated run of ASCII
alphanumeric subtags of one to eight characters parses, so script and region
subtags, private use and grandfathered tags all reach `lang` unchanged and with
their case intact.

::: compare

```carve
[a]{:de-CH} [b]{:sr-Latn-RS} [c]{:x-acme} [d]{:i-klingon}
```

```html
<p><span lang="de-CH">a</span> <span lang="sr-Latn-RS">b</span> <span lang="x-acme">c</span> <span lang="i-klingon">d</span></p>
```

:::

The empty form declares the language explicitly unknown. That is not the same
as leaving the attribute off: `lang=""` stops the content inheriting the
language of whatever surrounds it.

::: compare

```carve
{:de}
> Der Titel ist [unbekannt]{:}.
```

```html
<blockquote lang="de"><p>Der Titel ist <span lang="">unbekannt</span>.</p></blockquote>
```

:::

It takes its place in source order among the other attribute kinds.

::: compare

```carve
[x]{#quote :fr .formal title=bonjour}
```

```html
<p><span id="quote" lang="fr" class="formal" title="bonjour">x</span></p>
```

:::

A block attribute line carries it as well.

::: compare

```carve
{:grc}
Μῆνιν ἄειδε θεά
```

```html
<p lang="grc">Μῆνιν ἄειδε θεά</p>
```

:::
