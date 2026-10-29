## Blockquote lazy continuation

A line that follows a `>` line, is not blank, and does not begin its own block continues the blockquote — the `>` may be omitted on continuation lines (CommonMark-style). A blank line ends the quote.

::: compare

```carve
> quoted
continued
```

```html
<blockquote><p>quoted
continued</p></blockquote>
```

:::

A block-opener is not a lazy continuation: it ends the quote and starts that block outside it. A **list marker — bullet or ordered — folds in**, though: a quoted line ends in an open paragraph, and a list marker folds into an open paragraph (§10), exactly as at the top level. So `> quoted` then `- item` is one quote whose paragraph is `quoted` + `- item`, not a quote plus a sibling list. (A heading, a bounded title, is still ended by a list marker; to put a real list in a quote, `>`-prefix it or use the `+` continuation marker.)

::: compare

```carve
> quoted
- item
```

```html
<blockquote><p>quoted
- item</p></blockquote>
```

:::

The fold needs an open paragraph to fold into. When the last quoted line is a heading (or any block that is not an open paragraph), there is nothing to fold into, so the list marker ends the quote and starts a top-level list — exactly as `# h` then `- item` does at the top level.

::: compare

```carve
> # h
- item
```

```html
<blockquote>
  <h1 id="h">h</h1>
</blockquote>
<ul>
  <li>item</li>
</ul>
```

:::

The open-paragraph condition is not about list markers. **Plain** lazy text
needs one too, and the same closed blocks leave none - so the quote ends and the
line becomes a top-level paragraph.

This is the case the list-marker example above does not reach, and every engine
had a defect in it: carve-php kept the quote open after a heading, and carve-js
and carve-php both kept it open after the two below.

::: compare

```carve
> # h
b
```

```html
<blockquote>
  <h1 id="h">h</h1>
</blockquote>
<p>b</p>
```

:::

A definition **term** is an ordinary line, so it leaves the quote open for lazy
text and the next line folds into the term (`CARVE-P2-028`).

::: compare

```carve
> :: t
~
```

```html
<blockquote>
  <dl>
    <dt>t
~</dt>
  </dl>
</blockquote>
```

:::

An invisible definition leaves nothing on the page at all, which is the clearest
case of the rule: there is no paragraph because there is no output.

::: compare

```carve
> [f]: ~
/
```

```html
<blockquote>

</blockquote>
<p>/</p>
```

:::
