# Carve 0.2 Syntax: inline content

Status: first draft on `next2`. Nothing in this chapter is implemented yet.

This chapter defines how inline content becomes inline nodes. Block structure, HTML rendering, the tree and the writer have their own documents. Where a clause states rendered output, it does so because the output is the only visible sign of an inline decision.

Conventions:

- A clause is a paragraph that starts with an id of the form `C2-I-nnn`. The prefix is new in 0.2. No 0.1 clause id is reused. Ids of the form `C2-B-nnn` name clauses of the block chapter.
- A clause that starts with the word "Exception" is a carve-out from a more general clause, or a named interaction between two constructs. Exceptions are counted at the end of the chapter.
- A clause that ends with "(carried over from 0.1)" restates a 0.1 definition that 0.2 does not change. Every other clause is a 0.2 decision.
- Each example is a `compare` container that holds the Carve input and the expected HTML. The line above it gives its number and its status. *Generated* means the HTML was produced by the 0.1 reference engine, because the 0.2 rule equals 0.1 behavior for that input. *Unverified* means the HTML was written by hand from the clauses and has not been run through any engine.
- "Lint" and "diagnostic" name reports. They never change the nodes.

## Preliminaries

Terms:

- *Leaf* and *container* have the meaning of the block chapter. Inline content is read in a paragraph, a heading, a term, a caption, a line of a line block and each cell of a table row.
- The *content* is the text of one of these, as the block pass left it. A table row is split into cells first, and each cell has a content of its own. Every rule below works on one content.
- A *form* is one spelling of a construct, such as the braced form of emphasis. The `form` field of a reference node is written as a code word.
- A *word character* is a Unicode letter or number (general category L or N).
- *Whitespace* is a space, a tab or a line break. The start and the end of the content count as whitespace.
- Two things are *glued* when no character stands between them.
- An *atom* is a form whose characters are taken as one token. The atoms are listed under C2-I-005.
- A *bracket construct* is a form built on a bracket pair: a span, a link, an image, a reference, an inline footnote, an inline extension.
- A *host* is an inline node that an attribute block can attach to (C2-I-036). The program that embeds Carve is called the application.

**C2-I-001** Inline content is parsed one content at a time, after the block pass has settled every line of the document: no block decision depends on inline content, and every definition and heading is known when the first content is read.

**C2-I-002** A content is the list of its source spans in order, one per line, without the prefixes of its containers, without markers and without indent. Spaces and tabs at the end of a line of the content are not part of it, on the last line as on the others; a space that a backslash escapes is not such a space (C2-I-011). In a table cell the padding before the closing pipe is removed first, so a backslash that stands before that padding ends the cell and is a hard break (C2-I-102); a no-break space at the end of a cell is a backslash and a space followed by the padding.

**C2-I-003** Two neighboring spans are joined by one line break.

**C2-I-004** The content is read in one left-to-right scan with four steps in a fixed order of precedence: atoms, the bracket stack, the delimiter stack, attachment.

**C2-I-005** At each position the scan tries the atoms first. An atom that matches is taken whole: no bracket, delimiter or other atom opens, closes or is matched inside it, and of two atoms the one that starts first wins.

The atoms, each defined in its own section:

- a backslash escape;
- a code span, with its `!`, `$` or `$$` prefix and with a raw-format marker;
- an autolink and a cross-reference;
- a valid attribute block;
- a braced comment, an editorial comment and a line comment;
- the braced en dash;
- a link tail, which is the parenthesized destination and title glued to the closing bracket of a pair;
- a mention, a tag and a symbol.

**C2-I-006** An opening bracket is pushed on the bracket stack. A closing bracket pairs with the nearest open one, and what is glued to the closing bracket decides the construct. A pair that forms no construct is plain text: its content is read as inline content all the same, and it bounds nothing. A closing bracket with no open bracket is text.

**C2-I-007** A bracket construct is settled before delimiters pair: a delimiter inside its content pairs only inside it, and a delimiter outside it pairs only outside it.

**C2-I-008** Emphasis, strong and the braced forms pair on one delimiter stack (C2-I-051, C2-I-059).

**C2-I-009** Attachment comes last: an attribute block attaches only to a host that has already formed.

The backtick opens a code span before the star can close, so the strong span never forms.

The block pass comes first: the blank line ends the paragraph, and neither the star nor the code span reaches across it.

Example 1 (generated)

::: compare

```carve
*a

b* and `c

d`
```

```html
<p>*a</p>
<p>b* and <code>c</code></p>
<p>d<code></code></p>
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
*a `b* c
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

## Backslash escapes

**C2-I-010** A backslash before an ASCII punctuation character makes that character literal text: it opens, closes and starts nothing. (carried over from 0.1)

**C2-I-011** A backslash before a space is a no-break space. (carried over from 0.1)

**C2-I-012** A backslash before any other character is a literal backslash, except at the end of a line, where it is a hard break (C2-I-102). (carried over from 0.1)

**C2-I-013** Escapes are not read inside a code span, an autolink, a cross-reference, a comment or an editorial comment. A link destination reads only the escaped parenthesis and the escaped backslash. A link title and a quoted attribute value read escapes. (carried over from 0.1)

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

**C2-I-014** A run of one or more backticks opens a code span. The opener is the whole run. (carried over from 0.1)

**C2-I-015** The span closes at the next backtick run of exactly the opener's length. Everything between is code: no escape and no other form is read there, and a line break is content. (carried over from 0.1)

**C2-I-016** When the content of a closed span starts and ends with a space and holds a character that is not a space, one space is removed from each end. Content of spaces only is kept as it is. (carried over from 0.1)

**Exception C2-I-017** A code span never fails. With no closing run in the content it runs to the end of the content, and trailing whitespace is dropped.

**C2-I-018** A `!` glued before the opening run makes a literal-text span: its content is written as escaped text with no code element. With an attribute block it is written as a span element that carries the attributes.

A literal `!` before a code span is written with a backslash.

Example 8 (generated)

::: compare

```carve
`code` and `` a ` b `` and ` x ` and `*a*`
```

```html
<p><code>code</code> and <code>a ` b</code> and <code>x</code> and <code>*a*</code></p>
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

Example 10 (generated)

::: compare

```carve
see `unclosed *x* and [y](/u)
```

```html
<p>see <code>unclosed *x* and [y](/u)</code></p>
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

**C2-I-019** A `$` glued before a code span makes inline math, and `$$` makes display math. The content is the span's verbatim text. A `$` with no backtick run after it is text. (carried over from 0.1)

**C2-I-020** A math span follows C2-I-017: unclosed, it runs to the end of its content.

Example 12 (generated)

::: compare

```carve
$`x^2` and $$`E = mc^2` and $5 and $`x`{.c}
```

```html
<p><span class="math inline" role="math">\(x^2\)</span> and <span class="math display" role="math">\[E = mc^2\]</span> and $5 and <span class="math inline c" role="math">\(x\)</span></p>
```

:::

Example 13 (generated)

::: compare

```carve
the sum $`a + b
```

```html
<p>the sum <span class="math inline" role="math">\(a + b\)</span></p>
```

:::

## Raw inline

**C2-I-021** A closed code span with `{=name}` glued to it is raw inline. The name is a letter or `_`, then letters, digits, `_` and `-`. The content is written unescaped to the output format of that name and dropped for every other format. (carried over from 0.1)

**Exception C2-I-022** Only a plain code span takes the marker. After a literal-text span or a math span, and anywhere else, `{=name}` is not a raw marker, and `{=` is read as a braced opener (C2-I-043).

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

**C2-I-023** `%%` at the start of a line of the content or after whitespace starts a line comment. It runs to the end of that line and renders nothing, and the spaces before it are dropped with it. Elsewhere `%%` is text. A no-break space written as a backslash and a space counts as whitespace for this test.

**C2-I-024** A line comment takes the rest of its line with every closer on it. A form that is open at the comment can only close on a later line.

Inside an atom that started earlier on the line, `%%` is content (C2-I-005): in a code span, in a link tail and in a quoted attribute value. The limits in a table row, in an opaque body such as a code fence, and in a line block are block clauses (C2-B-134, C2-B-135, C2-B-144).

**C2-I-025** `{%` opens a braced comment that closes at the first `%}` in the content. It may cross line breaks, it does not nest, and it renders nothing. (carried over from 0.1)

**Exception C2-I-026** A braced comment counts as nothing for its neighbors: the characters on its two sides are tested as if they were glued, for delimiter conditions (C2-I-047), for the sigil boundary (C2-I-090) and for typography. It is not a host, and an attribute block behind it attaches to nothing. (carried over from 0.1)

**Exception C2-I-027** Block rules classify lines first: a braced comment whose closer stands behind an interrupter line is unclosed and stays text (C2-B-141). Lint reports it as `unclosed-braced-comment`.

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

The comment takes the closing bracket and the link tail, so the bracket is text.

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

**C2-I-036** A valid attribute block attaches when it is glued to the end of a formed host, and is literal text otherwise. The hosts are: a span, a link, an image, an autolink, a reference, a code span, a literal-text span, a math span, a footnote reference, an inline footnote, a symbol, an inline extension, and every closed emphasis, strong or braced span.

**C2-I-037** A word is not a host. Neither is a mention, a tag, a cross-reference, a comment, an editorial comment, raw inline, a quote or a typography replacement.

**C2-I-038** A reference is a host whether or not its label resolves (C2-I-075).

**C2-I-039** Glued attribute blocks after one host merge, in the order written: classes add up, and a later id or key replaces an earlier one of the same name. This is the inline side of C2-B-094.

**Exception C2-I-040** The block with no part, `{}` or braces around spaces, is valid only in the glued run after a bracket pair, where it adds nothing: `[a]{}` is a span with no attributes. Everywhere else it is text. It is read only behind a pair that is a span, also behind another block of that span; behind a link, an inline footnote or an inline extension it is text.

**C2-I-041** The order inside a block is fixed in the tree and in the output: the id, then the classes, then the language, then the keys, classes and keys each as written (C2-B-098). The written order of the parts is not kept.

**C2-I-042** A key named `id` or `class`, in any ASCII letter case, folds into the id or into the classes when the block is parsed, and of several ids the last one wins (C2-B-099). The value of a `class` key is split at runs of spaces and tabs, each piece is one class at the place of the key, and an empty value adds none.

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

**C2-I-043** At an opening brace the scan takes the first of these that matches. One: a valid attribute block. Two: `{%`, a braced comment, when `%}` follows in the content. Three: `{#`, an editorial comment, when `#}` follows in the content with at least one character between. Four: `{--}`, the en dash. Five: `{` followed by one of `*`, `/`, `_`, `~`, `=`, `+`, `-`, `^` or `,`, a braced opener on the delimiter stack.

**C2-I-044** A brace that starts none of these is text.

**Exception C2-I-045** Glued to a closed code span, `{=name}` is tried together with the attribute block, before the highlight opener (C2-I-021).

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
a {=a}b=} c and {--} and {---} and [s]{=x=}
```

```html
<p>a <mark>a}b</mark> c and – and <del>-</del> and [s]<mark>x</mark></p>
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

**C2-I-047** A delimiter can open when the character before it is not a word character and the character after it is not whitespace. A bare underscore is ordinary punctuation for this test and for C2-I-048. (carried over from 0.1)

**C2-I-048** A delimiter can close when the character before it is not whitespace and the character after it is not a word character. (carried over from 0.1)

**Exception C2-I-049** A run of two or more of one bare delimiter character is not a delimiter, for the slash as for the star: each character in it is text. `**bold**` is literal, and lint reports it as `markdown-strong-double-star`.

**Exception C2-I-050** A delimiter is a whole character: a bare delimiter, or the mark of a braced opener or of a comment opener, that is followed by a combining mark (category Mn, Mc or Me), a variation selector or a zero-width joiner is text. (carried over from 0.1)

**C2-I-051** A delimiter that can close, with an open entry of its kind on the stack, closes the nearest such entry. Every entry above it is removed, and its characters are text. Otherwise, a delimiter that can open is pushed, also while an entry of its kind is open, so a kind nests in itself. Otherwise it is text.

**C2-I-052** There is no combined token for strong emphasis. Each order of the two delimiters is plain nesting, in the order written.

**Exception C2-I-053** A bare span that holds its own delimiter character between two word characters does not form: its entry leaves the stack, every other entry stays, and both delimiters are text. Only the span's own content counts, not the inside of an atom, of a bracket construct or of a braced span. (carried over from 0.1)

**C2-I-054** An opener with no closer in its content is text.

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
a/b testing, 2 * 3 * 4, a*b*c, x^2, $5, --flag, 50%, a = b = c
```

```html
<p>a/b testing, 2 * 3 * 4, a*b*c, x^2, $5, --flag, 50%, a = b = c</p>
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

**C2-I-060** A braced opener that finds no closer, or that is removed, is text: its two characters are literal, the scan goes on behind them, and the mark is not read again as a bare delimiter.

**Exception C2-I-061** A braced opener glued to its own closer forms nothing, and both tokens are text. (carried over from 0.1)

**C2-I-062** A replacement is a deletion with an insertion glued to it. It is two nodes. There is no arrow form: `~>` is text, and the braced tilde is always strike.

**C2-I-063** `{#` opens an editorial comment that closes at the first `#}` in the content. Its content is literal: no escape and no form is read in it, and it holds at least one character. It is an atom and not a host. The first `#}` decides: where it stands directly behind `{#`, there is no comment and the opener is text. (carried over from 0.1)

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

**C2-I-065** A bracket pair followed by anything else that forms no link, image or reference is text (C2-I-006).

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

**C2-I-067** A destination is a run of characters without whitespace, in which parentheses are balanced or escaped. It may be empty. (carried over from 0.1)

**C2-I-068** A title follows the destination after exactly one space. It stands in double quotes, which is the canonical form, or in single quotes, which the formatter rewrites. A backslash escapes the quote in it, and spaces may follow it. (carried over from 0.1)

**C2-I-069** The link tail is an atom and stands on one line. It is read only glued to the closing bracket of a pair: with no open bracket, no destination is read. A tail with a space in the destination, a broken title or a line break is no tail: the bracket pair is text and the parenthesis is text.

**C2-I-070** Link text is inline content and may cross line breaks.

**Exception C2-I-071** Links do not nest: a link inside link text renders as its own content, and the outer link keeps its destination. The inner link stays a node in the tree (C2-A-111). An image and a span inside link text stay. (carried over from 0.1)

**C2-I-072** A bracket pair with `[label]` glued to it is a full reference. With `[]` glued to it, it is a collapsed reference, whose label is the source of its own text. There is no shortcut form: a bare `[label]` is text. A collapsed reference whose own text folds to an empty key (C2-I-079) is no reference: its brackets are text. (carried over from 0.1)

**C2-I-073** `<`, a URL or an email address, and `>` form an autolink. A URL is a scheme (a letter, then letters, digits, `+`, `-` and `.`), a colon and one or more URL characters. An email address is a local part, an at-sign, a domain, a dot and letters. The visible text is the body as written. It is an atom. (carried over from 0.1)

**C2-I-074** A `!` glued before a bracket pair that forms an inline link or a reference makes an image. Its alt text is the source of the bracket content, not parsed. Before any other bracket pair the `!` is text. (carried over from 0.1)

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

## Reference resolution

**C2-I-075** A reference is a node whether or not its label resolves. The scan does not read the definitions.

**C2-I-076** A reference label is the run of characters up to the next `]` that no backslash escapes. It is taken whole: no atom, bracket, delimiter or sigil form is read in it, a code span included, and its source is its key (C2-I-079). The line comment of C2-I-077 is the one exception.

**Exception C2-I-077** Atoms are read first, so a line comment that starts inside a label takes the rest of its line (C2-I-024): the label is unclosed and the brackets are text. Lint reports it as `comment-in-reference-label`.

**Exception C2-I-078** A label whose first character is an at-sign is not a reference label. The spelling is reserved for citations. A label whose first character is a caret is not a reference label either: `[^n]` behind a bracket pair is a footnote reference (C2-I-087), so `[x][^n]` is the text `[x]` and a footnote reference. The 0.1 engine read it as a full reference. The first character is that of the label's source, before folding: `[a][ @b]` is a reference with the key `@b`. (carried over from 0.1)

**C2-I-079** The lookup key of a label is its source text with every run of spaces, tabs and one line break folded to one space and with the ends trimmed. Case matters, and a backslash stays in the key, also one that escapes a bracket. Reference labels, footnote labels and definition labels share this rule. A label whose key is empty after folding, one that holds only spaces, tabs or a line break, is no label: the brackets are text.

**C2-I-080** A label may wrap: a line break with the whitespace around it folds to one space. A blank line ends the content and the label with it. A definition line stays on one line.

**C2-I-081** The key of a link reference is looked up in the link definitions, then in the headings, for the full and for the collapsed form.

**C2-I-082** The attributes of a link definition merge into every reference that resolves to it: the classes of the definition and of the reference add up, the definition's first, and the reference's own id and keys win over the definition's.

**Exception C2-I-083** The heading lookup is for link references only: an image reference that matches no definition is unresolved.

**C2-I-084** A heading matches when the key equals the folded source of the heading's text or its plain text without markup. The match is case-sensitive, and the first matching heading in the document wins. The reference then links to that heading's id. A heading that has no id, which is one without an authored id while `headingIds` is `off` (C2-H-022), is no target: the lookup passes over it, and a reference that finds no other heading is unresolved.

**C2-I-085** An unresolved reference is still a reference node. It renders its brackets and its label as literal text and its children as HTML: an opening bracket, the rendered children, a closing bracket, then the label in brackets, or an empty bracket pair for the collapsed form. No part is respelled as source. The label is written from the key, so a label that wrapped has one space where the line break was. An attached attribute block is written behind it as text, in the fixed order (C2-I-041).

**C2-I-086** A footnote reference and an inline footnote inside an unresolved reference are ordinary footnotes: each takes its number and makes its note.

Example 67 (generated)

::: compare

```carve
[text][ref] and [ref][] and [ref] and ![img][ref]

[ref]: /u "T"
```

```html
<p><a href="/u" title="T">text</a> and <a href="/u" title="T">ref</a> and [ref] and <img src="/u" alt="img" title="T"></p>
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

## Footnotes

**C2-I-087** `[^`, a label and `]` form a footnote reference. The label is one or more characters up to the next `]`, its key follows C2-I-079, and it may wrap (C2-I-080). The label follows C2-I-076 and C2-I-077. A footnote reference takes no link tail and no reference label: `(` or `[` directly behind it starts ordinary text or the next construct, so `[^n](/u)` is a footnote reference and the text `(/u)`. Where the label is none (C2-I-079), the `[` is text and opens no bracket pair, so a link tail behind it forms nothing.

**C2-I-088** A footnote reference with no definition renders its brackets, the caret and its label as literal text (C2-I-085).

**C2-I-089** `^[` opens an inline footnote that closes at its matching bracket on the bracket stack. Its content is inline content. Unclosed, the two characters are text. (carried over from 0.1)

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

**C2-I-092** The name of a mention or a tag is one or more runs of letters, digits, `_` and `-`, joined by single dots, and holds at least one letter. It does not end with a dot or a hyphen: a trailing one is text behind the name.

**C2-I-093** A symbol is `:`, a name and `:`. The name is a letter, a digit, `+` or `-`, then letters, digits, `_`, `+` and `-`. It does not end with a hyphen.

**C2-I-094** An inline extension is `:`, a name, `[`, content and the matching `]`. The name is a letter or `_`, then letters, digits, `_` and `-`, and the bracket is glued to it. The content is inline content. Unclosed, the form is text. (carried over from 0.1)

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

**C2-I-096** `</#`, an id and `>` form a cross-reference. The id is one or more characters without `>`, a space and a line break. It is an atom and not a host. (carried over from 0.1)

**C2-I-097** The id is matched exactly, without case folding. An unresolved cross-reference is written as the characters typed. (carried over from 0.1)

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

**C2-I-098** Each occurrence of a defined term in the ordinary text of the inline flow, at any depth of markup, is an abbreviation node that carries the expansion. (carried over from 0.1)

**C2-I-099** A term matches only as a whole word: the character on each side is absent or is not a word character. An element edge is no boundary of its own. (carried over from 0.1)

**Exception C2-I-100** A term does not match inside an atom, in a name or a target, in the source that an unresolved form renders, or in text that a resolution step generates. (carried over from 0.1)

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

**C2-I-101** Citations are a Tier 2 extension and have no core form. In the core, a bracket pair whose content starts with an at-sign and a key, and that no link tail and no reference label follows, forms no construct: the brackets are text and the key is read as a mention (C2-I-078, C2-I-090). With a tail or a label the pair is a link like any other (C2-I-066), so `[@a](/u)` is a link whose text holds a mention. (carried over from 0.1)

Example 90 (generated)

::: compare

```carve
See [@doe2020] and [see @doe2020, p. 3; @roe].
```

```html
<p>See [<span class="mention"><strong>@doe2020</strong></span>] and [see <span class="mention"><strong>@doe2020</strong></span>, p. 3; <span class="mention"><strong>@roe</strong></span>].</p>
```

:::

## Hard break and soft break

**C2-I-102** A backslash at the end of a line is a hard break. So is a backslash at the end of the content, which includes the end of a table cell. (carried over from 0.1)

**C2-I-103** Every other line break inside a content is a soft break. The spaces and tabs before it and after it are dropped, so trailing spaces on a line never make a hard break. (carried over from 0.1)

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

**C2-I-104** A straight quote opens at the start of content, after whitespace or a no-break space, after one of `(`, `[`, `{`, `=`, `:`, `/` or a hyphen or dash, and after an opening curly quote. Otherwise it closes. The start of a span's or a link's content is a start of content, and the end of a closed inline node counts as a word character. The rule holds for every node with inline content: emphasis, strong, the braced forms, a span, a link, an inline footnote and an inline extension. (carried over from 0.1)

**Exception C2-I-105** A single quote before an ASCII digit is an apostrophe. (carried over from 0.1)

**Exception C2-I-106** After a hyphen, a dash or a slash, a quote closes when the next character is absent, whitespace or one of `"`, `'`, `.`, `,`, `;`, `:`, `!`, `?`, `)` and `]`. The next character is read from the source as written, so the backslash of a hard break is that character; only a braced comment is skipped (C2-I-026). (carried over from 0.1)

**Exception C2-I-107** A single quote that would open and is followed by one of the words `tis`, `tisn`, `twas`, `twasn`, `twere`, `twill`, `twould`, `em`, `cause`, `til`, `n` and `bout`, in any letter case, is an apostrophe. The word is the run of ASCII letters behind the quote and ends where they end: a digit or punctuation may follow it, a letter outside ASCII may not.

**Exception C2-I-108** When that word is followed by a single quote and then by a character that is neither a letter nor a number, the word is quoted and the first quote opens.

**Exception C2-I-109** Single quotes do not nest. An opening single quote starts a run when none is open, and a closing single quote that does not stand after whitespace or inside a word ends it. While a run is open, a single quote that would open before a letter or a number is an apostrophe. The state is kept per content, and an inline footnote has its own. (carried over from 0.1)

**C2-I-110** A quote that was emitted is never changed: an opening single quote stays an opening quote when no closing quote follows.

Where the guess is wrong, the author types the curly character.

**C2-I-111** A run of two or more hyphens becomes dashes: a length divisible by three gives em dashes, otherwise a length divisible by two gives en dashes, otherwise one em dash followed by the rest under the same rule.

**Exception C2-I-112** A hyphen run after whitespace, or after an opening parenthesis or quote that itself follows whitespace, and before a character that is not whitespace is a command-line flag and stays as typed. An escaped parenthesis or quote is not such a character. (carried over from 0.1)

**C2-I-113** `{--}` is an en dash. It is the spelling for the position that C2-I-112 keeps literal.

**C2-I-114** Three dots become an ellipsis. (carried over from 0.1)

**C2-I-115** Six runs become arrows: `-->`, `<--`, `<-->`, `==>`, `<==` and `<=>`. The longest match is taken, among these runs and the runs of C2-I-117 together, so `<=>` is the arrow and not `<=` followed by `>`. The single forms `->`, `<-` and `=>` are text. (carried over from 0.1)

**Exception C2-I-116** An arrow is matched before a hyphen run is split, and it needs its exact run: a longer hyphen run next to `<` or `>` is a dash run. (carried over from 0.1)

**C2-I-117** `!=`, `<=` and `>=` become the comparison signs, `+-` becomes the plus-minus sign and `(tm)` the trademark sign. `(c)` and `(r)` are text. (carried over from 0.1)

Example 94 (generated)

::: compare

```carve
"double" and 'single' and it's and '90s and "'nested'"
```

```html
<p>“double” and ‘single’ and it’s and ’90s and “‘nested’”</p>
```

:::

Example 95 (generated)

::: compare

```carve
'tis the season and 'em' and rock 'n' roll and 'I told 'em so,' he said.
```

```html
<p>’tis the season and ‘em’ and rock ‘n’ roll and ‘I told ’em so,’ he said.</p>
```

:::

Example 96 (generated)

::: compare

```carve
"Wait---" he said and he said---"Go" and "app/config/". and and/"or"
```

```html
<p>“Wait—” he said and he said—“Go” and “app/config/”. and and/“or”</p>
```

:::

The opening quote has no partner and stays an opening quote.

Example 97 (generated)

::: compare

```carve
'I said 'yes' twice' and 'one' 'two'
```

```html
<p>‘I said ’yes’ twice’ and ‘one’ ‘two’</p>
```

:::

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
pages 1--10 and a---b and a----b and git log --oneline and x --- y
```

```html
<p>pages 1–10 and a—b and a––b and git log --oneline and x — y</p>
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
x {--}y and wait... really and a --> b <-- c <--> d ==> e <== f <=> g
```

```html
<p>x –y and wait… really and a → b ← c ↔ d ⇒ e ⇐ f ⇔ g</p>
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

## The depth cap

**C2-I-118** Nesting stops at depth 200, blocks and inlines together, counted as in C2-B-190: each open quote, list, item, description, footnote body and div counts one, each open inline node counts one, 200 in total. An opener that would pass the cap is plain text: the scan goes on behind it and reads the following content as usual. An open bracket counts one while it is open, whether or not its pair later forms a construct: an opening bracket is text when the block depth and the open brackets reach the cap. When delimiters pair, a delimiter opener is text when the block depth, the open delimiter entries and the bracket constructs around it reach the cap, and a bracket construct that would lie past the cap is text with its brackets, its tail or label as typed.

The cap applies to every opener that takes content: a bracket, a bare delimiter, a braced opener, `^[` and the bracket of an inline extension.

The paragraph has no container, so 200 superscripts nest. The opener number 201 is text, and so is the last closer, which finds no open opener (C2-I-057).

Example 104 (unverified)

::: compare

```carve
{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^{^x^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}^}
```

```html
<p><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup><sup>{^x</sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup></sup>^}</p>
```

:::

## The fallback rule

**C2-I-119** A form with a closer opens only when its closer is found in the same content. A failed opener is literal text, and the scan goes on directly behind it. An opening brace that fails as an attribute block is first tried as the later braced forms (C2-I-043) and is text only when it opens none of them.

**C2-I-120** No inline form crosses the end of its content: a table cell, a heading, a term, a caption and a paragraph each end every form that is open in them.

The two forms that never fail are the code span and the math span (C2-I-017, C2-I-020).

| Form that fails | What is text |
|---|---|
| unclosed bracket | the bracket (C2-I-006) |
| bracket pair with a broken link tail | the pair and the tail (C2-I-069) |
| unclosed inline footnote | `^[` (C2-I-089) |
| unclosed inline extension | the sigil, the name and the bracket (C2-I-094) |
| unclosed or invalid attribute block | the whole run (C2-I-034) |
| unclosed bare delimiter | the delimiter (C2-I-054) |
| unclosed braced opener | the brace and its mark (C2-I-060) |
| unclosed braced comment or editorial comment | the brace and its mark (C2-I-043) |
| unclosed autolink or cross-reference | the angle bracket (C2-I-073, C2-I-096) |
| opener past the depth cap | the opener (C2-I-118) |

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
| Preliminaries | 9 | 0 | 4 | 1 |
| Backslash escapes | 4 | 0 | 2 | 0 |
| Code spans | 5 | 1 | 4 | 0 |
| Math spans | 2 | 0 | 2 | 0 |
| Raw inline | 2 | 1 | 2 | 0 |
| Comments | 5 | 2 | 4 | 1 |
| Attribute blocks | 15 | 2 | 6 | 5 |
| The opening brace | 3 | 1 | 3 | 1 |
| Emphasis and strong | 9 | 3 | 7 | 6 |
| Braced delimiters | 9 | 1 | 6 | 4 |
| Spans | 2 | 0 | 2 | 0 |
| Links and images | 9 | 1 | 5 | 1 |
| Reference resolution | 12 | 3 | 6 | 7 |
| Footnotes | 3 | 0 | 1 | 1 |
| Mention, tag, symbol and inline extension | 6 | 0 | 3 | 3 |
| Cross-references | 2 | 0 | 1 | 0 |
| Abbreviations | 3 | 1 | 1 | 0 |
| Citations | 1 | 0 | 1 | 0 |
| Hard break and soft break | 2 | 0 | 3 | 0 |
| Smart typography | 14 | 7 | 9 | 1 |
| The depth cap | 1 | 0 | 0 | 1 |
| The fallback rule | 2 | 0 | 2 | 0 |
| The display math line | 1 | 0 | 1 | 0 |
| **Total** | **121** | **23** | **75** | **32** |

The chapter has 121 clauses, 23 of them exceptions, and 107 examples. The clause count includes the exceptions.

For comparison, counted with the rubric of the inline review (one atomic statement per rule):

| Document | Inline rules | Exceptions |
|---|---|---|
| Carve 0.1 | about 204 | 30 |
| CommonMark 0.31.2 | about 80 | 6 |
| Djot | about 50 | 2 |
| This chapter | 121 | 23 |

The numbers are not like for like. Several clauses here join two or three atomic statements, as the first draft of the block chapter did, so a strict recount lands higher. Carve also has about 35 inline constructs against 20 in Djot and 11 in CommonMark.

## Not covered

The citation syntax itself is defined with its extension. The element a span becomes for the keys `kbd`, `abbr` and `time`, footnote numbering, the links of mentions and tags, the `mailto:` link of an email autolink, the symbol table and URL filtering belong to the HTML rendering document. That a line of a line block keeps its leading spaces is a block rule.

## Open questions found while writing

None is open. The 14 questions of the first draft are ruled and written into the clauses above.
