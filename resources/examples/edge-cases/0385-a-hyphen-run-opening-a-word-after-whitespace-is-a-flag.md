## A hyphen run opening a word after whitespace is a flag

PART 9 §8 does not convert a hyphen run that is PRECEDED by whitespace (or the
start of the content) and FOLLOWED by a non-whitespace character. That shape is
a long CLI flag, and converting it mangled ordinary technical prose silently and
in the rendered output only - the author saw `git log --oneline` in the source
and the reader got a command that does not run (markup-carve/carve#1443).

The rule is deliberately narrow. Every canonical dash use is unspaced on at
least the left, so requiring whitespace on both sides would have removed the
feature along with the damage, and requiring the two sides to match in kind
would have broken `a---- b----- c------`, which the corpus already pins.

::: compare

```carve
git log --oneline and --force-with-lease stay literal.

But pages 1--10, the Mon--Fri window, a---- b----- and a -- b all convert.
```

```html
<p>git log --oneline and --force-with-lease stay literal.</p>
<p>But pages 1–10, the Mon–Fri window, a–– b—– and a – b all convert.</p>
```

:::

An HTML comment is worth pinning rather than leaving to be discovered, because
neither half survives and each is lost to a different rule. The opening `<!--`
is preceded by `!`, so the flag rule does not reach it and it converts to a dash.
The closing `-->` was flag-shaped and literal until the arrow set took the
doubled run (markup-carve/carve#1442); it is now an arrow.

Ruled deliberately rather than papered over. Guarding `-->` for this one context
would put a context-sensitive exception into a set whose argument is that it has
none, and Carve escapes raw HTML by default, so a literal HTML comment in prose
is already a document about HTML rather than HTML.

::: compare

```carve
<!-- a comment -->
```

```html
<p>&lt;!– a comment →</p>
```

:::
