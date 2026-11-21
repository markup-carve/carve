## A null byte is replaced before the document is read

Every C0 control except tab, newline and carriage return is ordinary content in
this language (PART 7), and the presentation targets emit them (PART 9 §29).
U+0000 is the one exception: it is replaced by U+FFFD REPLACEMENT CHARACTER
before the first line is read (PART 0 INPUT), so it is never content, it never
reaches the AST, and no target is ever asked whether to emit it.

The example writes `␀` (U+2400 SYMBOL FOR NULL) where the byte goes, and the
fixture is generated with `::: compare nul`, which substitutes the real U+0000.
The byte cannot be written here: git would call this whole file binary, and it
is invisible in an editor besides. `tests/corpus/**` is protected from
normalization and `tests/fixture-bytes.test.mjs` pins the byte's presence, so
the generated `.crv` is where it is safe to keep.

::: compare nul

```carve
a␀b
```

```html
<p>a�b</p>
```

:::

EVERY occurrence, and BEFORE anything is captured verbatim. A code span carries
its content exactly as authored, and this transform still reaches it - because
it runs at the parse boundary rather than in a renderer, no later stage ever
holds the character.

::: compare nul

```carve
`a␀b`
```

```html
<p><code>a�b</code></p>
```

:::

The control, so the carve-out is not read as covering the class: the vertical
tab is a C0 control too, it is NOT carved out, and it survives into the output
as content. Only U+0000 moves.

::: compare

```carve
cd
```

```html
<p>cd</p>
```

:::
