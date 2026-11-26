# Carve 0.2 Syntax: inline content

Status: part of the freeze candidate of Carve 0.2 on `next2`, frozen with the rest of the core (`STATUS.md` names the candidate).

This chapter defines how inline content becomes inline nodes. Block structure, HTML rendering, the tree and the writer have their own documents. Where a clause states rendered output, it does so because the output is the only visible sign of an inline decision.

Conventions:

- A clause is a paragraph that starts with an id of the form `C2-I-nnn`. The prefix is new in 0.2. No 0.1 clause id is reused. Ids of the form `C2-B-nnn` name clauses of the block chapter.
- A clause that starts with the word "Exception" is a carve-out from a more general clause, or a named interaction between two constructs. Exceptions are counted at the end of the chapter.
- Each example is a `compare` container that holds the Carve input and the expected HTML. The line above it gives its number and its status. *Generated* means the HTML was produced by the 0.1 reference engine, because the 0.2 rule equals 0.1 behavior for that input. *Unverified* means the HTML was written by hand from the clauses and has not been run through any engine.
- "Lint" and "diagnostic" name reports. They never change the nodes.

## Preliminaries

Terms:

- *Leaf* and *container* have the meaning of the block chapter. Inline content is read in a paragraph, a heading, a term, a caption, a line of a line block and each cell of a table row.
- The *content* is the text of one of these, as the block pass left it. A table row is split into cells first, and each cell has a content of its own. Every rule below works on one content.
- A *form* is one spelling of a construct, such as the braced form of emphasis. The `form` field of a reference node is written as a code word.
- A *word character* is a Unicode letter or number (general category L or N, of the version C2-I-127 pins).
- *Whitespace* is a space, a tab or a line break. The start and the end of the content count as whitespace. Where a rule tests the character before or after a position (C2-I-023, C2-I-047, C2-I-048, C2-I-104), a no-break space counts as whitespace too, written as a backslash and a space (C2-I-011) or as the character U+00A0. It does not count where a rule needs a space as a separator, such as after a block marker.
- Two things are *glued* when no character stands between them.
- An *atom* is a form whose characters are taken as one token. The atoms are listed under C2-I-005.
- A *bracket construct* is a form built on a bracket pair: a span, a link, an image, a reference, an inline footnote, an inline extension.
- A *host* is an inline node that an attribute block can attach to (C2-I-036). The program that embeds Carve is called the application.

**C2-I-001** Inline content is parsed one content at a time, after the block pass has settled every line of the document: no block decision depends on inline content, and every definition and heading is known when the first content is read.

**C2-I-002** A content is the list of its source spans in order, one per line, without the prefixes of its containers, without markers and without indent. Spaces and tabs at the end of a line of the content are not part of it, on the last line as on the others; a space that a backslash escapes is not such a space (C2-I-011). They are removed before any inline form is read, so the rule holds inside a code span, a math span, a literal span, a raw span and a comment as in text. The test is lexical: a space behind an odd run of backslashes is kept, also inside a form that reads no escapes (C2-I-013). A tab behind a backslash is removed like any other tab at the end of a line. In a table cell the padding before the closing pipe is removed first, so a backslash that stands before that padding ends the cell and is a hard break (C2-I-102). A no-break space at the end of a cell therefore has no spelling (C2-W-117).

A code span over two lines, whose first line is `` `a\ ``, which ends in a backslash and one space, and whose second line is `` b` ``, has the value `a\ `, a line feed and `b`. With a tab in place of that space the value is `a\`, a line feed and `b`.

The two spaces before the pipe are padding and are removed first, so the backslash ends the cell and is a hard break (C2-I-002, C2-I-102).

Example 120 (unverified)

::: compare

```carve
| a\  |
```

```html
<table>
  <tbody>
    <tr><td>a<br>
</td></tr>
  </tbody>
</table>
```

:::

**C2-I-003** Two neighboring spans are joined by one line break.

**C2-I-004** The content is read in one left-to-right scan with four steps in a fixed order of precedence: atoms, the bracket stack, the delimiter stack, attachment.

**C2-I-005** At each position the scan tries the atoms first. An atom that matches is taken whole: no bracket, delimiter or other atom opens, closes or is matched inside it, and of two atoms the one that starts first wins.

The atoms, each defined in its own section:

- a backslash escape;
- a code span, with its `!`, `$` or `$$` prefix and with a raw-format marker;
- an autolink and a cross-reference;
- a valid attribute block;
- a braced comment, an editorial comment and a line comment;
- a link tail, which is the parenthesized destination and title glued to the closing bracket of a pair;
- a mention, a tag and a symbol.

**C2-I-006** An opening bracket is pushed on the bracket stack. A closing bracket pairs with the nearest open one, and what is glued to the closing bracket decides the construct. Where no glued tail forms another construct, C2-I-072 tests the pair for a defined shortcut. A pair that forms no construct is plain text: its content is read as inline content all the same, and it bounds nothing. A closing bracket with no open bracket is text.

**C2-I-007** A bracket construct is settled before delimiters pair: a delimiter inside its content pairs only inside it, and a delimiter outside it pairs only outside it.

**C2-I-008** Emphasis, strong and the braced forms pair on one delimiter stack (C2-I-051, C2-I-059).

**C2-I-009** Attachment comes last: an attribute block attaches only to a host that has already formed.

The backtick opens a code span before the star can close, so the strong span never forms.

The block pass comes first: the blank line ends the paragraph, and neither the star nor the code span reaches across it.

Example 1 (unverified)

::: compare

```carve
*a

b* and `c

d`
```

```html
<p>*a</p>
<p>b* and `c</p>
<p>d`</p>
```

:::

The quote marks are no part of the content, so the strong span crosses the line break.

Example 2 (generated)

::: compare

```carve
> *a
> b* c
```

```html
<blockquote><p><strong>a
b</strong> c</p></blockquote>
```

:::

Example 3 (generated)

::: compare

```carve
*a `b* c`
```

```html
<p>*a <code>b* c</code></p>
```

:::

The link forms first. The star inside it has no partner inside, and the star outside has none outside.

Example 4 (generated)

::: compare

```carve
*a [b* c](/u)
```

```html
<p>*a <a href="/u">b* c</a></p>
```

:::

The brackets form no construct, so the stars pair across them.

Example 5 (unverified)

::: compare

```carve
*a [b* c] d
```

```html
<p><strong>a [b</strong> c] d</p>
```

:::

**C2-I-127** Every general category and every character property that a clause of the 0.2 documents names is that of Unicode 18.0.0, whatever Unicode version the host runtime has. `data/unicode-categories.json` lists the code points of the categories L, M, N and Cf of that version, generated from its `UnicodeData.txt`; a code point that Unicode 18.0.0 leaves unassigned is in none of them. The display width of the writer reads the same version (C2-W-119).

U+3D000 is a letter that Unicode 18.0.0 assigned. The star behind it does not open, so no strong span forms (C2-I-047, C2-I-127).

Example 110 (unverified)

::: compare

```carve
𽀀*𰨌*
```

```html
<p>𽀀*𰨌*</p>
```

:::

## Backslash escapes

**C2-I-010** A backslash before an ASCII punctuation character makes that character literal text: it opens, closes and starts nothing.

**C2-I-011** A backslash before a space is a no-break space, except at the end of a line, where the two are a hard break (C2-I-102). In every test of the character before or after a position it counts as whitespace, as U+00A0 does: in `a\ "b"` the first quote opens (C2-I-104), and `*\ a*` holds no strong.

**C2-I-012** A backslash before any other character is a literal backslash, except at the end of a line, where it is a hard break (C2-I-102).

**C2-I-013** Escapes are not read inside a code span, an autolink, a cross-reference, a comment or an editorial comment. A link destination reads only the escaped parenthesis and the escaped backslash. A link title and a quoted attribute value read escapes.

Example 6 (generated)

::: compare

```carve
\*not strong\* and \# and a\ b and \a and C:\dir
```

```html
<p>*not strong* and # and a&nbsp;b and \a and C:\dir</p>
```

:::

Example 7 (generated)

::: compare

```carve
`a\*b` and [x](/a\(b) and \[not a span]{.c}
```

```html
<p><code>a\*b</code> and <a href="/a(b">x</a> and [not a span]{.c}</p>
```

:::

## Code spans

**C2-I-014** A run of one or more backticks opens a code span. The opener is the whole run.

**C2-I-015** The span closes at the next backtick run of exactly the opener's length. Everything between is code: no escape and no other form is read there, and a line break is content. The spaces and tabs at the end of each line are removed before the span is read (C2-I-002): `` `a ``, two spaces, a line break and `` b` `` give the value `a`, a line feed and `b`.

**C2-I-016** The spaces of the content are kept, except one space next to a backtick: a space directly after the opening run is removed when the character after it is a backtick, and a space directly before the closing run is removed when the character before it is a backtick. This lets a span start or end with a backtick: ``` `` `x` `` ``` holds `` `x` ``, and `` ` x ` `` holds a space, `x` and a space.

**C2-I-017** A backtick run with no closing run of its length later in the same content opens nothing (C2-I-119): the run is text, and so is a `!`, `$` or `$$` glued before it. The scan goes on behind the run, so a shorter or longer run after it may open a span. This holds for a code span, a literal-text span and a math span alike, and in a table cell as anywhere: the cell `` | x `a | `` holds the text `` x `a ``. For this test a comment-only line ends the content (C2-B-138).

**C2-I-018** A `!` glued before the opening run makes a literal-text span: its content is written as escaped text with no code element. With an attribute block it is written as a span element that carries the attributes.

A literal `!` before a code span is written with a backslash.

Example 8 (unverified)

::: compare

```carve
`code` and `` a ` b `` and ` x ` and `*a*`
```

```html
<p><code>code</code> and <code> a ` b </code> and <code> x </code> and <code>*a*</code></p>
```

:::

Example 9 (generated)

::: compare

```carve
a `b
c` d
```

```html
<p>a <code>b
c</code> d</p>
```

:::

Example 10 (unverified)

::: compare

```carve
see `unclosed *x* and [y](/u)
```

```html
<p>see `unclosed <strong>x</strong> and <a href="/u">y</a></p>
```

:::

Example 11 (generated)

::: compare

```carve
!`/kaet/` and !`a<b>`{.ipa} and \!`x`
```

```html
<p>/kaet/ and <span class="ipa">a&lt;b&gt;</span> and !<code>x</code></p>
```

:::

## Math spans

**C2-I-019** A `$` glued before a code span makes inline math, and `$$` makes display math. The content is the span's verbatim text. A `$` with no backtick run after it is text.

Example 12 (generated)

::: compare

```carve
$`x^2` and $$`E = mc^2` and $5 and $`x`{.c}
```

```html
<p><span class="math inline" role="math">\(x^2\)</span> and <span class="math display" role="math">\[E = mc^2\]</span> and $5 and <span class="math inline c" role="math">\(x\)</span></p>
```

:::

Example 13 (unverified)

::: compare

```carve
the sum $`a + b
```

```html
<p>the sum $`a + b</p>
```

:::

## Raw inline

**C2-I-021** A closed plain code span with `{=name}` glued to it, `name` a raw format name (C2-B-225), is raw inline; the marker is tried together with the attribute block, before the highlight opener. The content is written unescaped to the output format of that name and dropped for every other format. Anywhere else, after a literal-text span or a math span too, `{=` is read as a braced opener (C2-I-043).

A raw format name starts with an ASCII letter, so `{=_a}` makes no raw span.

Example 123 (generated)

::: compare

```carve
`x`{=_a}
```

```html
<p><code>x</code>{=_a}</p>
```

:::

Raw HTML is written only when the `rawHtml` option allows it. That is a rendering rule.

Example 14 (unverified)

::: compare

```carve
a `<br>`{=html} b
```

```html
<p>a &lt;br&gt; b</p>
```

:::

Example 15 (generated)

::: compare

```carve
`<br>`{=html .c} and [s]{=html} and $`x`{=html}
```

```html
<p><code>&lt;br&gt;</code>{=html .c} and [s]{=html} and <span class="math inline" role="math">\(x\)</span>{=html}</p>
```

:::

## Comments

Carve has three comment forms. The block form `%%%` is defined in the block chapter. The line form and the braced form are inline atoms.

**C2-I-023** `%%` at the start of a line of the content or after whitespace starts a line comment. It runs to the end of that line and renders nothing, and the spaces before it are dropped with it. Elsewhere `%%` is text, also directly after the opener of a bracket or a braced form: the start of their content is neither a line start nor whitespace.

**C2-I-024** A line comment takes the rest of its line, every closer on it included. A form that is open at the comment stays open: a matching closer on a later line of the same paragraph closes it, and an opener that never closes is text.

Example 128 (unverified)

::: compare

```carve
a ^[see b %% check *this*] c
```

```html
<p>a ^[see b</p>
```

:::

Inside an atom that started earlier on the line, `%%` is content (C2-I-005): in a code span, in a link tail and in a quoted attribute value. The limits in a table row, in an opaque body such as a code fence, and in a line block are block clauses (C2-B-169, C2-B-135).

**C2-I-025** `{%` opens a braced comment that closes at the first `%}` in the content. It may cross line breaks, it does not nest, and it renders nothing.

**Exception C2-I-026** A braced comment counts as nothing for its neighbors: the characters on its two sides are tested as if they were glued, for delimiter conditions (C2-I-047), for the sigil boundary (C2-I-090) and for typography. For delimiter conditions this is carried over from 0.1; 0.1 read a braced comment as a boundary before a sigil and before a single quote, so `a{%%}#tag` gave a tag and `a {%%}'word` an apostrophe (U-363, U-364).

Example 16 (generated)

::: compare

```carve
a %% comment
b and 50%% and a%%b
```

```html
<p>a
b and 50%% and a%%b</p>
```

:::

The comment takes the closing star. The strong span closes on the next line.

Example 17 (generated)

::: compare

```carve
*a %% b*
c* d
```

```html
<p><strong>a
c</strong> d</p>
```

:::

The comment takes the closing bracket, so the link does not form (C2-I-024).

Example 18 (unverified)

::: compare

```carve
[a %% b](/u) c
```

```html
<p>[a</p>
```

:::

Example 19 (generated)

::: compare

```carve
`a %% b` and [a](/u%%20c) and [a]{k="a %% b"}
```

```html
<p><code>a %% b</code> and <a href="/u%%20c">a</a> and <span k="a %% b">a</span></p>
```

:::

Example 20 (generated)

::: compare

```carve
a {% one
two %} b and *bo{% c %}ld* and a {% oops
```

```html
<p>a  b and <strong>bold</strong> and a {% oops</p>
```

:::

## Attribute blocks

**C2-I-028** A valid attribute block is `{`, optional spaces, one or more parts separated by spaces, optional spaces and `}`, all on one line.

**C2-I-029** A part is `#name` for the id, `.name` for a class, `:tag` for the language, `key=value`, or a bare `key`, which is a key with an empty value.

**C2-I-030** A name is one or more ASCII letters, digits, `_` and `-`. A key is an ASCII letter or `_`, then letters, digits, `_` and `-`. A language tag is empty or runs of letters and digits joined by single hyphens.

**Exception C2-I-031** A bare key does not start with `_`.

**C2-I-032** An unquoted value is one or more characters without a space, a tab, a quote, a backslash, a pipe and a closing brace.

**C2-I-033** A quoted value stands in `"` or `'`. In it a backslash escapes as in text (C2-I-010, C2-I-012): before an ASCII punctuation character it is dropped and the character is literal, and before any other character it stays. A closing brace is allowed, and the value may be empty.

**C2-I-034** One part that fits no shape makes the whole run no attribute block. Its opening brace is then read by the next rule of C2-I-043.

**C2-I-035** A valid attribute block is one atom wherever it stands. One that attaches to nothing is printed as written: nothing inside it is transformed, smart quotes included.

**C2-I-036** A valid attribute block attaches when it is glued to the end of a formed host, and is literal text otherwise. The hosts are: a span, a link, an image, an autolink, a reference, a code span without a raw marker (C2-I-021), a literal-text span, a math span, a footnote reference, an inline footnote, a symbol, an inline extension, an editorial comment, and every closed emphasis, strong or braced span.

Example 124 (generated)

::: compare

```carve
`x`{=html}{.c}
```

```html
<p>x{.c}</p>
```

:::

Raw inline is no host, so the attribute block behind its marker attaches to nothing and is printed as written.

**C2-I-039** Glued attribute blocks after one host merge, in the order written: classes add up, a later id or key replaces an earlier one of the same name, and a later language part replaces an earlier one.

**Exception C2-I-040** The block with no part, `{}` or braces around spaces, is valid only in the glued run after a bracket pair, where it adds nothing: `[a]{}` is a span with no attributes. Everywhere else it is text. It is read only behind a pair that is a span, also behind another block of that span; behind a link, an inline footnote or an inline extension it is text.

The order inside a block is that of C2-B-098, and the tree keeps no order between the kinds of parts (C2-A-033).

**C2-I-042** A key named `id` or `class`, in any ASCII letter case, folds into the id or into the classes when the block is parsed, and of several ids the last one wins (C2-B-104). The value of a `class` key is split at runs of spaces and tabs, each piece is one class at the place of the key, and an empty value adds none.

Example 21 (generated)

::: compare

```carve
[s]{#a .b k=v} [s]{k="v w" k2='x'} [s]{:en} [s]{ .a } [s]{open}
```

```html
<p><span id="a" class="b" k="v">s</span> <span k="v w" k2="x">s</span> <span lang="en">s</span> <span class="a">s</span> <span open="">s</span></p>
```

:::

Example 22 (generated)

::: compare

```carve
[s]{.a.b} [s]{k=} [s]{1=2} [s]{#} word{.c} a {.b} c
```

```html
<p>[s]{.a.b} [s]{k=} [s]{1=2} [s]{#} word{.c} a {.b} c</p>
```

:::

Example 23 (generated)

::: compare

```carve
*bold*{.c} `code`{.c} <https://a.b>{.c} :note[x]{.c}
```

```html
<p><strong class="c">bold</strong> <code class="c">code</code> <a href="https://a.b" class="c">https://a.b</a> <span class="ext-note c">x</span></p>
```

:::

A mention, a tag and a cross-reference are not hosts.

Example 24 (generated)

::: compare

```carve
@user{.c} and #tag{.c}
```

```html
<p><span class="mention"><strong>@user</strong></span>{.c} and <span class="tag"><strong>#tag</strong></span>{.c}</p>
```

:::

The block is an atom, so the star in it closes nothing.

Example 25 (unverified)

::: compare

```carve
*a {k=*} b*
```

```html
<p><strong>a {k=*} b</strong></p>
```

:::

The block is valid and its host is a word, so it is text. Being an atom, it cannot be the start of an editorial comment.

Example 26 (unverified)

::: compare

```carve
a*{#b} c #}
```

```html
<p>a*{#b} c #}</p>
```

:::

Example 27 (unverified)

::: compare

```carve
word{k="v"} and "v"
```

```html
<p>word{k="v"} and “v”</p>
```

:::

Example 28 (generated)

::: compare

```carve
[x]{#i}{.a}{.b} and [s]{#a #b} and [s]{k=1 k=2}
```

```html
<p><span id="i" class="a b">x</span> and <span id="b">s</span> and <span k="2">s</span></p>
```

:::

Example 29 (unverified)

::: compare

```carve
[s]{.a #b k=v .c} and *a*{.c}{#d}
```

```html
<p><span id="b" class="a c" k="v">s</span> and <strong id="d" class="c">a</strong></p>
```

:::

Example 30 (unverified)

::: compare

```carve
[s]{ID=x Class=y .z} and [s]{k=v :en}
```

```html
<p><span id="x" class="y z">s</span> and <span lang="en" k="v">s</span></p>
```

:::

Example 31 (generated)

::: compare

```carve
[s]{} and [s]{}{.b} and *a*{} and a {} b
```

```html
<p><span>s</span> and <span class="b">s</span> and <strong>a</strong>{} and a {} b</p>
```

:::

## The opening brace

**C2-I-043** At an opening brace the scan takes the first of these that matches. One: a valid attribute block. Two: `{%`, a braced comment, when `%}` follows in the content. Three: `{#`, an editorial comment, when `#}` follows in the content with at least one character between. Four: `{` followed by one of `*`, `/`, `_`, `~`, `=`, `+`, `-`, `^` or `,`, a braced opener on the delimiter stack.

There are no braced quote forms: `{'` and `{"` are a brace followed by a quote. An include directive `{{ ... }}` is a block line; inside inline content each of its braces is read on its own.

Example 32 (generated)

::: compare

```carve
[s]{#id} and [s]{#id#} and [s]{#id k=v#}
```

```html
<p><span id="id">s</span> and [s]<span class="critic-comment">id</span> and <span id="id" k="v#">s</span></p>
```

:::

Example 33 (generated)

::: compare

```carve
a {=a}b=} c and {---} and [s]{=x=}
```

```html
<p>a <mark>a}b</mark> c and <del>-</del> and [s]<mark>x</mark></p>
```

:::

The run is a valid attribute block with the key `_k`, so it is not an underline.

Example 34 (unverified)

::: compare

```carve
a {_k=v_} b and {_a_}
```

```html
<p>a {_k=v_} b and <u>a</u></p>
```

:::

Example 35 (generated)

::: compare

```carve
a {'x'} b and {"a": "b"}
```

```html
<p>a {‘x’} b and {“a”: “b”}</p>
```

:::

## Emphasis and strong

**C2-I-046** `/` is the emphasis delimiter and `*` is the strong delimiter. No other character is a bare delimiter: a bare `_`, `~`, `=`, `^` or `,` is text.

**C2-I-047** A delimiter can open when the character before it is not a word character and the character after it is not whitespace. A bare underscore is ordinary punctuation for this test and for C2-I-048.

**C2-I-048** A delimiter can close when the character before it is not whitespace and the character after it is not a word character.

**Exception C2-I-049** A run of two or more of one bare delimiter character is not a delimiter, for the slash as for the star: each character in it is text. `**bold**` is literal, and lint reports it as `markdown-strong-double-star`.

**Exception C2-I-050** A delimiter is a whole character: a bare delimiter, or the mark of a braced opener or of a comment opener, that is followed by a combining mark (category Mn, Mc or Me), a variation selector or a zero-width joiner is text.

**C2-I-051** A delimiter that can close, with an open entry of its kind on the stack, closes the nearest such entry. Every entry above it is removed, and its characters are text. Otherwise, a delimiter that can open is pushed, also while an entry of its kind is open, so a kind nests in itself. Otherwise it is text.

**C2-I-052** There is no combined token for strong emphasis. Each order of the two delimiters is plain nesting, in the order written.

**Exception C2-I-053** A bare span that holds its own delimiter character between two word characters does not form: its entry leaves the stack, every other entry stays, and both delimiters are text. Only the span's own content counts, not the inside of an atom, of a bracket construct or of a braced span.

Example 36 (generated)

::: compare

```carve
/emphasis/ and *strong* and *a
b* and * a* and *a *
```

```html
<p><em>emphasis</em> and <strong>strong</strong> and <strong>a
b</strong> and * a* and *a *</p>
```

:::

A combining acute accent follows the first star, so that star is text and the span never opens.

Example 37 (generated)

::: compare

```carve
*́a* and *a*
```

```html
<p>*́a* and <strong>a</strong></p>
```

:::

The closer pairs with the nearest opener, so the inner pair forms first.

Example 38 (unverified)

::: compare

```carve
/a /b/ c/
```

```html
<p><em>a <em>b</em> c</em></p>
```

:::

The underscores are text and do not block the stars.

Example 39 (unverified)

::: compare

```carve
a_*x* and _*x*_
```

```html
<p>a_<strong>x</strong> and _<strong>x</strong>_</p>
```

:::

Example 40 (unverified)

::: compare

```carve
/*both*/ and */both/*
```

```html
<p><em><strong>both</strong></em> and <strong><em>both</em></strong></p>
```

:::

Example 41 (unverified)

::: compare

```carve
**bold** and *a** and ***x*** and /b// and //x//
```

```html
<p>**bold** and *a** and ***x*** and /b// and //x//</p>
```

:::

Prose that stays literal:

Example 42 (generated)

::: compare

```carve
a/b testing, 2 * 3 * 4, a*b*c, x^2, $5, 50%, a = b = c
```

```html
<p>a/b testing, 2 * 3 * 4, a*b*c, x^2, $5, 50%, a = b = c</p>
```

:::

Example 43 (unverified)

::: compare

```carve
x =1, y= 2 and ~/config and _id
```

```html
<p>x =1, y= 2 and ~/config and _id</p>
```

:::

Example 44 (unverified)

::: compare

```carve
snake_case_name and _private and __init__ and ~5 minutes~ and a == b
```

```html
<p>snake_case_name and _private and __init__ and ~5 minutes~ and a == b</p>
```

:::

The own-delimiter rule keeps a path with an inner slash literal. A path with no inner slash is emphasis.

Example 45 (generated)

::: compare

```carve
the /etc/ dir and /usr/local/ and /etc/hosts/ file
```

```html
<p>the <em>etc</em> dir and /usr/local/ and /etc/hosts/ file</p>
```

:::

Two collisions stay in 0.2. A code span or a backslash avoids them.

Example 46 (generated)

::: compare

```carve
cd /tmp/ && ls /var/
```

```html
<p>cd <em>tmp</em> &amp;&amp; ls <em>var</em></p>
```

:::

Example 47 (generated)

::: compare

```carve
glob *.js or src/* and 5 *3 and 4* 2
```

```html
<p>glob <strong>.js or src/</strong> and 5 <strong>3 and 4</strong> 2</p>
```

:::

The strong span closes first, and the open emphasis entry above it becomes text.

Example 48 (generated)

::: compare

```carve
*a /b* c/
```

```html
<p><strong>a /b</strong> c/</p>
```

:::

## Braced delimiters

A braced form is a mark between braces. It works inside a word. The node names are those of the AST document; the prose calls an `insert` node an insertion and a `delete` node a deletion.

| Form | Node | HTML |
|---|---|---|
| `{/x/}` | `emphasis` | `em` |
| `{*x*}` | `strong` | `strong` |
| `{_x_}` | `underline` | `u` |
| `{~x~}` | `strike` | `s` |
| `{=x=}` | `highlight` | `mark` |
| `{^x^}` | `superscript` | `sup` |
| `{,x,}` | `subscript` | `sub` |
| `{+x+}` | `insert` | `ins` |
| `{-x-}` | `delete` | `del` |

**C2-I-055** A braced opener is `{` and a mark, and a braced closer is the mark and `}`. Each is one token and has no condition on the characters around it.

**C2-I-056** A braced opener only opens, and a braced closer only closes.

**C2-I-057** A mark followed by `}` is a braced closer only while a braced opener of that mark is open. Otherwise the mark is read by the bare rules (C2-I-051), where a slash or a star can close a bare span, and the brace is text. Of a run of marks before `}` only the last is the closer and the marks before it are text; with no braced opener of that mark open, the whole run is text.

**C2-I-058** A braced closer pairs with the nearest open braced opener of its mark. A braced token never pairs with a bare delimiter.

**C2-I-059** Bare and braced entries share the one delimiter stack, and the first pair closed wins: when a pair closes, every entry opened after its opener is removed, bare or braced, and is text (C2-I-051).

**C2-I-060** A braced opener that finds no closer, or that is removed, is text (C2-I-119), and its mark is not read again as a bare delimiter: `{*a* b` stays text.

**Exception C2-I-061** A braced opener glued to its own closer forms nothing, and both tokens are text.

**C2-I-062** A replacement is a deletion with an insertion glued to it. It is two nodes. There is no arrow form: `~>` is text, and the braced tilde is always strike.

**C2-I-063** `{#` opens an editorial comment that closes at the first `#}` in the content. Its content is literal: no escape and no form is read in it, and it holds at least one character. It is an atom and a host: a glued attribute block attaches to it (C2-I-036). The first `#}` decides: where it stands directly behind `{#`, there is no comment and the opener is text.

Revision metadata is a convention, not a rule. A revision is annotated with the keys `author`, a name or an address as written, and `datetime`, a time in ISO 8601, on an insertion, a deletion or an editorial comment: `{+12+}{author=Ann datetime=2026-11-20T10:00Z}`. The key is `datetime`, not `time`, which names a span element (C2-H-075). On an insertion and a deletion, `cite` is the URL of a text that explains the change, as in HTML, and no author; the name is not core (C2-H-076), so on any other node it is an ordinary attribute. A replacement is two nodes (C2-I-062), so each side carries its own block. A comment in a word processor covers a range and an editorial comment is a point, so an import that reads a ranged comment reports the lost range (C2-M-113). HTML output and import map these keys under C2-H-210 and C2-M-044.

A span no longer shields its content: a delimiter inside a braced span can close a span that opened outside it. An author escapes that delimiter.

Example 49 (generated)

::: compare

```carve
{/x/} {*x*} {_x_} {~x~} {=x=} H{,2,}O mc{^2^} {+new+} {-old-}
```

```html
<p><em>x</em> <strong>x</strong> <u>x</u> <s>x</s> <mark>x</mark> H<sub>2</sub>O mc<sup>2</sup> <ins>new</ins> <del>old</del></p>
```

:::

Example 50 (generated)

::: compare

```carve
foo{*bar*}baz and {*a {/b/} c*} and {/a/b/} and {*a*}{.c}
```

```html
<p>foo<strong>bar</strong>baz and <strong>a <em>b</em> c</strong> and <em>a/b</em> and <strong class="c">a</strong></p>
```

:::

The inner star closes the strong span. The braced opener above it is removed and its closer has no partner.

Example 51 (unverified)

::: compare

```carve
*bold {/note*/} more*
```

```html
<p><strong>bold {/note</strong>/} more*</p>
```

:::

Example 52 (generated)

::: compare

```carve
*bold {/note\*/} more*
```

```html
<p><strong>bold <em>note*</em> more</strong></p>
```

:::

No braced opener is open, so each mark is a bare closer and the brace is text.

Example 53 (generated)

::: compare

```carve
/a/} and *a*}
```

```html
<p><em>a</em>} and <strong>a</strong>}</p>
```

:::

The insertion closes first, so the strong opener inside it is text.

Example 54 (unverified)

::: compare

```carve
{+a {*b+} c*}
```

```html
<p><ins>a {*b</ins> c*}</p>
```

:::

The braced opener fails and is two characters of text. The bare stars pair with each other.

Example 55 (unverified)

::: compare

```carve
{*unclosed and *x*
```

```html
<p>{*unclosed and <strong>x</strong></p>
```

:::

Example 56 (generated)

::: compare

```carve
{-old-}{+new+} and {-old-}{+new+}{.k}
```

```html
<p><del>old</del><ins>new</ins> and <del>old</del><ins class="k">new</ins></p>
```

:::

Example 57 (unverified)

::: compare

```carve
{~a~>b~}
```

```html
<p><s>a~&gt;b</s></p>
```

:::

Example 58 (generated)

::: compare

```carve
{# note *x* #} and {**} and {==}
```

```html
<p><span class="critic-comment"> note *x* </span> and {**} and {==}</p>
```

:::

## Spans

**C2-I-064** A bracket pair with a valid attribute block glued to it is a span. Its content is inline content, and the block and every block glued behind it attach to it (C2-I-039, C2-I-040).

Example 59 (generated)

::: compare

```carve
[text]{.c} and [a /b/ c]{#i} and [text] {.c} and [text]
```

```html
<p><span class="c">text</span> and <span id="i">a <em>b</em> c</span> and [text] {.c} and [text]</p>
```

:::

Example 60 (generated)

::: compare

```carve
[*x*]{???} and [[t](/v)]{.c}
```

```html
<p>[<strong>x</strong>]{???} and <span class="c"><a href="/v">t</a></span></p>
```

:::

## Links and images

**C2-I-066** A bracket pair with a link tail glued to it is an inline link. The tail is `(`, a destination, an optional title and `)`.

**C2-I-067** A destination is a run of characters without whitespace, in which parentheses are balanced or escaped. It may be empty. Whitespace is a space, a tab or a line break here as everywhere (Preliminaries), so a no-break space, U+00A0 or U+202F, before or inside the destination is part of it, where 0.1 ended the destination at any Unicode whitespace.

**C2-I-068** A title follows the destination after exactly one space. It stands in double quotes, which is the canonical form, or in single quotes, which the formatter rewrites. A backslash escapes the quote in it, and spaces may follow it.

**C2-I-069** The link tail is an atom and stands on one line. It is read only glued to the closing bracket of a pair: with no open bracket, no destination is read. A tail with a space in the destination, a broken title or a line break is no tail: the bracket pair is text and the parenthesis is text.

**C2-I-070** Link text is inline content and may cross line breaks.

**Exception C2-I-071** Links do not nest: a link inside link text renders as its own content, and the outer link keeps its destination. The inner link stays a node in the tree (C2-A-111). An image and a span inside link text stay.

**C2-I-072** A bracket pair with `[label]` glued to it is a full reference. With `[]` glued to it, it is a collapsed reference, whose label is the source of its own text. A pair without another bracket construct glued to it is a shortcut reference when the folded source of its text is a key of a link definition in the document. A shortcut has no separate label. Without a matching definition the brackets are text, and no reference node forms. A collapsed reference whose own text folds to an empty key (C2-I-079) is no reference: its brackets are text.

**C2-I-073** `<`, a URL or an email address, and `>` form an autolink. A URL is a scheme (a letter, then letters, digits, `+`, `-` and `.`), a colon and one or more URL characters. An email address is a local part, an at-sign, a domain, a dot and letters. The visible text is the body as written. It is an atom. C2-I-122 to C2-I-124 state the characters.

**C2-I-074** A `!` glued before a bracket pair that forms an inline link or a reference makes an image. Its alt text is the source of the bracket content, not parsed, except that a backslash before an ASCII punctuation character is removed (C2-I-010). Before any other bracket pair the `!` is text.

Example 129 (unverified)

::: compare

```carve
![5 \* 3 \[draft\]](/i.png)
```

```html
<img src="/i.png" alt="5 * 3 [draft]">
```

:::

Example 61 (generated)

::: compare

```carve
[a](/u) [a](/u "T") [a](/u 'T') [a]() [a](/u(1)) [*b*](/u)
```

```html
<p><a href="/u">a</a> <a href="/u" title="T">a</a> <a href="/u" title="T">a</a> <a href="">a</a> <a href="/u(1)">a</a> <a href="/u"><strong>b</strong></a></p>
```

:::

Example 62 (generated)

::: compare

```carve
[a](/u v) and [a](/u "T) and [a](/u
v)
```

```html
<p>[a](/u v) and [a](/u “T) and [a](/u
v)</p>
```

:::

Example 63 (generated)

::: compare

```carve
[a
b](/u) and [[x](/y)](/z)
```

```html
<p><a href="/u">a
b</a> and <a href="/z">x</a></p>
```

:::

The closing bracket has no partner, so the parentheses are text and the stars pair.

Example 64 (unverified)

::: compare

```carve
a](b *c) d*
```

```html
<p>a](b <strong>c) d</strong></p>
```

:::

Example 65 (generated)

::: compare

```carve
<https://example.com/a_b?c=*d*> and <a@b.com> and <a@b> and <not a link>
```

```html
<p><a href="https://example.com/a_b?c=*d*">https://example.com/a_b?c=*d*</a> and <a href="mailto:a@b.com">a@b.com</a> and &lt;a@b&gt; and &lt;not a link&gt;</p>
```

:::

Example 66 (generated)

::: compare

```carve
![alt](/i.png) and ![*alt*](/i.png "T"){.c} and a ![x] b
```

```html
<p><img src="/i.png" alt="alt"> and <img src="/i.png" alt="*alt*" title="T" class="c"> and a ![x] b</p>
```

:::

**C2-I-122** A URL character is an ASCII letter or digit, one of `-`, `.`, `_`, `~`, `:`, `/`, `?`, `#`, `[`, `]`, `@`, `!`, `$`, `&`, `'`, `(`, `)`, `*`, `+`, `,`, `;`, `=` and `%`, or a character outside ASCII that does not have the Unicode property White_Space, is not a control character (general category Cc) and is not a format character (Cf), all of the version C2-I-127 pins. Every other ASCII character is no URL character, among them a space, `"`, `\`, a backtick, `{`, `}`, `|`, `^`, `<` and `>`. The scheme holds ASCII characters only, so `<1a:x>` is no autolink.

**C2-I-123** The local part and the domain of an email address are each one or more ASCII letters, digits, `.`, `-`, `_` and `+`. The domain is followed by a dot and one or more ASCII letters, which end the address. So `<a@b>` and `<a@b.c1>` are no autolinks, and an address with a character outside ASCII is none either.

**C2-I-124** The body of an autolink is everything between `<` and the next `>`. The autolink forms only when the whole body is one URL or one email address; otherwise `<`, the body and `>` are text, read as any other inline content. The destination of a URL autolink is its body, and that of an email autolink is `mailto:` followed by its body. An attribute block glued to the `>` attaches to the autolink (C2-I-036).

Example 108 (generated)

::: compare

```carve
<https://例え.jp/パス?q=1#f> <h:x> <a@b.co.uk> <x+y@b-c.de>

<1a:x> <http://a b> <http://a|b> <a@b.c1> <a_b@c_d.e-f>
```

```html
<p><a href="https://例え.jp/パス?q=1#f">https://例え.jp/パス?q=1#f</a> <a href="h:x">h:x</a> <a href="mailto:a@b.co.uk">a@b.co.uk</a> <a href="mailto:x+y@b-c.de">x+y@b-c.de</a></p>
<p>&lt;1a:x&gt; &lt;http://a b&gt; &lt;http://a|b&gt; &lt;a@b.c1&gt; &lt;a_b@c_d.e-f&gt;</p>
```

:::

## Reference resolution

**C2-I-075** A full or collapsed reference is a node whether or not its label resolves. The inline scan reads the definition keys to decide whether a shortcut forms. Resolution reads the definition values later.

**C2-I-076** A reference label is the run of characters up to the next `]` that no backslash escapes. It is taken whole: no atom, bracket, delimiter or sigil form is read in it, a code span included, and its source is its key (C2-I-079). The line comment of C2-I-077 is the one exception. The heading lookup reads the stored key once more, and that reading makes no node (C2-I-084).

**Exception C2-I-077** Atoms are read first, so a line comment that starts inside a label takes the rest of its line (C2-I-024): the label is unclosed and the brackets are text. Lint reports it as `comment-in-reference-label`. Where a label fails, only the label's brackets are text; the pair before it is then tested as a shortcut (C2-I-072), so `[x][a %% b]` with a definition of `x` is a link `x` followed by the text `[a`.

**Exception C2-I-078** A label whose first character is an at-sign is not a reference label. The spelling is reserved for citations. A label whose first character is a caret is not a reference label either: `[^n]` behind a bracket pair is a footnote reference (C2-I-087), so `[x][^n]` is the text `[x]` and a footnote reference. The 0.1 engine read it as a full reference. The first character is that of the label's source, before folding: `[a][ @b]` is a reference with the key `@b`.

**C2-I-079** The lookup key of a label is its source text with every run of spaces, tabs and one line break folded to one space and with the ends trimmed. Case matters, and a backslash stays in the key, also one that escapes a bracket. Reference labels, footnote labels and definition labels share this rule. A label whose key is empty after folding, one that holds only spaces, tabs or a line break, is no label: the brackets are text.

**C2-I-080** A label may wrap: a line break with the whitespace around it folds to one space. A blank line ends the content and the label with it. A definition line stays on one line.

**C2-I-081** The stored key of a full or collapsed link reference is looked up first in the link definitions, where it matches a key that is the same string. Only where no definition matches is it looked up in the headings (C2-I-084). A shortcut forms and resolves only from a definition: a heading alone never forms a shortcut reference.

**C2-I-082** The attributes of a link definition merge into every reference that resolves to it: the classes of the definition and of the reference add up, the definition's first, and the reference's own id and keys win over the definition's.

**Exception C2-I-083** The heading lookup is for link references only: an image reference that matches no definition is unresolved.

**C2-I-084** The heading lookup reads the stored key as inline content of its own, in which no reference is resolved, and takes its plain text by C2-H-143. It takes the plain text of each heading the same way, folds both by C2-I-079 and normalizes both to NFC, as a cross-reference is matched (C2-I-097). The target is the first heading in document order that has an id and whose folded plain text equals that of the key. The match is case-sensitive. A key whose folded plain text is empty matches no heading, also none whose plain text is empty, so `[:smile:][]` below `# :smile:` stays text, as in 0.1. The reference links to that heading's authored or generated id; an explicit id is a destination, not a key the lookup matches. An opener left unclosed in the key is text under the fallback rule (C2-I-119), so the lookup never fails because of markup in the key. No source text is read: a tree resolves the same with and without its source, and the formatter cannot change which heading a key finds. The `key` and the carrier `data-carve-ref` keep the folded label as written (C2-A-104, C2-H-114). A heading that has no id, which is one without an authored id while `headingIds` is `off` (C2-H-022), is no target: the lookup passes over it, and a reference that finds no other heading is unresolved.

A symbol gives no plain text (C2-H-143), so the key `:smile:` is empty and finds no heading (C2-I-084).

Example 131 (unverified)

::: compare

```carve
# :smile:

[:smile:][]
```

```html
<section id="s">
  <h1>:smile:</h1>
  <p>[:smile:][]</p>
</section>
```

:::

**C2-I-085** An unresolved reference renders its brackets and its label as literal text and its children as HTML: an opening bracket, the rendered children, a closing bracket, then the label in brackets, or an empty bracket pair for the collapsed form. No part of the children is respelled as source. The label is written from the key, so a label that wrapped has one space where the line break was. The attribute blocks glued to it are merged (C2-I-039) and written behind it as text, as one block in the fixed order (C2-H-139), so the HTML is a function of the tree: `[x][no]{.c}{#i}` gives `<p>[x][no]{#i .c}</p>`. 0.1 wrote the blocks as typed (U-371). Lint reports a full or collapsed reference that resolves to nothing with `unresolved-reference-link`.

`no` names no definition, so the reference is text, and its two attribute blocks follow as one block in the fixed order (C2-I-085).

Example 130 (unverified)

::: compare

```carve
[x][no]{.c}{#i}
```

```html
<p>[x][no]{#i .c}</p>
```

:::

**C2-I-086** A footnote reference and an inline footnote inside an unresolved reference are ordinary footnotes: each takes its number and makes its note.

**C2-I-125** An inline footnote, inline extension, footnote reference, citation form, sigil form, task box in marker position and every other bracket construct of this chapter keep their own reading over a shortcut.

Example 109 (unverified)

::: compare

```carve
[later] and ![later] and [missing]

[later]: /u
```

```html
<p><a href="/u">later</a> and <img src="/u" alt="later"> and [missing]</p>
```

:::

Example 67 (unverified)

::: compare

```carve
[text][ref] and [ref][] and [ref] and ![img][ref]

[ref]: /u "T"
```

```html
<p><a href="/u" title="T">text</a> and <a href="/u" title="T">ref</a> and <a href="/u" title="T">ref</a> and <img src="/u" alt="img" title="T"></p>
```

:::

Example 68 (generated)

::: compare

```carve
[text][nope] and [nope][] and [a][nope]{.c}
```

```html
<p>[text][nope] and [nope][] and [a][nope]{.c}</p>
```

:::

The children are rendered. The inline footnote is a footnote.

Example 69 (unverified)

::: compare

```carve
[*a*][nope] and [a ^[n] b][nope]
```

```html
<p>[<strong>a</strong>][nope] and [a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b][nope]</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Example 70 (generated)

::: compare

```carve
[x][foo  bar] and [x][Foo]

[foo bar]: /u
```

```html
<p><a href="/u">x</a> and [x][Foo]</p>
```

:::

Example 71 (generated)

::: compare

```carve
# The Title

[The Title][] and [the title][]
```

```html
<section id="The-Title">
  <h1>The Title</h1>
  <p><a href="#The-Title">The Title</a> and [the title][]</p>
</section>
```

:::

The full form reaches a heading too.

Example 72 (unverified)

::: compare

```carve
# The Title

[go][The Title]
```

```html
<section id="The-Title">
  <h1>The Title</h1>
  <p><a href="#The-Title">go</a></p>
</section>
```

:::

Example 73 (generated)

::: compare

```carve
# The Title

![x][The Title]
```

```html
<section id="The-Title">
  <h1>The Title</h1>
  <p>![x][The Title]</p>
</section>
```

:::

The classes add up, and the reference's own key wins.

Example 74 (unverified)

::: compare

```carve
[a][r] and [b][r]{.own k=2}

{.def k=1}
[r]: /u
```

```html
<p><a href="/u" class="def" k="1">a</a> and <a href="/u" class="def own" k="2">b</a></p>
```

:::

The label is written from the folded key, and the attribute block in the fixed order.

Example 75 (unverified)

::: compare

```carve
[a][no
pe]{.c #i}
```

```html
<p>[a][no pe]{#i .c}</p>
```

:::

Example 76 (generated)

::: compare

```carve
# A *bold* title

[A *bold* title][] and [A bold title][]
```

```html
<section id="A-bold-title">
  <h1>A <strong>bold</strong> title</h1>
  <p><a href="#A-bold-title">A <strong>bold</strong> title</a> and <a href="#A-bold-title">A bold title</a></p>
</section>
```

:::

Example 77 (unverified)

::: compare

```carve
[*foo*
bar][] and [x][foo
bar]

[*foo* bar]: /u

[foo bar]: /v
```

```html
<p><a href="/u"><strong>foo</strong>
bar</a> and <a href="/v">x</a></p>
```

:::

The comment takes the closing bracket of the label.

Example 78 (unverified)

::: compare

```carve
[x][a %% b]
```

```html
<p>[x][a</p>
```

:::

Example 79 (unverified)

::: compare

```carve
[x][a\]b]

[a\]b]: /u
```

```html
<p><a href="/u">x</a></p>
```

:::

The heading lookup compares plain text, so emphasis in the key finds a plain heading, and the braced form finds it too.

Example 114 (unverified)

::: compare

```carve
# A bold title

[A *bold* title][] and [x][A {*bold*} title]
```

```html
<section id="A-bold-title">
  <h1>A bold title</h1>
  <p><a href="#A-bold-title">A <strong>bold</strong> title</a> and <a href="#A-bold-title">x</a></p>
</section>
```

:::

The reverse: a braced heading is found by a key with bare emphasis and by a plain key.

Example 115 (unverified)

::: compare

```carve
# A {*bold*} title

[A *bold* title][] and [A bold title][]
```

```html
<section id="A-bold-title">
  <h1>A <strong>bold</strong> title</h1>
  <p><a href="#A-bold-title">A <strong>bold</strong> title</a> and <a href="#A-bold-title">A bold title</a></p>
</section>
```

:::

Code and math in the key give their values.

Example 116 (unverified)

::: compare

```carve
# The `x` value and $`r^2`

[go][The x value and r^2] and [The `x` value and $`r^2`][]
```

```html
<section id="The-x-value-and-r-2">
  <h1>The <code>x</code> value and <span class="math inline" role="math">\(r^2\)</span></h1>
  <p><a href="#The-x-value-and-r-2">go</a> and <a href="#The-x-value-and-r-2">The <code>x</code> value and <span class="math inline" role="math">\(r^2\)</span></a></p>
</section>
```

:::

An escape gives the escaped character, and smart punctuation gives its glyph. An escaped apostrophe is no glyph, so the last key matches no heading.

Example 117 (unverified)

::: compare

```carve
# It's a\*b

[It's a\*b][] and [go][It’s a*b] and [go][It\'s a\*b]
```

```html
<section id="It-s-a-b">
  <h1>It’s a*b</h1>
  <p><a href="#It-s-a-b">It’s a*b</a> and <a href="#It-s-a-b">go</a> and [go][It\'s a\*b]</p>
</section>
```

:::

The first of two headings with equal plain text wins. An unclosed opener in the key is text, as anywhere else.

Example 118 (unverified)

::: compare

```carve
# A *b*

# A b

# A *c

[A b][] and [x][A *c]
```

```html
<section id="A-b">
  <h1>A <strong>b</strong></h1>
</section>
<section id="A-b-2">
  <h1>A b</h1>
</section>
<section id="A-c">
  <h1>A *c</h1>
  <p><a href="#A-b">A b</a> and <a href="#A-c">x</a></p>
</section>
```

:::

An explicit id is the destination, not a key. An image and a shortcut never reach a heading. A definition wins over a heading of the same text.

Example 119 (unverified)

::: compare

```carve
{#manual}
# Intro

[Intro][] and [manual][] and ![x][Intro] and [Intro] and [Setup][]

# Setup

[Setup]: /setup
```

```html
<section id="manual">
  <h1>Intro</h1>
  <p><a href="#manual">Intro</a> and [manual][] and ![x][Intro] and [Intro] and <a href="/setup">Setup</a></p>
</section>
<section id="Setup">
  <h1>Setup</h1>
</section>
```

:::

## Footnotes

**C2-I-087** `[^`, a label and `]` form a footnote reference. The label is one or more characters up to the next `]`, its key follows C2-I-079, and it may wrap (C2-I-080). The label follows C2-I-076 and C2-I-077. A footnote reference takes no link tail and no reference label: `(` or `[` directly behind it starts ordinary text or the next construct, so `[^n](/u)` is a footnote reference and the text `(/u)`. Where the label is none (C2-I-079), the `[` is text and opens no bracket pair, so a link tail behind it forms nothing.

**C2-I-088** A footnote reference with no definition renders its brackets, the caret and its label as literal text (C2-I-085). The attribute blocks glued to it follow as C2-I-085 says, in the fixed order: `[^x]{.c}{#i}` gives `<p>[^x]{#i .c}</p>`, where 0.1 wrote them as typed (U-207). Lint reports the reference with `unresolved-footnote`.

**C2-I-089** `^[` opens an inline footnote that closes at its matching bracket on the bracket stack. Its content is inline content, in which `[^` opens no footnote reference and `^[` no inline footnote, at any depth: in both the caret is text and the bracket an ordinary bracket, so `[^1]` and `^[b]` there are text and `[^1](u)` is a link. Unclosed, the two characters are text. A note that would close only because a caret pair inside it opens is text, and that caret pair is an ordinary bracket.

The note of the inline footnote holds `[^1]` as text, so the document has one note, and the definition of `1`, which nothing else uses, writes nothing (C2-I-089).

Example 127 (unverified)

::: compare

```carve
a ^[see *[^1]* there] d

[^1]: note
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> d</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <strong>[^1]</strong> there<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Numbering and the notes section are rendering rules.

Example 80 (generated)

::: compare

```carve
a[^n] and b[^missing] and c^[inline *note*] and d^[unclosed

[^n]: The note.
```

```html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and b[^missing] and c<a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a> and d^[unclosed</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>The note.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>inline <strong>note</strong><a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Example 81 (unverified)

::: compare

```carve
a[^my
note] b

[^my note]: Text.
```

```html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>Text.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## Mention, tag, symbol and inline extension

These four forms start with a sigil: the at-sign for a mention, `#` for a tag, `:` for a symbol and for an inline extension.

**C2-I-090** A sigil starts a form only at the start of the content or after a character outside the Unicode letter-or-number class.

**C2-I-091** The name is ASCII and is the longest run that fits its shape. A sigil with no such name is text, and so is whatever follows a name.

**C2-I-092** The name of a mention or a tag is one or more runs of letters, digits, `_` and `-`, joined by single dots, and holds at least one letter. It does not end with a dot or a hyphen: a trailing one is text behind the name. Where the longest run of letters, digits, `_`, `-` and `.` behind the sigil, taken before a trailing dot or hyphen is removed, is directly followed by a character of the Unicode letter, number or mark class, the sigil starts no form: the sigil and the run are text. So `#größe`, `#tag-é` and `@josé` hold no tag and no mention, and a decomposed accent is never cut from its letter; an emoji is in none of the three classes, so `#tag😀` is the tag `#tag`.

**C2-I-093** A symbol is `:`, a name and `:`. The name is a letter, a digit, `+` or `-`, then letters, digits, `_`, `+` and `-`. It does not end with a hyphen.

**C2-I-094** An inline extension is `:`, a name, `[`, content and the matching `]`. The name is a letter or `_`, then letters, digits, `_` and `-`, and the bracket is glued to it. The content is inline content. Unclosed, the form is text.

**C2-I-095** A mention, a tag and a symbol are atoms. An inline extension is a bracket construct.

What a mention or a tag links to and what a symbol name stands for are lookups of the application. An unknown symbol is written as the characters typed.

Example 82 (generated)

::: compare

```carve
@user and (@user.name). and mail a@b.com and x@user
```

```html
<p><span class="mention"><strong>@user</strong></span> and (<span class="mention"><strong>@user.name</strong></span>). and mail a@b.com and x@user</p>
```

:::

Example 83 (generated)

::: compare

```carve
color #fff, issue #123, C# and #tag/sub and #release-1.0.
```

```html
<p>color <span class="tag"><strong>#fff</strong></span>, issue #123, C# and <span class="tag"><strong>#tag</strong></span>/sub and <span class="tag"><strong>#release-1.0</strong></span>.</p>
```

:::

Example 84 (generated)

::: compare

```carve
at 10:30:00 and :+1: and :-: and :a b: and :note[a *b* c] and :1note[t] and :note[a
```

```html
<p>at 10:30:00 and :+1: and :-: and :a b: and <span class="ext-note">a <strong>b</strong> c</span> and :1note[t] and :note[a</p>
```

:::

The colon follows a letter, so no extension starts. The bracket pair is text.

The trailing hyphen is not part of the name, so the braced closer forms.

Example 85 (unverified)

::: compare

```carve
{-@user-} and @user-name and #tag- x
```

```html
<p><del><span class="mention"><strong>@user</strong></span></del> and <span class="mention"><strong>@user-name</strong></span> and <span class="tag"><strong>#tag</strong></span>- x</p>
```

:::

Example 86 (unverified)

::: compare

```carve
see config:items[0]
```

```html
<p>see config:items[0]</p>
```

:::

The boundary reads the Unicode class: a letter blocks the sigil, an underscore does not.

Example 87 (unverified)

::: compare

```carve
é@user and _@user
```

```html
<p>é@user and _<span class="mention"><strong>@user</strong></span></p>
```

:::

## Cross-references

**C2-I-096** `</#`, an id and `>` form a cross-reference. The id is one or more characters without `>`, a space and a line break. It is an atom.

**C2-I-097** The id is matched exactly, without case folding, once it and the ids it is matched against are normalized to NFC, so a precomposed and a decomposed character match and `ﬁ` and `fi` do not. An unresolved cross-reference is written as the characters typed.

The heading id is NFC (C2-H-144), and the reference, typed with `e` and a combining acute accent, matches it under NFC (C2-I-097).

Example 126 (unverified)

::: compare

```carve
# Café

See </#Café>.
```

```html
<section id="Café">
  <h1>Café</h1>
  <p>See <a href="#Café">Café</a>.</p>
</section>
```

:::

Example 88 (generated)

::: compare

```carve
{#intro}
# Intro

See </#intro> and </#Intro> and </#intro>{.c}
```

```html
<section id="intro">
  <h1>Intro</h1>
  <p>See <a href="#intro">Intro</a> and &lt;/#Intro&gt; and <a href="#intro">Intro</a>{.c}</p>
</section>
```

:::

## Abbreviations

An abbreviation definition is a block line (C2-B-084). Its effect is inline.

**C2-I-098** Each occurrence of a defined term in the ordinary text of the inline flow, at any depth of markup, is an abbreviation node that carries the expansion. One parse has a budget for these copies, with the numbers of C2-H-201: `derived_text_bytes` of `data/limits.json`, 1,000,000 bytes, or `derived_text_factor`, 8, times the length of the source it parsed in UTF-8 bytes, whichever is more. The nodes draw on it in document order, each costing the UTF-8 byte length of its expansion. A node whose cost is more than what remains draws nothing and carries no `expansion`; a later node that fits what remains still draws on it. The definition holds the expansion once (C2-A-079), and the parse reports nothing for a node without it. The budget is the parse's own: a render resolves the expansion again under the budget of C2-H-201.

**C2-I-099** A term matches only as a whole word: the character on each side is absent or is not a word character. An element edge is no boundary of its own. An atom is a boundary, and so are the edges of an inline footnote; a braced comment is transparent (C2-I-026), so in `HTML{%x%}s` the term does not match.

**Exception C2-I-100** A term does not match inside an atom, in a name or a target, in the source that an unresolved form renders, or in text that a resolution step generates.

Example 89 (generated)

::: compare

```carve
The HTML spec and HTMLs and XHTML and *HTML* and `HTML` and [HTML](/u).

*[HTML]: Hypertext Markup Language
```

```html
<p>The <abbr title="Hypertext Markup Language">HTML</abbr> spec and HTMLs and XHTML and <strong><abbr title="Hypertext Markup Language">HTML</abbr></strong> and <code>HTML</code> and <a href="/u"><abbr title="Hypertext Markup Language">HTML</abbr></a>.</p>
```

:::

## Citations

**C2-I-101** Citations are a Tier 2 extension and have no core form. In the core, a bracket pair whose content starts with an at-sign and a key, and that no link tail and no reference label follows, forms no construct, even when a link definition matches its folded content. The brackets are text and the key is read as a mention (C2-I-078, C2-I-090). With a tail or a label the pair is a link like any other (C2-I-066), so `[@a](/u)` is a link whose text holds a mention.

Example 90 (unverified)

::: compare

```carve
See [@doe2020] and [see @doe2020, p. 3; @roe].

[@doe2020]: /u
```

```html
<p>See [<span class="mention"><strong>@doe2020</strong></span>] and [see <span class="mention"><strong>@doe2020</strong></span>, p. 3; <span class="mention"><strong>@roe</strong></span>].</p>
```

:::

## Hard break and soft break

**C2-I-102** A backslash at the end of a line is a hard break, also where the space behind it that C2-I-002 keeps ends the line. So is a backslash at the end of the content, which includes the end of a table cell.

The space behind the backslash is kept by the strip (C2-I-002) and the two end the line, so they are a hard break, as is the backslash before the run of spaces and a tab on the second line (C2-I-011, C2-I-102).

Example 125 (unverified)

::: compare

```carve
> Roses are red,\ 
> violets are blue,\  	
> sugar is sweet.
```

```html
<blockquote><p>Roses are red,<br>
violets are blue,<br>
sugar is sweet.</p></blockquote>
```

:::

**C2-I-103** Every other line break inside a content is a soft break. The spaces and tabs before it and after it are dropped, so trailing spaces on a line never make a hard break.

Example 91 (generated)

::: compare

```carve
a\
b
```

```html
<p>a<br>
b</p>
```

:::

Example 92 (generated)

::: compare

```carve
line one
  line two
line three
```

```html
<p>line one
line two
line three</p>
```

:::

Example 93 (generated)

::: compare

```carve
| a\ | b |
```

```html
<table>
  <tbody>
    <tr><td>a<br>
</td><td>b</td></tr>
  </tbody>
</table>
```

:::

## Smart typography

Smart typography reads the text that the scan left as text and never reads inside an atom. Each match is a `smart_punctuation` node that keeps the typed characters in its `source` field (C2-A-098). The node is always built. The `smartTypography` option is a render option: it selects the glyph or the typed characters when the node is written (C2-H-078), and it does not change the tree. Where a clause below says that characters become a glyph, it names the glyph of that node.

**C2-I-104** A straight quote, `"` or `'`, is read from its two neighbors alone, as C2-I-117 defines them: the characters of the same text on each side of it. A mark of a delimiter, a bracket that belongs to a construct and an atom are no neighbors, and a braced comment is transparent (C2-I-026). A no-break space and a hard break are whitespace (C2-I-011, C2-I-102). A quote opens when the neighbor before it is whitespace or opening punctuation, or when it has none because the quote stands at the start of the content or directly behind an opening mark or bracket. Otherwise it closes, also directly behind a closing mark, a closing bracket or an atom. Opening punctuation is one of `(`, `[`, `{`, `=`, `:`, `“` and `‘`, or a straight quote that opens. No quote looks past its neighbors and none depends on another quote that is not its neighbor: quotes do not pair, so an opening quote without a closing quote stays an opening quote.

**Exception C2-I-105** A single quote before an ASCII digit closes, also where C2-I-104 would open it. A single quote between two word characters closes by C2-I-104. Both are the apostrophe, which has the kind and the glyph of a closing single quote.

Where the guess is wrong, the author types the curly character.

**C2-I-111** A run of two or more hyphens becomes dashes: a length divisible by three gives em dashes, otherwise a length divisible by two gives en dashes, otherwise one em dash followed by the rest under the same rule. The rule has no exception for the place of the run: `run --verbose` holds an en dash, and a command-line flag in prose is written in a code span or with an escape, `-\-verbose`. In 0.1 a run after whitespace and before a letter stayed as typed, and `{--}` spelled the en dash there; both are gone, and `{--}` is now an opening brace, an en dash and a closing brace.

**C2-I-114** Three dots become an ellipsis.

**C2-I-115** Six runs become arrows: `-->`, `<--`, `<-->`, `==>`, `<==` and `<=>`. The longest match is taken, among these runs and the runs of C2-I-117 together, so `<=>` is the arrow and not `<=` followed by `>`. The single forms `->`, `<-` and `=>` are text. Only replaced runs take part in the match: `->`, `<-` and `=>` take no characters, so `->=` holds the text `-` and the sign for `>=`.

**Exception C2-I-116** An arrow is matched before a hyphen run is split, and an arrow of hyphens needs its exact run: a longer hyphen run next to `<` or `>` is a dash run. An arrow of equals signs needs none: `===>` is `=` and the arrow `==>`.

**C2-I-117** `!=`, `<=` and `>=` become the comparison signs, `+-` becomes the plus-minus sign and `(tm)` the trademark sign. `+-` needs its exact run, as an arrow of hyphens does (C2-I-116): next to another `+` or `-` it is text, so `C++-style` stays as typed. `(c)` and `(r)` are text. For this test and for the exact run of an arrow of hyphens (C2-I-116), the neighbors are the characters of the same text on each side of the run: the mark of a delimiter, opening or closing, is never a neighbor, and a braced comment between two characters is transparent (C2-I-026). So `{++-+}` inserts a plus-minus sign.

Only the hyphen arrows need their exact run.

Example 122 (generated)

::: compare

```carve
a ===> b <==> c
```

```html
<p>a =⇒ b ⇐&gt; c</p>
```

:::

Example 94 (generated)

::: compare

```carve
"double" and 'single' and it's and '90s and "'nested'"
```

```html
<p>“double” and ‘single’ and it’s and ’90s and “‘nested’”</p>
```

:::

A quote after a space opens, whatever follows it, so a leading elision gets an opening quote. Where the apostrophe matters, the author types `’`.

Example 95 (unverified)

::: compare

```carve
'tis the season and 'em' and rock 'n' roll and 'I told 'em so,' he said, and ’tis.
```

```html
<p>‘tis the season and ‘em’ and rock ‘n’ roll and ‘I told ‘em so,’ he said, and ’tis.</p>
```

:::

A hyphen, a dash and a slash are no opening punctuation, so a quote behind one closes.

Example 96 (unverified)

::: compare

```carve
"Wait---" he said and he said---"Go" and "app/config/". and and/"or"
```

```html
<p>“Wait—” he said and he said—”Go” and “app/config/”. and and/”or”</p>
```

:::

Quotes do not pair, so a quote inside a quotation opens after a space as the first one did.

Example 97 (unverified)

::: compare

```carve
'I said 'yes' twice' and 'one' 'two'
```

```html
<p>‘I said ‘yes’ twice’ and ‘one’ ‘two’</p>
```

:::

The opening quote has no partner and stays an opening quote.

Example 98 (unverified)

::: compare

```carve
say 'word
```

```html
<p>say ‘word</p>
```

:::

Example 99 (generated)

::: compare

```carve
pages 1--10 and a---b and a----b and `git log --oneline` and x --- y
```

```html
<p>pages 1–10 and a—b and a––b and <code>git log --oneline</code> and x — y</p>
```

:::

An arrow needs its exact run. With three hyphens the run is an em dash and the angle bracket is text.

Example 100 (generated)

::: compare

```carve
a--->b and a<---b and a --> b
```

```html
<p>a—&gt;b and a&lt;—b and a → b</p>
```

:::

Example 101 (generated)

::: compare

```carve
x -- y and wait... really and a --> b <-- c <--> d ==> e <== f <=> g
```

```html
<p>x – y and wait… really and a → b ← c ↔ d ⇒ e ⇐ f ⇔ g</p>
```

:::

Example 102 (generated)

::: compare

```carve
a != b, a <= b, a >= b, 5 +- 1, Carve(tm), (c), x -> y, k => v
```

```html
<p>a ≠ b, a ≤ b, a ≥ b, 5 ± 1, Carve™, (c), x -&gt; y, k =&gt; v</p>
```

:::

Example 103 (generated)

::: compare

```carve
\"straight\" and `"code"` and [a](/u "it's")
```

```html
<p>"straight" and <code>"code"</code> and <a href="/u" title="it&apos;s">a</a></p>
```

:::

The marks of the insertions and deletions are no neighbors of the runs inside them, on either side (C2-I-117).

Example 111 (unverified)

::: compare

```carve
{--->-} and {-<---} and {++-1+} and {++-+} and C++-style and a{%x%}+-b
```

```html
<p><del>→</del> and <del>←</del> and <ins>±1</ins> and <ins>±</ins> and C++-style and a±b</p>
```

:::

A quote reads the same neighbors (C2-I-104). Behind the opening mark of a strong span a quote opens; behind a code span, a link or a closing mark it closes; a braced comment is transparent.

Example 121 (unverified)

::: compare

```carve
*'a'* and `x`'s and [b](/u)'s and {%c%}'d' and x{%c%}'s
```

```html
<p><strong>‘a’</strong> and <code>x</code>’s and <a href="/u">b</a>’s and ‘d’ and x’s</p>
```

:::

## The depth limit

**C2-I-118** Inline nesting stops at depth 200 in each inline content, whatever the blocks around it: the count starts at zero where the content starts (C2-I-120), and no block counts (C2-B-190). The depth of an opener is the number of entries open on the bracket stack and the delimiter stack together when the opener is read. Every opening bracket, `^[`, extension bracket and delimiter opener that was pushed and is not yet closed or removed counts one, whether or not it later forms a construct. An opener read while 200 entries are open is text: it is not pushed and takes part in no pairing, and the scan goes on behind it. The limit counts openers only: a delimiter that can close is tested as a closer first (C2-I-051), also while 200 entries are open, and closes as it would below the limit, inside its bracket (C2-I-007); only a delimiter that closes nothing and can open is an opener the limit makes text. A later closer pairs as if that opener were not there, so a closing bracket pairs with the nearest pushed bracket or is text when there is none, and no closing bracket carries an attribute block onto a construct that never formed. Nothing read after the opener changes the decision.

The limit applies to every opener that takes content: a bracket, a bare delimiter, a braced opener, `^[` and the bracket of an inline extension. Behind 197 quote marks, `- *[x](u)` forms its link, since the quotes, the list and the item do not count.

The quote does not count, so 200 superscripts nest inside it. The opener number 201 is text, and so is the last closer, which finds no open opener (C2-I-057).

Example 104 (unverified)

::: compare

```carve
> {^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^x^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}
```

```html
<blockquote><p><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup>{^x</sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup>^}</p></blockquote>
```

:::

The 199 superscripts and the star that never pairs are 200 open entries when the first `[` is read, so the link and the image are text (C2-I-118). With one superscript less both form.

Example 112 (unverified)

::: compare

```carve
{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^*[x](u) ![y](v)^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}
```

```html
<p><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup>*[x](u) ![y](v)</sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></p>
```

:::

The 199 open brackets and the bracket of the extension are 200 open entries. The next `[` is text and pairs with nothing, so the first `]` closes the extension (C2-I-118).

Example 113 (unverified)

::: compare

```carve
[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[:n[[]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]
```

```html
<p>[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[<span class="ext-n">[</span>]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]</p>
```

:::

## The fallback rule

**C2-I-119** A form with a closer opens only when its closer is found in the same content. A failed opener is literal text, and the scan goes on directly behind it. An opening brace that fails as an attribute block is first tried as the later braced forms (C2-I-043) and is text only when it opens none of them.

**C2-I-120** No inline form crosses the end of its content: a table cell and each fragment of a continuation row (C2-B-184), a heading, a term, a caption and a paragraph each end every form that is open in them.

| Form that fails | What is text |
|---|---|
| unclosed code span, literal-text span or math span | the backtick run and a `!`, `$` or `$$` glued before it (C2-I-017) |
| unclosed bracket | the bracket (C2-I-006) |
| bracket pair with a broken link tail | the pair and the tail (C2-I-069) |
| unclosed inline footnote | `^[` (C2-I-089) |
| unclosed inline extension | the sigil, the name and the bracket (C2-I-094) |
| unclosed or invalid attribute block | the opening brace is tried as a braced form (C2-I-043), then is text if none matches (C2-I-034) |
| unclosed bare delimiter | the delimiter (C2-I-119) |
| unclosed braced opener | the brace and its mark (C2-I-060) |
| unclosed braced comment or editorial comment | the brace and its mark (C2-I-043) |
| unclosed autolink or cross-reference | the angle bracket (C2-I-073, C2-I-096) |
| opener past the depth limit | the opener (C2-I-118) |

Example 105 (generated)

::: compare

```carve
[open and (x and {*y and {% z and ^[w and :ext[v and <http://u
```

```html
<p>[open and (x and {*y and {% z and ^[w and :ext[v and &lt;http://u</p>
```

:::

Example 106 (generated)

::: compare

```carve
later markup still works: [a and *b* and {=c and `d`
```

```html
<p>later markup still works: [a and <strong>b</strong> and {=c and <code>d</code></p>
```

:::

## The display math line

The block chapter makes a paragraph a math block when it holds exactly one display math span (C2-B-158). That test reads a shape, not parsed inline content.

**C2-I-121** A display math span is `$$`, a backtick run, the content and a closing backtick run of the opener's length (C2-I-019, C2-I-015). A line consists of exactly one display math span when it starts with `$$` and the opening run, the closing run stands on the same line, and nothing follows it but attribute blocks glued to it and trailing whitespace.

Example 107 (generated)

::: compare

```carve
$$`E = mc^2`

text $$`E = mc^2`
```

```html
<p><span class="math display" role="math">\[E = mc^2\]</span></p>
<p>text <span class="math display" role="math">\[E = mc^2\]</span></p>
```

:::

## Counts

There is no fixed budget for the inline chapter.

| Construct | Clauses | Exceptions | Examples generated | Examples unverified |
|---|---|---|---|---|
| Preliminaries | 10 | 0 | 3 | 4 |
| Backslash escapes | 4 | 0 | 2 | 0 |
| Code spans | 5 | 0 | 2 | 2 |
| Math spans | 1 | 0 | 1 | 1 |
| Raw inline | 1 | 0 | 2 | 1 |
| Comments | 4 | 1 | 4 | 2 |
| Attribute blocks | 12 | 2 | 7 | 5 |
| The opening brace | 1 | 0 | 3 | 1 |
| Emphasis and strong | 8 | 3 | 7 | 6 |
| Braced delimiters | 9 | 1 | 6 | 4 |
| Spans | 1 | 0 | 2 | 0 |
| Links and images | 12 | 1 | 6 | 2 |
| Reference resolution | 13 | 3 | 5 | 17 |
| Footnotes | 3 | 0 | 1 | 2 |
| Mention, tag, symbol and inline extension | 6 | 0 | 3 | 3 |
| Cross-references | 2 | 0 | 1 | 1 |
| Abbreviations | 3 | 1 | 1 | 0 |
| Citations | 1 | 0 | 0 | 1 |
| Hard break and soft break | 2 | 0 | 3 | 1 |
| Smart typography | 7 | 2 | 7 | 6 |
| The depth limit | 1 | 0 | 0 | 3 |
| The fallback rule | 2 | 0 | 2 | 0 |
| The display math line | 1 | 0 | 1 | 0 |
| **Total** | **109** | **14** | **69** | **62** |

The chapter has 109 clauses, 14 of them exceptions, and 131 examples. The clause count includes the exceptions. Freeze candidate 4 deleted C2-I-027, C2-I-037, C2-I-038, C2-I-044, C2-I-054 and C2-I-065, whose general rules give the same result; their ids are not reused. The reduction of 17 November 2026 deleted C2-I-022, C2-I-041 and C2-I-045, whose rule other clauses state or give; their ids are not reused.

For comparison, counted with the rubric of the inline review (one atomic statement per rule):

| Document | Inline rules | Exceptions |
|---|---|---|
| Carve 0.1 | about 204 | 30 |
| CommonMark 0.31.2 | about 80 | 6 |
| Djot | about 50 | 2 |
| This chapter | 119 | 22 |

The numbers are not like for like. Several clauses here join two or three atomic statements, as the first draft of the block chapter did, so a strict recount lands higher. Carve also has about 35 inline constructs against 20 in Djot and 11 in CommonMark.

## Not covered

The citation syntax itself is defined with its extension. The element a span becomes for the keys `kbd`, `abbr` and `time`, footnote numbering, the links of mentions and tags, the `mailto:` link of an email autolink, the symbol table and URL filtering belong to the HTML rendering document. That a line of a line block keeps its leading spaces is a block rule.
