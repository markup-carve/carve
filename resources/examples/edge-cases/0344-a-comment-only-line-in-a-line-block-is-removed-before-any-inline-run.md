## A comment-only line in a line block is removed before any inline run

`comment_line` is a BLOCK - PART 1 lists it among the invisible blocks - so a
comment-only body line is decided at the block layer, before the stanza reaches
the inline parser. An unclosed verbatim run opened on an EARLIER line therefore
cannot claim it, and a stray backtick cannot turn a comment into published text
(markup-carve/carve#1333). The comment leaves an EMPTY VERSE LINE (PART 9 §23),
and the run carries that line as a newline like every other break it swallows.

:::: compare

```carve
::: |
a `b
%% secret
c
:::
```

```html
<div class="line-block">
  <p>a <code>b

c</code></p>
</div>
```

::::

The control with no run open is the shape §23 has always described and that
nothing had ever pinned: the line is gone, and the stanza keeps its shape
rather than losing a line.

:::: compare

```carve
::: |
a
%% secret
c
:::
```

```html
<div class="line-block">
  <p>a<br>
<br>
c</p>
</div>
```

::::

A TRAILING comment is a different construct and answers differently. `x %% secret`
is `inline_comment` (§21), not a comment line, and §21's third bullet is
unconditional: inside a verbatim run there is no comment there at all, only two
percent characters in content. These two documents differ only in where the `%%`
sits on its line, which is why both are here.

:::: compare

```carve
::: |
a `b
x %% secret
c
:::
```

```html
<div class="line-block">
  <p>a <code>b
x %% secret
c</code></p>
</div>
```

::::

The answer is §21's and not the container's, which is why there is no paragraph
document beside these two: `26-comments-4` already pins a `%%` inside a code span
as content, and the paragraph shape adds nothing a mutation of the rule can tell
apart from it. One rule across both containers, as the unclosed-run documents
above pin for the run itself.

An empty verse line is a LINE, not a break: it earns its `<br>` from the boundary
above it like any other line, so a comment ending a stanza adds nothing after the
break that already separates it from the line before. Two breaks on one boundary
is what the section below refuses.

:::: compare

```carve
::: |
a
%% c
:::
```

```html
<div class="line-block">
  <p>a<br>
</p>
</div>
```

::::
