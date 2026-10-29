## Which inline content a heading id is derived from

The id comes from the heading's TEXT CONTENT: every inline contributes the
literal text it carries, and an inline carrying no text of its own contributes
nothing (markup-carve/carve#1283). The section stated what happens to case, to
non-ASCII characters, to typography and to a leading digit, and never which
content those rules were applied to - which is how one engine could leave math
out while keeping the code span beside it.

A math run contributes its text, exactly as the code span below it does. The
two are the same shape of node holding the same kind of verbatim text, and no
rule can keep one and drop the other - only a list can:

::: compare

```carve
# a $`x` b
```

```html
<section id="a-x-b">
  <h1>a <span class="math inline" role="math">\(x\)</span> b</h1>
</section>
```

:::

So a heading that is ONLY math has text, and does not reach the empty-text
fallback:

::: compare

```carve
# $`x`
```

```html
<section id="x">
  <h1><span class="math inline" role="math">\(x\)</span></h1>
</section>
```

:::

Display math is the same run with a wider delimiter, and contributes the same
way:

::: compare

```carve
# a $$`x` b
```

```html
<section id="a-x-b">
  <h1>a <span class="math display" role="math">\[x\]</span> b</h1>
</section>
```

:::

The control the ruling turned on: a code span already contributed its text in
every engine, and it still does. Its answer is what makes the math answer a
rule rather than a preference:

::: compare

```carve
# a `c` b
```

```html
<section id="a-c-b">
  <h1>a <code>c</code> b</h1>
</section>
```

:::

An image contributes its ALT TEXT, which is the text it carries:

::: compare

```carve
# a ![alt](i.png) b
```

```html
<section id="a-alt-b">
  <h1>a <img src="i.png" alt="alt"> b</h1>
</section>
```

:::

A link contributes its label, not its destination:

::: compare

```carve
# a [link](/u) b
```

```html
<section id="a-link-b">
  <h1>a <a href="/u">link</a> b</h1>
</section>
```

:::

An abbreviation definition written on the heading line is not a definition
there at all, so its text is heading text, verbatim:

::: compare

```carve
# a *[HTML]: x b
```

```html
<section id="a-HTML-x-b">
  <h1>a *[HTML]: x b</h1>
</section>
```

:::

A superscript contributes its content, like every other inline that wraps text:

::: compare

```carve
# a {^up^} b
```

```html
<section id="a-up-b">
  <h1>a <sup>up</sup> b</h1>
</section>
```

:::

The other half of the rule. An inline footnote carries no text of its own - the
body belongs to the note, not to the heading - so it contributes nothing, and
the marker it renders as contributes nothing either:

::: compare

```carve
# a ^[note] b
```

```html
<section id="a-b">
  <h1>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</h1>
</section>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A cross-reference contributes nothing even when it RESOLVES and renders the
target's text. This is where "the construct, not the output" is load-bearing:
the id is assigned before the reference is resolved, so the rule cannot depend
on what the link ends up saying:

::: compare

```carve
## Target

# a </#Target> b
```

```html
<section id="Target">
  <h2>Target</h2>
</section>
<section id="a-b">
  <h1>a <a href="#Target">Target</a> b</h1>
</section>
```

:::

A symbol shortcode contributes nothing for the same reason, read from the other
side: a symbol resolves through processor configuration, and with no map it
renders as its own literal text - which is still not heading text:

::: compare

```carve
# a :smile: b
```

```html
<section id="a-b">
  <h1>a :smile: b</h1>
</section>
```

:::

And a line comment contributes nothing by ending the line: everything after it
is comment, so the id is derived from what is left:

::: compare

```carve
# a %% c
```

```html
<section id="a">
  <h1>a</h1>
</section>
```

:::

Two shapes are deliberately NOT settled by the list above, because the engines
still disagree about them and no ruling covers either. An EDITORIAL COMMENT
(`{# … #}`) carries literal text and renders it inside a `critic-comment` span,
and a RAW INLINE (`` `…`{=html} ``) carries a payload that is emitted verbatim:
measured on carve-js `620def4e` and the executable spec, `# a {# hidden #} b`
gives `a-b` in the engine and `a-hidden-b` in the oracle, and the raw inline
splits the same way. Both are named here rather than pinned so the sentence in
Heading IDs is not read as having answered them.
