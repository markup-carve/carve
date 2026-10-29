## An angle bracket is escaped only where it opens markup

PART 11 §8a M1e. On the Markdown target a `<` is escaped with a backslash when
the next character is an ASCII letter, `/`, `!` or `?` - the four things that can
open raw HTML - and left alone otherwise. A `>` takes nothing: mid-line it is
inert, and at the start of a line it is a block quote marker M1 already covers.

Escaping the `<` alone is sufficient, because a tag that cannot open cannot be
closed. Every engine used to rewrite both brackets to entities, unconditionally
and with no clause behind it (markup-carve/carve#1148); an entity is not an
escape, since it replaces the character rather than protecting it.

::: compare

```carve
a < b and a <b> c and x > y
```

```html
<p>a &lt; b and a &lt;b&gt; c and x &gt; y</p>
```

:::
