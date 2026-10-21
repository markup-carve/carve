---
title: Writer target guidance
description: How the reference engines write Markdown, plain text and ANSI terminal output. Informative.
---

# Writer target guidance

This page is informative. It describes how the reference engines write three output targets: Markdown, plain text and the ANSI terminal. The [formal specification](./grammar) is normative for the canonical Carve writer (`carve fmt`, PART 11) and for HTML (PART 10). These three targets are outside it, and conformance does not compare their bytes across engines.

The sections below were PART 11 clauses. Each keeps its rule ID as a heading, so a citation of a retired ID such as `CARVE-P11-022` lands on its text here. Where a section says MUST, read it as what the reference writers do. The corpus rows that pin these outputs stay in the corpus as examples.

## Markdown escaping

### CARVE-P11-022

**The Markdown target's escaping.**

The Markdown renderer is not the canonical writer and does not follow PART 11 §2. It answers to a Markdown reader, and THIS TABLE IS ITS ESCAPING RULE FOR TEXT. Every condition is read on the EMITTED LINE, across nodes (CARVE-P11-050). The first column is the row's label, or the clause that states the row in full.

``` text
row             character      escaped when                             written
M1              `\` `` ` ``    always                                   `\` and the
                `~` `]`                                                 character
M1a             `*`            always                                   `\*`
M1b             `_`            ADJACENT to an unescaped `_`, or where   `\_`
                               another live `_` in the same inline
                               content could close the emphasis it
                               could open (CARVE-P11-023)
M1b             `[`            ADJACENT to an unescaped `[`, or inside  `\[`
                               an emitted link label or image
                               description (CARVE-P11-023)
M1c             `-` `+`        at a paragraph line's content position,  `\-` `\+`
                               before a space or tab
M1c             `.` `)`        after one to nine ASCII digits at a      `\.` `\)`
                               paragraph line's content position,
                               before a space or tab
M1e             `<`            before an ASCII letter, `/`, `!` or `?`  `\<`
M1e             `>`            at a line's content position             `\>`
M1f             `#`            opening a run of one to six hashes at a  `\#`
                               line's content position, closed by a
                               space, a tab or the line's end; and a
                               trailing run of any length after a
                               space or tab on a line emitted as a
                               heading
CARVE-P11-051   `&`            where the line after it completes a      `\&`
                               character reference
CARVE-P11-052   `!`            before a `[` the writer emits as markup  `\!`
CARVE-P11-053   a line's       a paragraph line that would read as a    `\` on that
                first or       thematic break, a setext underline or    character
                marker         an empty list item (T1 to T3)
                character
CARVE-P11-054   `|`            in a pipe-table cell                     `\|`
CARVE-P11-060   `:` `.`        in a URL form GFM would autolink (U1,    `\:` `\.`
                               U2)
CARVE-P11-060   `@`            in an address GFM would autolink (E1)    `<!---->@`
M2              the character  M2a: it could be read as markup at the   `\` and the
                of an          position the writer has reached, or it   character
                `escaped_text` is `"`, `'`, `-` or `.`. M2b: a `#`
                node           qualifies only at a line's content
                               position (CARVE-P11-025)
M3              any other      never                                    bare
                character
```

M2 EXISTS BECAUSE AN AUTHORED ESCAPE CARRIES INTENT. `\-\-` was written so that a processor with smart punctuation on would not read an en dash, and `"` `'` `-` `.` are not Markdown metacharacters, so no M1 row covers them. A document that escapes nothing gains no backslashes from M2. An implementation whose AST has no `escaped_text` node cannot honor M2; that is a defect in the AST, not license to skip the row.

### CARVE-P11-023

**The Markdown target's escaping narrows on the line.**

Rows M1b to M1f of [CARVE-P11-022](#carve-p11-022)'s table are conditional. These terms decide them.

ADJACENT means the position immediately before or immediately after the character, in the line the writer is building, holds that same character, put there by the writer as MARKUP and not behind a backslash.

`[` IS ALSO ESCAPED INSIDE AN EMITTED LINK LABEL OR IMAGE DESCRIPTION, throughout the label's inline text descendants and the image's alt text. Code spans, destinations, titles and raw HTML are unchanged. M1 escapes every `]`, so a bare `[` there would leave an unmatched opener that CommonMark 6.3 reads as the link:

``` text
[a [b] c](/u)      ->  [a \[b\] c](/u)
```

`_` TAKES ITS SECOND CONDITION OVER THE INLINE CONTENT IT IS EMITTED IN (a paragraph, heading or table cell, across its line breaks), by CommonMark 6.2 read for the underscore. A run that flanks on both sides can neither open nor close, so `company_id` stays bare while `*x*_y_` is written `*x*\_y\_`.

A PARAGRAPH LINE'S CONTENT POSITION, for M1c, includes up to three leading spaces. M1c applies to paragraph text only: a marker the renderer emits for an actual list remains live, and punctuation inside code remains content.

THE ASTERISK IS UNCONDITIONAL BECAUSE THIS WRITER EMITS `*` AS ITS OWN DELIMITER. Emphasis holding two literal asterisks is written `*\*\**`; written `****` it reads back as a thematic break.

THE TABLE IS THE BOUNDARY, NOT A FLOOR. Each conditional row is an if-and-only-if. An engine neither drops an escape a row keeps nor keeps one a row drops, narrows no further character and loosens no test.

### CARVE-P11-024

**`<` is escaped when the emitted line would read it as markup.**

An opening tag, a closing tag, a comment and a processing instruction open raw HTML through a CommonMark reader, and those four next-characters are the whole hazard. The escape is a BACKSLASH, not an entity, and the closing `>` needs none: a tag that cannot open cannot be closed.

``` text
a \<b> c       ->  a &lt;b&gt; c
```

### CARVE-P11-044

**`#` is escaped where the emitted line would open or close an ATX heading.**

The content position is the one [CARVE-P11-025](#carve-p11-025) defines, and the escape goes on the `#` that opens the run:

``` text
a               ->  a
   # heading    ->  \# heading
```

### CARVE-P11-025

**The Markdown target's authored escape narrows too.**

Row M2 of [CARVE-P11-022](#carve-p11-022)'s table keeps an `escaped_text` node's escape wherever its character could be read as markup at the position the writer has reached (M2a). `#` is its ONLY narrowing (M2b): a hash is read as markup only at a line's content position, where it opens an ATX heading. A `[` can open a link at any position, so its escape is kept everywhere.

``` text
a -- b        ->  a – b
a \-\- b      ->  a -- b
```

A LINE'S CONTENT POSITION IS AFTER ITS CONTAINER PREFIX. It is measured on the EMITTED LINE: every prefix the writer put in front of the content is passed over first (a block quote marker, a list or task marker, a definition marker, the alignment PART 11 §10 gives a continuation line), in whatever combination and to whatever depth. Column 0 is the content position of a line NO container encloses, and of no other line. A container this target flattens (a colon fence, a definition-list body) contributes no prefix. This writer re-prefixes every container line, so lazy continuation does not arise.

THE NARROWING HOLDS BEHIND A PREFIX AS IT DOES AT COLUMN 0, and a hash at the content position that opens no heading is bare too:

``` text
> C\# is a language      ->  > C# is a language
```

- issue \#123 fixed      ->  - issue #123 fixed

``` text
> \#tag rest             ->  > #tag rest
```

### CARVE-P11-045

**The Markdown target uses rich-text delimiters where they read back.**

The Markdown target spells `emphasis` with `*`, `strong` with `**`, a `strong` node carrying `boldItalic: true` around one whole `emphasis` child with `***`, and `strike` with `~~`. A `***` read-back that commutes the two nesting levels is the same construct under CARVE-P11-043 N2.

The target MUST emit one of those four nodes as inline HTML (`<em>`, `<strong>` or `<del>`, nested where needed) where its delimiter spelling in the emitted bytes would not be read back as that construct under CommonMark delimiter processing (with the GFM strikethrough extension for `strike`). Where the delimiter spelling reads back, the target MUST use it. Inline HTML is the smallest departure that restores the construct, not an alternate canonical spelling.

The `underline`, `highlight`, `subscript`, `superscript`, `small_caps` and `ruby` nodes have no Markdown delimiter spelling and MUST use inline HTML: `<u>` for `underline`, `<mark>` for `highlight`, `<sub>` for `subscript` and `<sup>` for `superscript`. Each of those four MUST carry its attribute set onto the element it emits, under the same ordinary HTML attribute rules `ruby` follows below; one with no attributes emits the bare tag. `small_caps` uses `<span class="smallcaps">`, merging its other attributes under the ordinary span rules. An editorial comment (`editorial_comment`, the `critic_comment` node) has no Markdown delimiter spelling either and MUST use `<span class="critic-comment">`. Its content is literal (CARVE-P3-016): the writer emits it as one text run under the ordinary text escapes and parses nothing inside it. A deletion (the `deletion` node, and the deletion half of a substitution) has no Markdown delimiter spelling either and MUST use `<del class="critic-delete">`; a `<del>` WITHOUT that class is a `strike` this clause sent to inline HTML, and reads back as one. `ruby` uses `<ruby>`, with one base run and one `<rt>` per pair plus generated `<rp>(</rp>` / `<rp>)</rp>` fallback. Its base and annotation children use the Markdown inline writer inside those HTML tags, and its outer attributes follow the ordinary HTML attribute rules.

THE TEST IS ON THE EMITTED BYTES, as in CARVE-P11-002. In the first document the strong delimiter reads back as `strong`, so replacing it with `<strong>` is a wider departure than the rule permits. In the second, `~~ ~~` does not read back as `strike`, so the HTML fallback is required:

``` text
Carve       _*{*x*} q
Markdown    _\***x** q

Carve       {~ ~}
Markdown    <del> </del>
```

### Contextual escapes on the Markdown target

CARVE-P11-050 stays normative in PART 11 §2 and governs the canonical writer. The Markdown target reads the emitted line the same way.

**A contextual escape reads the emitted line across nodes.**

Every row of [CARVE-P11-022](#carve-p11-022)'s table that decides an escape by a NEIGHBORING character or by a position reads the character the writer emits there, whichever node emits it: the rest of the same text node, the text of a following span, emphasis or link label, or the writer's own markup. A node boundary is not a line boundary.

``` text
[<]{.p}[h1]{.nt}[>]{.p}Heading     ->  \<h1>Heading
[-]{.p}[ x]{.x}                    ->  \- x
```

A `>` AT A LINE'S CONTENT POSITION is escaped whether the rest of its line comes from its own node or another.

### CARVE-P11-051

**An ampersand that would read as a character reference is escaped.**

Carve has no character references: `&amp;` in a text node is five characters. A Markdown reader decodes it, so a `&` in text is written `\&` when the characters the line carries after it complete a reference as CommonMark reads one: `#`, one to seven ASCII digits and `;`; `#x` or `#X`, one to six hex digits and `;`; or an ASCII letter, any run of ASCII letters and digits, and `;`. The named form is tested on its shape, not against a list of names, because the readers do not agree on the list. Any other `&` is emitted bare.

``` text
a &amp; c &#65; & b &c     ->  a \&amp; c \&#65; & b &c
```

### CARVE-P11-052

**A `!` before a link is escaped.**

A `!` in text is written `\!` when the next character the line carries is a `[` the writer emits as markup: the opener of a link, an image or a footnote reference. Otherwise `![` reads as an image and the link becomes an `<img>`.

``` text
text "a !", then a link to /u    ->  a \![x](/u)
```

### CARVE-P11-053

**A paragraph line must not become a thematic break or a setext underline.**

When a line of paragraph text, after its container prefix and up to three spaces, consists only of

- **T1** three or more `-`, `_` or `*` of one kind, with any spaces or tabs between them, or
- **T2** on a line that is not the paragraph's first, one or more `=` or one or more `-`, with any trailing spaces or tabs, or
- **T3** on the paragraph's first line, a list marker with nothing after it but spaces or tabs: `-`, `+`, or one to nine ASCII digits and `.` or `)`,

the line is escaped: for T1 and T2 its first character, for T3 the character M1c escapes (`\-`, `\+`, `1\.`), unless an escape another rule gives already stands on it. T1 is a thematic break, T2 turns the paragraph above into a heading and T3 is an empty list item, and M1c reaches none of them: it asks for a marker followed by a space or tab.

``` text
text "---"                 ->  \---
text "x", soft break, "==="    ->  x
                                   \===
```

### CARVE-P11-054

**A pipe in a table cell is escaped.**

Inside a pipe-table cell every `|` the writer emits as content is written `\|`: in text, in a code span's content, and in a link destination or title. GFM splits the row on every unescaped `|` before it reads any inline, a code span included, and reads `\|` back as `|` in all of those places. A `|` already written escaped is not escaped twice.

``` text
cell text "a|b"            ->  | a\|b |
cell code "a|b"            ->  | `a\|b` |
```

### CARVE-P11-060

**Text that GFM would autolink is escaped.**

GFM's autolink extension turns a bare URL or email address in text into a link the document never had. The target holds each form apart at one character, and touches nothing else. A URL form takes an escape there:

- **U1** the `:` of `http://`, `https://` or `ftp://`, the scheme matched without regard to ASCII case, is written `\:` unless the character before the scheme is an ASCII letter;
- **U2** the `.` of `www.` is written `\.` unless the character before the `w` is an ASCII letter or digit.

The two readers the target answers to disagree at the edges: cmark-gfm links a scheme after a digit and pandoc does not, and pandoc links `www.` after any punctuation or a no-break space where cmark-gfm needs whitespace, `*`, `_`, `~` or `(`. U1 and U2 escape wherever either one links.

READ ON THE EMITTED LINE, as CARVE-P11-050 reads every contextual escape. The escaped `:` or `.` is a text character; the scheme or `www` before it, the `//` after it and the character before the form are whatever the writer emits there, from any node, its own markup included, and a line start counts as no character. A URL split across spans, as a highlighter splits one, is one form:

``` text
[http]{.a}[s://x.io]{.b}   ->  https\://x.io
```

TEXT ONLY, AND NOT INSIDE A LINK. A code span, a link destination and an autolink's own spelling are not text. A `:` or `.` in a link's text or an image's description is text, but GFM builds no link inside a link, so it is not escaped.

``` text
text "See https://x.io and www.y.org"
                           ->  See https\://x.io and www\.y.org
```

THE EMAIL FORM TAKES AN EMPTY COMMENT RATHER THAN AN ESCAPE. Both readers link `a@b.co` whether the `@` or the `.` carries a backslash, so no escape holds the address:

- **E1** the `@` of an address GFM's email extension would match is written `<!---->@`. A `mailto:` or `xmpp:` prefix matches through that same extension and takes the same spelling.

``` text
text "Mail a@b.co and mailto:c@d.co"
                           ->  Mail a<!---->@b.co and mailto:c<!---->@d.co
```

E1 reads on the emitted line and in text only, as U1 and U2 do. The comment REACHES THE OUTPUT, and a reader that strips comments before matching addresses re-links. Neither reader this target answers to strips it ([carve#2413](https://github.com/markup-carve/carve/issues/2413)).

### CARVE-P11-064

**Inline code preserves its payload.**

The Markdown target MUST preserve the exact code text. CommonMark code spans replace newlines with spaces and remove one edge space from a padded payload. The writer chooses a backtick fence and padding that preserve the value. Empty values and values containing TAB or LF use inline `<code>` so both cmark-gfm and Pandoc preserve the payload.

Pandoc expands literal tabs in native code spans. The HTML fallback writes SPACE as `&#32;`, TAB as `&#9;`, LF as `<!---->&#10;<!---->`, and ASCII punctuation U+0021 through U+002F, U+003A through U+0040, U+005B through U+0060, and U+007B through U+007E as decimal character references. An encoded `@` is followed by `<!---->`. Other characters remain unchanged. The empty HTML comments guard spaces beside newlines and prevent email autolinking; they contribute no code text in the rendered HTML.

``` text
code value    "a" + LF + "b"
Markdown      <code>a<!---->&#10;<!---->b</code>
code value    ""
Markdown      <code></code>
```

### CARVE-P11-069

**The Markdown target keeps an autolink's angle spelling.**

For this rule, `body` is the node's `text` after the target strips controls. An `autolink` node MUST use `<body>` exactly when it is not inside a link label (CARVE-P12-007), its attributes contain no `title`, and one of these forms applies:

- A URI body starts with an ASCII letter, then one to 31 ASCII letters, digits, `+`, `.` or `-`, then `:` and content with no Unicode White_Space, control character, `<`, `>` or backslash. The emitted destination equals the body.
- An email body has a CommonMark local part and at least two domain labels. Each domain label starts and ends with an ASCII letter or digit, permits hyphens between them, and has at most 63 characters. Its `href` is `mailto:` followed by the body, and the emitted destination equals `href`.

For both comparisons, the target's destination step strips controls, blanks denied schemes, percent-encodes spaces, `(`, `)`, `<`, `>` and `|`, and neutralizes character references. It leaves other non-ASCII characters unchanged. A changed destination or an ineligible body uses the ordinary explicit link spelling. An authored `[text](destination)` stays explicit even when its text equals its destination. CARVE-P12-007's nested-link render rule still flattens the inner link. Attributes follow their ordinary target rule and do not change this spelling choice.

``` text
<https://example.com>     -> <https://example.com>
<user@example.com>       -> <user@example.com>
<https://e.com/a(b)>      -> [https://e.com/a(b)](https://e.com/a%28b%29)
```

## Markdown line breaks

### CARVE-P11-026

**The Markdown target's hard break.**

A `hard_break` is emitted as a BACKSLASH before the newline, never as two trailing spaces, except where [CARVE-P11-048](#carve-p11-048) or [CARVE-P11-065](#carve-p11-065) requires inline HTML.

Both spellings mean the same thing to a CommonMark reader. The difference is what survives handling: trailing whitespace is removed by editors that strip it on save, by `git apply --whitespace=fix`, and by CI whitespace checks -- and removing ONE of the two spaces is enough, so the break does not degrade, it VANISHES, silently, in a file nobody edited. The cost is pre-CommonMark processors, which show a literal backslash instead of a break: a visible artifact in a rare consumer, against silent data loss in a common one.

This is a property of the MARKDOWN target only. The canonical writer spells a hard break the way the Carve grammar does (`hard_break`, PART 3), and PART 11 §7's no-whitespace-only-line rule already covers the writer's side.

### CARVE-P11-048

**A hard break in a table cell is `<br>`.**

Inside a pipe-table cell the Markdown target emits a `hard_break` as the inline HTML `<br>`, not as [CARVE-P11-026](#carve-p11-026)'s backslash and newline. A GFM table row is one line, so [CARVE-P11-026](#carve-p11-026)'s newline ends the row: the rest of the cell and every later cell fall out of the table into a paragraph below it.

``` text
cell children   text "one", hard_break, text "two"
Markdown row    | one<br>two | x |
```

`<br>` is the spelling GFM readers render as a line break inside a cell, and it is the same inline-HTML fallback [CARVE-P11-045](#carve-p11-045) uses for a node that has no Markdown spelling. [CARVE-P11-026](#carve-p11-026) holds where its backslash and newline read back as a hard break.

NO CARVE SOURCE SPELLS THIS TREE. A table row is one line, so a hard break has no Carve spelling inside a cell. The tree reaches the writer from an AST payload (PART 12) or an editor. The HTML importer still writes a `<br>` in a cell as a space and reports the loss (`structure-unspellable`, fixture `table-cell-hard-break`); this clause does not change that half.

### CARVE-P11-061

**A soft break in a table cell is one space.**

Inside a pipe-table cell the Markdown target emits a `soft_break` as a single SPACE. [CARVE-P11-048](#carve-p11-048)'s reason is unchanged: a GFM table row is one line, so the newline [CARVE-P11-026](#carve-p11-026) would write ends the row, and the rest of the cell and every later cell fall out of the table.

``` text
cell children   text "one", soft_break, text "two"
Markdown row    | one two | x |
```

EVERY CELL, not the list-table path alone. A `::: list-table` item becomes a cell of the same table, and [CARVE-P11-059](#carve-p11-059)'s worked example already writes this document as `| one two | x |`. A plain pipe-table cell takes the tree from an AST payload (PART 12) or an importer, since a row is one line and no Carve source spells a break inside one.

NOT `<br>`, which [CARVE-P11-048](#carve-p11-048) writes for a hard break. A soft break is the break that does not render as a break, so `<br>` would show a line break the document never had, which is the substitution CARVE-P11-008 forbids.

### CARVE-P11-065

**A hard break at an inline boundary survives.**

A backslash at the end of a paragraph reads as literal text, and a newline ends an ATX heading. In those positions the Markdown target MUST emit a `hard_break` as inline `<br>`. The final hard break in any inline child list MUST also use `<br>`, including a transparent span's children, to keep the break inside that list.

Trailing whitespace, soft breaks and nodes that emit nothing do not turn a terminal hard break into an interior one. Repeated hard breaks retain their count. Outside a heading or table cell, a break-only inline fragment appends `<!---->` to its final `<br>` so it cannot start a CommonMark HTML block. The empty HTML comment contributes no rendered text.

``` text
paragraph children    text "a", hard_break
Markdown              a<br>
paragraph children    hard_break
Markdown              <br><!---->
heading children      text "a", hard_break, text "b"
Markdown              # a<br>b
```

Ordinary interior hard breaks still use [CARVE-P11-026](#carve-p11-026). Heading soft breaks retain the target's existing line-folding behavior.

## Content every non-HTML target keeps

### CARVE-P11-028

**An unused definition survives the non-html targets.**

A FOOTNOTE or ABBREVIATION definition that NOTHING references is still emitted by the Markdown, plain-text and terminal renderers. HTML drops it, because HTML has nowhere to put a definition nobody used; the other three do not get to drop content the author wrote.

A LINK REFERENCE DEFINITION IS COVERED TOO: PART 12 §10 gives it a node, so all three kinds walk and all three emit. A REFERENCED link definition writes no line on Markdown, because the inlined `[it](/url)` already carries its destination; that is CARVE-P11-033's test, one design for both.

UNDER ROUNDTRIP EXPORT A REFERENCE LINK IS WRITTEN NATIVELY. With the carrier mode on (CARVE-P10-015), a link that resolved through a reference definition keeps its reference form, the full `[a][r]` or the collapsed `[r][]`, and the definition it resolved by writes its `[r]: /u` line where it stands. Markdown has the construct, so this needs no carrier. An unused definition is written as it is without the mode. Without the mode nothing here changes: the link is written inline and a referenced definition writes no line.

``` text
[a][r]          ->  markdown             [a](/u)
(blank)             markdown roundtrip   [a][r]
[r]: /u                                  (blank)
                                         [r]: /u

[^n]: %         ->  markdown  [^n]: %
                    plain     [^n]: %
                    html      (nothing)
```

THE MARKER IS EMITTED AS WRITTEN. `[^n]: %` is a footnote definition, so it renders with its caret. `[n]: %` is not that construct -- it is a LINK reference definition, and emitting one where the author wrote the other turns a definition into something that parses back as a different construct.

### CARVE-P11-031

**Multiple Carve header rows survive the Markdown target.**

Markdown pipe tables can identify only one header row. The first Carve header row therefore becomes that row, and every later Carve header row is emitted as an ordinary Markdown body row. Their header semantics are lost, but no authored cell content is dropped. Each such row reports `table-header-row-demoted` (CARVE-P2-024).

The first Carve header row becomes the Markdown header even when body rows precede it, so it is written above them; that move reports `table-header-row-hoisted` (CARVE-P2-024). A header cell in a row that is not a header row is written as an ordinary body cell and reports `table-header-cell-demoted` (CARVE-P2-024).

The Markdown delimiter uses the final effective column alignment from the Carve header rows: a later explicit header marker wins, while an omitted marker does not reset an earlier one. A body-cell alignment is local to that cell and MUST NOT become the Markdown column alignment, including when that body row precedes the first header row.

### CARVE-P11-032

**A presentation target keeps a caption, a fence title and a fence label.**

`docs/graceful-degradation.md` states the floor for every non-interactive target: a renderer MUST preserve the construct's CONTENT and may drop only its INTERACTION, and authored text -- a label or a title that distinguishes one block from another -- MUST NOT be silently discarded.

This clause decides only where the named text goes on the targets below. Unnamed construct/target pairs remain open, not allowed by omission.

- **T1** A FENCE'S TITLE AND LABEL RENDER THE WAY A DIV'S ALREADY DO. A fenced div surfaces both tokens on every target, which is the caption rule `docs/graceful-degradation.md` makes normative for an unconsumed label: `::: note "T" [L]` emits `**T**` then `**L**` in Markdown, a standalone line each in plain text, and a bold standalone line each on the terminal, the title always before the label. A code fence carries the SAME two tokens in the SAME two slots of its info string, so it renders them the same way, above the block:

```` text
```php "src/Auth.php" [Composer]   ->  src/Auth.php
composer require x                     (blank)
```                                    Composer
                                       (blank)
                                       composer require x
````

- **T2** A TABLE CAPTION SURVIVES THE MARKDOWN TARGET as body text AFTER the table, separated by one blank line. The position is what this target already does for the other two captioned hosts -- an image caption and a listing caption both follow their block as body text -- so the table was the odd one out rather than a consequence of Markdown having no caption syntax:

``` text
|= H |             ->  | H |
| a |                  | --- |
^ Table caption        | a |
                       (blank)
                       Table caption
```

ADJACENCY IS NOT AVAILABLE HERE, AND THAT IS THE GENERAL FORM. A plain-text target has no delimiter to put around a block, so what it has instead is ADJACENCY: dropping the blank line says that the line below belongs to the block above. Attachment by adjacency is only available on a target where adjacency does not change what the adjacent block IS. A caption written directly after the last row of a Markdown table is read by a GFM reader as ANOTHER ROW, and a line written directly above a code block in plain text reads as the FIRST LINE OF THE CODE.

TWO MORE LOSSES OF THE SAME TOKENS ARE RECORDED HERE AND LEFT OPEN. Each breaks the floor exactly as this clause's three tokens did; what is missing is a decided rendering, not a rule. Neither is settled by this clause and neither is thereby permitted:

- A fence title on a fence with NO LANGUAGE is dropped by the MARKDOWN writer too: `` ```"src/app.js" `` emits a bare `` ``` `` and the title is gone. The Markdown target keeps the title only when a language precedes it.
- A code-group label never reaches the HTML target at all: `` ```js [Node] `` gives `<pre><code class="language-js">`. Core assigns the label no meaning and a group extension consumes it, so on HTML with no such extension the token has nowhere to go. Where it should go is a question about the HTML target, which is PART 10's business rather than this section's.

### Referenced abbreviation definitions

The Markdown import half of this text stays normative as CARVE-P11-033.

**A referenced abbreviation definition splits by target.**

[CARVE-P11-028](#carve-p11-028) rules the definition NOTHING references: the Markdown, plain-text and terminal renderers all emit it, because those targets do not get to drop content the author wrote. It says nothing about the definition that IS referenced.

This clause decides where the consumed definition line goes on those three targets and what plain text emits. Unnamed pairs remain open. Its test, below, is the one that drops a referenced link definition on Markdown ([CARVE-P11-028](#carve-p11-028)).

- **T1** MARKDOWN KEEPS THE LINE, and keeps the expansion beside it. `*[TERM]: expansion` is the spelling PHP Markdown Extra uses for an abbreviation, so on this target the line is CONTENT rather than leaked source, and keeping it is what lets the export round-trip back to a working abbreviation. The duplication is the price of that round trip, and it is paid only here. THE MARKDOWN IMPORT READS THE LINE BACK: a `*[TERM]: expansion` line is an abbreviation definition, not a paragraph, and an `<abbr>` whose title is the expansion a definition in the same document gives its text imports as the plain term that definition resolves. No carrier is needed.
- **T2** PLAIN TEXT AND THE TERMINAL DROP THE LINE and emit only the expansion, in the `TERM (expansion)` shape, at every occurrence:

``` text
*[HTML]: Hyper Text  ->  plain     HTML (Hyper Text)
(blank)                  terminal  HTML (Hyper Text)
HTML
```

THE TEST IS WHETHER THIS DEFINITION'S EXPANSION IS EMITTED, not whether its term appears. The line is dropped on plain and the terminal exactly where the same output carries the expansion that definition supplies, and kept otherwise. Three shapes fail the test, and in each the definition's text is carried by its own line and by nothing else, so dropping it would be the content loss [CARVE-P11-028](#carve-p11-028) exists to prevent:

- THE TERM NEVER APPEARS. That is [CARVE-P11-028](#carve-p11-028), which this clause leaves exactly as it stands.
- AN AUTHORED `abbr` OUTRANKS THE DEFINITION. CARVE-P10-003 makes `[HTML]{abbr="Custom"}` authoritative and a resolved `abbreviation` child contributes only its visible text there, so the definition's own expansion reaches no target. `45-inline-extensions-11` pins `HTML (Custom)` on plain and on the terminal with the definition line above it, and this clause leaves that case unchanged.
- A LATER DEFINITION OF THE SAME TERM WON. PART 9R R3 is last-wins, so in

  ``` text
  *[A]: a
  *[A]: b

  A here.
  ```

  only `b` is ever emitted. `*[A]: b` goes and `*[A]: a` stays, on plain and on the terminal alike. Dropping every definition of a term that expanded anywhere would delete the string `a` from the document outright, which is the loss this clause moves to prevent.

THE MARKDOWN TARGET NEEDS NONE OF THAT TEST -- it keeps every definition line whatever became of it. So does the canonical writer, where PART 11 §1's `parse(fmt(x)) == parse(x)` requires it, which leaves the round trip intact on both of the targets that have one.

### Composite figures

The canonical spelling stays normative as CARVE-P11-034.

- **T1** MARKDOWN emits the panels in order, each host degraded as it already does, each panel caption as an emphasized `*(...)*` paragraph after its host; preserved stray content in place; the group caption LAST, as a bold `**...**` paragraph, its number resolved. Emphasis and bold rather than invented syntax: Markdown has no figure grouping, and this is the spelling the tabs/label rule already uses for authored text with no native slot.
- **T2** PLAIN TEXT AND THE TERMINAL put the group caption FIRST, its number resolved, then a blank line, then each panel: its caption line, then its host's degradation (`[Image: alt]` and the rest, unchanged), a blank line between panels. Caption-first because on a caption-less target the group caption is the only line that says what the following blocks are one of.

## Plain text and terminal lists

### CARVE-P11-035

**The plain-text target preserves list depth.**

A nested list item is indented by TWO ASCII SPACES for each list ancestor. The target may discard marker style and tight/loose layout, but it MUST NOT flatten parent, child, and grandchild items into siblings: indentation is the plain-text representation of that structure. ANSI uses the same two-space depth step. Canonical Carve does not: it indents a nested list to its parent marker's width (CARVE-P11-027, PART 9 §24 C3), two columns under a bullet and three or more under an ordered marker.

THE TIGHT/LOOSE LICENCE IS THIS TARGET'S, and its ground is this target's reach: plain text has no way to spell the distinction, so there is nothing to preserve. A target that CAN spell it does not have the licence, and this clause's silence about the others never granted one -- the MARKDOWN target keeps tightness under [CARVE-P11-047](#carve-p11-047).

### CARVE-P11-072

**A list item's continuation blocks sit at its content column.**

In the plain-text target, every block of a list item after its first -- a paragraph, a code block, a block quote, or any other block -- is written at the item's CONTENT COLUMN. That is the column [CARVE-P11-035](#carve-p11-035) already gives a nested list item under the same item: two ASCII spaces deeper than the item's marker. A nested list is one continuation block among the others, so the two rules put a paragraph and a sublist of one item at the same column.

- item one               is written as:   - item one

```` text
second para                               second para

```                                       code
code
```                                       "quote"

> quote                                   - nested

- nested
````

THE COLUMN DOES NOT FOLLOW THE MARKER'S WIDTH. An ordered item takes the same two-space step as a bullet, because a nested item under it does: `1. setup` writes its continuation blocks at column 2, not at the width of `1. `, and an item at depth two (its marker at column 2) writes them at column 4.

EVERY LINE OF THE BLOCK IS INDENTED, and only those lines. A block that already indents in this target, such as a definition's body, keeps that indentation inside the column. A line that is empty stays empty: the column is never written as trailing whitespace.

ANSI follows plain text: the same column, written ahead of the block's own styling and of a block quote's bar. The MARKDOWN target is outside this clause; it already writes an item's blocks at CommonMark's content column.

THE FIRST BLOCK IS NOT DECIDED HERE. It is written on the marker line, and this clause does not place its own later lines (the line after a hard break, or the second line of a code block that opens the item).

## Markdown blocks

### CARVE-P11-047

**The Markdown target keeps a list's tightness.**

The emitted Markdown reads back with the tightness PART 9 §17 L1 gives the source, wherever CommonMark can express it. [CARVE-P11-035](#carve-p11-035)'s licence to discard tight/loose is plain text's and does not reach this target.

A BLANK LINE IS WRITTEN WHERE THE NEXT BLOCK NEEDS ONE AND NOWHERE ELSE. In a TIGHT item, a following block whose opener INTERRUPTS A PARAGRAPH -- a nested bullet list, a block quote -- is written directly under the paragraph, because the blank line is what would make the item loose:

- parent

``` text
- child
```

AN OPENER THAT CANNOT INTERRUPT keeps its blank line -- an ordered list that does not start at 1, in `- a` over `  3. b` -- and the item's tightness goes with it. That is the one case where CommonMark cannot express it, so the rule is asked per case and never answered by never writing a separator.

A LOOSE LIST KEEPS ITS BLANK LINES, a flat one included: `- a`, blank, `- b` is emitted with the blank line, not as `- a` then `- b`.

### CARVE-P11-055

**A paragraph line carries no edge whitespace.**

The Markdown target writes no space or tab at the start or the end of a paragraph line, after its container prefix and before a trailing hard-break backslash. A reader strips that whitespace anyway, except where it changes the block: four columns of it open an indented code block on a paragraph's first line, and two trailing spaces before a line ending make a hard break. The HTML target renders it as nothing, so dropping it is faithful. U+00A0 and every other non-ASCII space is content and is kept. A line that this leaves empty is not written: an empty line would end the paragraph.

``` text
paragraph "a", then paragraph "      x"    ->  a

                                               x
```

### Tables without a header row

The header-row definition and the Markdown import half stay normative as CARVE-P11-056.

**A table without a header row gets an empty one.**

GFM reads a pipe table only below a header row and its delimiter row, so rows written without them are a paragraph of pipes. A table with no header row anywhere is written with an EMPTY header row first: one empty cell for each cell of the widest row, and a delimiter row of the same width, whose alignment is the one the headerless table already takes from its first aligned row. A table with a header row keeps [CARVE-P11-031](#carve-p11-031), which writes that row as the header.

ON MARKDOWN IMPORT, an all-empty header with no column alignment is omitted, together with its delimiter row. It is the scaffolding this clause writes, so keeping it would give every headerless table an empty header row on its way back. The body keeps its GFM column width, and the importer MUST NOT turn the omitted header into a paragraph of pipes. A header carrying cell content or column alignment is retained. The omitted header is reported as `structure-unspellable` by the migration fidelity report; a standalone GFM empty header cannot be distinguished from writer scaffolding. An all-blank BODY row is not scaffolding: it is imported as a row of empty cells, one `| |` slot per cell, and reads back as a row (PART 9 §5 CARVE-P9-082).

A ROW IS A HEADER ROW WHEN EVERY CELL IT OWNS IS A HEADER CELL. A span placeholder (a cell carrying `span`) is not a cell of its own: it belongs to the cell whose `colspan` or `rowspan` covers it, so `|= A | < |` is a header row even though its placeholder carries `header: false`.

``` text
| a | b |          ->  |  |  |
| c |                  | --- | --- |
                       | a | b |
                       | c |
```

THE HEADER IS AS WIDE AS THE WIDEST ROW because GFM drops every body cell past the header's width. Each body row still keeps its own cell count (CARVE-P11-029).

A HEADER ROW NARROWER THAN THE TABLE IS PADDED for the same reason. When the row [CARVE-P11-031](#carve-p11-031) writes as the header has fewer cells than the widest row, it gains one empty cell per missing column, and so does the delimiter row, whose added cells take the column's effective alignment under [CARVE-P11-031](#carve-p11-031) and are `---` where no header row sets one ([carve#2408](https://github.com/markup-carve/carve/issues/2408)).

``` text
|= a |= b |          ->  | a | b |  |
| 1 | 2 | 3 |            | --- | --- | --- |
                         | 1 | 2 | 3 |
```

### CARVE-P11-057

**Adjacent lists of one kind alternate their marker.**

Two lists of the same kind that the writer emits one after the other in the same PREFIXED container, with nothing written between them, are one list to a Markdown reader. The second is written with the other marker of its kind: a bullet list alternates `-` and `*`, an ordered list alternates `.` and `)`, starting from the usual marker, so a run of adjacent lists alternates all the way down. A blank line is not a separator a reader keeps, and it would make both lists loose.

``` text
list [a], list [b]         ->  - a

                               * b
```

"Nothing written between" is decided on the output: a block that writes nothing on this target (a comment, an empty wrapper) does not separate two lists, and neither does a wrapper this target writes without a prefix (a div, a section, a line block, an admonition or directive without a title line, a definition description). A prefixed container (a block quote, a list item, a footnote body) starts a fresh run, and a line the target does write between them (a title, a label, a term) ends one.

AN ORDERED LIST WRITTEN WITH ANOTHER DELIMITER REPORTS IT. When the alternation writes an ordered list with a delimiter other than its authored `delim`, the list contributes one render loss with the stable code `list-delimiter-changed`, the selected `target`, `nodeType` of `block`, its `pos` when recorded, NO `format`, `delim`, the authored delimiter, and `emittedDelim`, the one written. No marker carries the delimiter, so the loss is reported with roundtrip export on or off. Only the Markdown target reports this code.

``` text
a. one                     ->  1. one

1. two                         1) two
```

### CARVE-P11-058

**A definition list is written as its terms and blocks.**

GFM has no definition list, and a `: ` marker is literal there: it joins the line it opens to the term's paragraph, and a description's second block falls out of the entry. The Markdown target writes each entry's terms, each as a paragraph of strong text, followed by each description's blocks as ordinary blocks, with no marker. An empty description writes nothing.

``` text
:: Term                    ->  **Term**
: first
                               first
  - a
  - b                          - a
                               - b
```

### CARVE-P11-059

**A list table is written as a pipe table.**

The Markdown target writes an `admonition` of kind `list-table` (the ListTable block, extension contract §5) as the pipe table it is equivalent to, and writes that table by the pipe-table rules of this part. GFM has a table and no way to read one out of a nested list, so the list lost the table shape the document states.

THE EQUIVALENT TABLE has one row per outer item and one cell per inner item, left to right, each in its own position:

- **L1** a cell whose content is one paragraph holds that paragraph's inline content;
- **L2** a cell that is a span marker under extension contract §5.1 (a lone unescaped `^` or `<`, no attributes on the item, the paragraph or the text) is the rowspan or colspan placeholder of that position, written as the pipe-table writer writes a placeholder;
- **L3** any other cell holds its blocks as `table_cell.blocks`, flattened and reported as CARVE-P12-049 flattens and reports a block cell, with a hard break written as `<br>` ([CARVE-P11-048](#carve-p11-048)). A cell with no blocks is empty.

Every list in a row gives cells, in order, and any other block in the row belongs to the cell before it, as extension contract §5 renders them. A cell is a header cell when its row is inside `header-rows` or carries `{header-row}`, when its position is inside `header-cols`, or when its item carries `{header}`, each read as extension contract §5.1 reads it. Its alignment is the item's `align` value, else the `aligns` entry for its position. The opener's title is the table's caption ([CARVE-P11-032](#carve-p11-032)), and an unconsumed `[label]` keeps the bold line the admonition writing gives it, above the table. `valigns`, `widths`, `footer-rows` and every other attribute are not written, as a pipe table's attributes are not.

``` text
{header-rows=1}              ->  | A | B |
::: list-table "Cap"             | --- | --- |
```

- - A                            | one two | x |

``` text
- B                            |  | y |
```

- - one

``` text
                               Cap
  two

- x
```

- - ^

``` text
  - y
:::
```

ONLY A GRID IS A TABLE. The clause applies when the body is exactly one list and each of its items begins with a list. Any other body is written as an admonition: the title as a bold line, then the blocks.

NO EXTENSION SET DECIDES IT. The target writes the table whether or not a processor enabled ListTable for HTML: this target takes no extension set, `list-table` is a standard kind name, and a GFM reader has the table natively where the nested list is the one thing it reads wrongly.

## Frontmatter, roundtrip export and links

### CARVE-P11-062

**The Markdown target keeps frontmatter.**

A `frontmatter` node is emitted FIRST, as its own block: a `---` opener carrying the format token wherever the format is not `yaml`, the content VERBATIM, and a bare `---` closer. HTML, plain text and the terminal omit it.

``` text
---toml            ->  markdown  ---toml
t = 1                            t = 1
---                              ---
(blank)                          (blank)
x                                x
```

THE SPLIT IS [CARVE-P11-028](#carve-p11-028)'S TEST, not a new one. HTML may drop an unused definition "because HTML has nowhere to put a definition nobody used"; Markdown has exactly somewhere to put frontmatter, so on this target the drop is content loss. Plain text and the terminal are on HTML's side of that test here rather than Markdown's: neither reads a delimited metadata block, so emitting one leaves raw YAML in prose, which is not preservation.

THE FORMAT TOKEN IS CARVE'S, NOT THE ECOSYSTEM'S. A `toml` body is not rewritten to `+++`, and no per-format delimiter table is implied. A reader that does not know the fence declines to parse it; one handed a TOML body under a bare `---` reads it as YAML and is wrong about the values. Declining beats being wrong, and the emitted block re-imports as the same node.

THE CONTENT IS NOT VALIDATED. PART 12 §7 keeps `content` raw because a malformed block is still a document's frontmatter; this target emits what that node carries without parsing it, so nothing here can fail on a body the format's own loader would reject.

### CARVE-P11-063

**An opt-in mode carries an element-less container in a comment.**

An ELEMENT-LESS CONTAINER is a container block this target writes as its children alone: no element, no marker and no attribute of its own reaches the output, so nothing there says a container was present. Under the CARRIER MODE, which is roundtrip export on this target, the target brackets each one with an HTML comment carrying the opener and the closer the canonical writer spells, widened to the nesting depth, not the author's lines: `::::: note   "T"` is carried as `::: note "T"` at the top level. CARVE-P10-015 states the option, the table of both targets' carriers and the rules they share; this clause and [CARVE-P11-067](#carve-p11-067) state the marker syntax and what is particular to this target.

``` text
::: note                 ->  <!-- carve: ::: note -->
An admonition body.          An admonition body.
:::                          <!-- carve: ::: -->
```

THE SET: a tab set and each of its panels (`tabs`, `code-group`), an admonition of any kind whether or not it carries a title, a div, named or bare, a columns container and each column, a disclosure, a spoiler, a composite figure's group wrapper, and a line block (`::: |`) or a hard-break block (`::: \`), whose lines this target writes as a paragraph with hard breaks. A container this target DOES spell is not one and takes no comment: an attributes-only opener (`::: {.warning}`) is written verbatim, and a list table is written as a pipe table. A BARE DIV'S OPENER IS `:::` WITH NOTHING AFTER IT, so its marker is `<!-- carve: ::: -->`, the same bytes as its closer's; no space pads the payload.

THE MARKER IS `<!-- carve: `, the payload, ` -->`. A `-->` the payload carries is written `--\>`, and an `\` the payload itself carries before such a `>` is written `\\`. Nothing else is escaped: the payload is Carve source, so Carve's own escape is the one the reader already has. The import reverses exactly those two. A PAYLOAD MAY SPAN LINES: one that holds a line break, such as a definition term the canonical writer spells over two lines, is written across them, and the marker is the whole comment. The import reads it as one marker, with any host prefix on its later lines removed by the block structure as for the marker itself, and restores the line breaks it holds.

A MARKER MAY CARRY A DEPTH directly after `carve:`, with no space before it: a decimal of 2 or more, as in `<!-- carve:2 : -->`. A bare `carve:` is depth 1, so a marker written without a depth keeps its meaning. [CARVE-P11-067](#carve-p11-067) states which markers carry one. A depth is part of the payload, not of the marker's shape: on any other marker it is a payload that marker's grammar does not admit, so the marker is invalid and drops alone under the rule below, an opener together with its closer.

A COMPOSITE FIGURE'S CAPTION LINE TAKES A MARKER OF ITS OWN, directly after the closer's. The caption slot hangs BELOW the closing fence, so the pair bracketing the container cannot enclose it, and carrying it the way an attribute line above an opener is carried keeps one rule rather than two. The payload is the caption line as the canonical writer spells it, `^` and all:

``` text
::: figure               ->  <!-- carve: ::: figure -->
:::: panel                   <!-- carve: :::: panel -->
![a](x.png)                  ![a](x.png)
::::
:::                          <!-- carve: :::: -->
^ Group caption              <!-- carve: ::: -->
                             <!-- carve: ^ Group caption -->
                             **Group caption**
```

THE IMPORT REPLACES THE CAPTION'S RENDERED PARAGRAPH RATHER THAN APPENDING A SECOND ONE. This is the one thing the attribute-line precedent does not cover: an attribute line has no rendered form of its own, while a caption also renders as body text, so a marker that only added the caption line back would leave that paragraph standing beside it and the caption would appear twice. The paragraph replaced is the one the marker stands directly above and no other, so the same caption text appearing as ordinary body text elsewhere in the document is untouched.

A CAPTION MARKER BELONGS TO THE BLOCK DIRECTLY BEFORE IT, the one rule [CARVE-P11-067](#carve-p11-067) states for every captioned block; for a composite figure that block is the container the marker before it closed. One standing above an opener has lost what it recorded, and the set is damaged under the rule below. A `^ ...` line INSIDE the container is not the caption slot: it is literal text that renders as a paragraph, and it takes no marker of its own.

A MARKER IS READ OFF THE BLOCK STRUCTURE AROUND IT rather than off a scan of source lines, so a HOST THAT PREFIXES ITS LINES CARRIES: a comment written at a list item's content column or behind a block quote's `>` is read back, and the container it brackets is restored in that host. The placeholder keeps the host prefix, and the restore removes whatever stands before the marker rather than a fixed set of characters, so a container opening a list item keeps that item's own marker. A CLOSER STANDS AT ITS OPENER'S COLUMN, so a container whose body begins with a nested list closes in the host it opened in and not in that inner item.

A MARKER-SHAPED LINE IN VERBATIM CONTENT RECORDS NO CONTAINER and is never read. That narrowing is what the structural read buys: at a list item's content column a marker and a verbatim line are not distinguishable without the block structure standing around them.

A TABLE CELL is narrower still, and permanently: this target flattens a cell to a single line, so there is no line for a marker to stand on, and the container's own body is flattened with it, leaving a restored marker nothing to bracket. No read recovers that, so the cell narrowing is deliberate.

THE CARRIER IS A COMMENT, NOT A LINK REFERENCE DEFINITION. An HTML comment survives as a node in a Markdown reader, can interrupt a paragraph and is not entity-decoded; a `[meta]: # (payload)` definition collapses with its duplicates and can capture an author's reference. The mode is OPT-IN because a renderer with raw HTML turned off shows the comment as text.

THE ROUND TRIP IS WHAT THE MODE BUYS. A document this target writes with the mode on, imported back with `markdown` as the source format, returns every container the set names: its kind, its title, its attributes, and its nesting, which the import re-derives from the block structure. For containers it promises no more than that, and [CARVE-P11-067](#carve-p11-067) and [CARVE-P11-068](#carve-p11-068) name everything else the mode carries. A construct none of them carries degrades exactly as it does with the mode off, a document holding no element-less container gains no comment under either setting, and this is not the byte-identical source round trip CARVE-P11-043's comparison governs.

AN INVALID OPENER DROPS TOGETHER WITH ITS CLOSER. Pairing is read on marker shapes before payloads are validated, so an opener whose payload is not an opener it can stand for still pairs with its closer, and the two drop as one unit: both stay ordinary comments and the container's content stays in place as ordinary Markdown. A composite figure's caption marker belongs to the container that closer ends, so it drops with the pair and its caption paragraph stays ordinary text; the set is not damaged. Any other marker whose payload is invalid drops alone. The import reports each dropped pair or marker once as `carrier-marker-dropped` at the marker's line, as an invalid HTML carrier is reported (CARVE-P10-017), and the rest of the set restores, since an invalid payload does not break pairing.

A DAMAGED SET, ONE WHOSE PAIRING BREAKS, IMPORTS AS PLAIN MARKDOWN, NEVER A GUESS. A Markdown editor that deleted one marker, reordered two, left the set unbalanced or moved a caption marker off the closer it belongs to has destroyed the structure the markers recorded, and a reconstruction that is wrong is worse than a fallback that is honest. The import reads the file as ordinary Markdown, comments and all, and reports one `carrier-markers-damaged` diagnostic on the migration report (`resources/migration-report-schema.json`) with `degraded` fidelity and `fallback` confidence. Only a damaged set falls back as a whole.

WHAT THIS CLAUSE DOES NOT COVER, so a reader does not look for it here. A construct whose Markdown output already holds an element needs no carrier: `highlight`, `subscript`, `superscript` and a CriticMarkup insertion round-trip through `<mark>`, `<sub>`, `<sup>` and `<ins>` today. Where such an element does not read back (`<u>`, the `critic-comment` span, `<abbr>`, `<del>`), the emitted bytes are faithful and the defect is on the import or in [CARVE-P11-045](#carve-p11-045), not here. `small_caps` and `ruby` have no Carve opener to carry. Attributes on a list item's marker line are not carried: [CARVE-P11-067](#carve-p11-067) carries an attribute LINE, and that is not spelled with one. That is a stated limit: the attributes degrade as they do with the mode off, unreported, as this target drops any attribute it cannot spell. An inline construct's attributes are [CARVE-P11-068](#carve-p11-068)'s.

### CARVE-P11-067

**The carrier mode also carries an attribute line, a definition list and a caption.**

These are not containers, so [CARVE-P11-063](#carve-p11-063)'s set does not name them, but each is a distinction this target writes without a trace and the AST records. The marker, its escaping, the structural read, the verbatim-content and table-cell narrowings and the damaged-set rule are [CARVE-P11-063](#carve-p11-063)'s, unchanged; only what each marker stands for is new.

AN ATTRIBUTE LINE THIS TARGET DROPS IS CARRIED DIRECTLY ABOVE ITS BLOCK. A block whose authored attributes reach no element of this target's output -- a heading's `#id`, a paragraph's class, a block quote's, a list's or a table's attributes -- takes one marker on the line directly above the block, holding the attribute line as the canonical writer spells it. A generated heading id is not authored and takes no marker. The import attaches the attributes to the block the marker stands directly above and to no other; a marker followed by a blank line, by another marker, or by nothing has lost its block and the set is damaged.

``` text
{#start}                 ->  <!-- carve: {#start} -->
# Roundtrip Test             # Roundtrip Test
```

A container [CARVE-P11-063](#carve-p11-063) brackets already carries its attribute line in the opener's prelude and takes no second marker for it.

A DEFINITION LIST IS CARRIED TERM BY TERM. This target writes each term as a paragraph and each definition's blocks after it ([CARVE-P11-058](#carve-p11-058)), so a term takes a marker holding its term line, written directly above the term's rendered paragraph, and each definition takes a `:` marker directly above its first block. One closing marker with an EMPTY payload follows the list's last block:

``` text
:: Carve                 ->  <!-- carve: :: Carve -->
: A markup language.         **Carve**

                             <!-- carve: : -->
                             A markup language.

                             <!-- carve: -->
```

THE IMPORT REPLACES A TERM'S RENDERED PARAGRAPH, as [CARVE-P11-063](#carve-p11-063)'s caption rule does, so the term does not appear twice. A definition holds the blocks from its marker up to the next term or definition marker of the same list, or up to the closing marker. An item's terms are the consecutive term markers before its first definition marker, and an item may hold no definition at all: a term marker followed by another term marker or by the closing marker is a term without a definition, as the AST's empty `definitions` records it. A definition marker with no term before it, or a list with no closing marker, is a damaged set.

A NESTED DEFINITION LIST'S MARKERS CARRY ITS DEPTH. This target writes a definition's blocks unindented ([CARVE-P11-058](#carve-p11-058)), so a list nested inside a definition writes its term, definition and closing markers with its depth ([CARVE-P11-063](#carve-p11-063)): the outermost list is depth 1, a list inside one of its definitions depth 2, and so on. Markers pair by depth: the "markers of the same list" above are the markers of the same depth. A marker of depth 2 or more with no open list of the depth one less around it breaks the pairing, and the set is damaged. Only term, definition and closing markers carry a depth; a depth on any other marker, such as `<!-- carve:2 ::: note -->` or `<!-- carve:2 {.x} -->`, makes that marker invalid. It drops alone, an opener together with its closer under the invalid-opener rule above, and is reported once as `carrier-marker-dropped` ([CARVE-P11-063](#carve-p11-063)).

``` text
<!-- carve: :: Outer -->
<!-- carve: : -->
<!-- carve:2 :: Inner -->
<!-- carve:2 : -->
<!-- carve:2 -->
<!-- carve: -->
```

A DEFINITION LIST'S OWN ATTRIBUTE LINE stands directly above its first term marker, as that list's prelude, the way a container's attribute line precedes its opener. That one adjacency is not "a marker followed by another marker": an attribute marker directly above a list's first term marker attaches to the list. A nested list's attribute line is carried the same way, and an attribute marker carries no depth.

A CAPTION ON ANY CAPTIONED BLOCK TAKES THE COMPOSITE FIGURE'S CAPTION MARKER. A block quote's attribution, a table's, an image's, a code listing's or an equation's `^ ...` line is written as a paragraph after the block ([CARVE-P11-032](#carve-p11-032)); under the carrier mode a marker holding the caption line as the canonical writer spells it stands directly above that paragraph, and the import replaces the paragraph with the caption, exactly as [CARVE-P11-063](#carve-p11-063) rules for a composite figure:

``` text
> Stay hungry.           ->  > Stay hungry.
^ Steve Jobs
                             <!-- carve: ^ Steve Jobs -->
                             Steve Jobs
```

A CAPTION MARKER BELONGS TO THE BLOCK DIRECTLY BEFORE IT. One with no captionable block before it, or one whose block already holds a caption, is a damaged set.

A CODE FENCE'S TITLE AND LABEL TAKE A FENCE MARKER. This target writes both into the info string, where a Markdown reader sees free text and the import drops it (CARVE-P2-029). Under the carrier mode a fenced code block with a title or a label takes one marker directly above its fence, holding the opener as the canonical writer spells it. The import restores the title and the label from that opener onto the code block directly below, and nothing else; the fence itself is written as without the mode.

```` text
```js "app.js" [Example]  ->  <!-- carve: ```js "app.js" [Example] -->
let x = 1                     ```js "app.js" [Example]
```                           let x = 1
                              ```
````

A title is not an attribute, so it is not carried as `{title=...}`. A block's attribute marker stands directly above its fence marker, as a definition list's does above its first term marker. A fence marker not directly above a fenced code block is a damaged set. Without the mode nothing is reported: the info string holds both tokens, so this target writes them (CARVE-P2-024).

A LIST'S NUMBERING STYLE TAKES A LIST-STYLE MARKER. This target writes an alphabetic or roman ordered list as a decimal list (CARVE-P2-024), so under the carrier mode such a list takes one marker directly above its first item, holding the first item's marker as the canonical writer spells it. The import takes the style from that marker and the start and delimiter from the Markdown list, so a marker supplies the style only. A list-style marker not directly above an ordered list is a damaged set.

``` text
a. one                   ->  <!-- carve: a. -->
a. two                       1. one
                             2. two
```

AN AMBIGUOUS FIRST LETTER TAKES TWO MARKERS. When the first item's marker is a letter that is also a roman numeral (`i`, `v`, `x`, `l`, `c`, `d`, `m`, in either case), one marker cannot tell an alphabetic list from a roman one, so the list-style marker holds the first two item markers, separated by one space, and the import applies the ambiguous-letter tie-break (PART 9 §11 N3) to them as Carve source does. A single-item list with such a first marker holds its one marker and takes the reading N3 gives a lone first marker. Every other list keeps the one-marker form.

``` text
i. one                   ->  <!-- carve: i. j. -->
j. two                       9. one
                             10. two

i. one                   ->  <!-- carve: i. ii. -->
ii. two                      1. one
                             2. two
```

A list's attribute marker stands directly above its list-style marker, as a block's does above its fence marker, and the import reads the two as one stack: the style from the list-style marker, the attributes from the attribute marker. A block between the two breaks the stack, and each marker is read on its own.

``` text
{.steps}                 ->  <!-- carve: {.steps} -->
a. one                       <!-- carve: a. -->
b. two                       1. one
                             2. two
```

### CARVE-P11-068

**The carrier mode carries an inline construct's attributes, a span and a cross-reference in inline markers.**

Markdown has no spelling for a link's, an image's or a span's attributes, none for a span, and none for a cross-reference, which this target writes as a link ([CARVE-P11-038](#carve-p11-038)). Under the carrier mode the output stays exactly what this target writes without it, and an inline marker in [CARVE-P11-063](#carve-p11-063)'s syntax and escaping is added beside the construct. Each payload is Carve source as the canonical writer spells it:

``` text
[l](u){.k}         ->  [l](u)<!-- carve: {.k} -->
![a](i.png){w=3}   ->  ![a](i.png)<!-- carve: {w=3} -->
[x]{.c}            ->  <!-- carve: [ -->x<!-- carve: ]{.c} -->
</#h>              ->  <!-- carve: </#h> -->[Head](#head)
```

AN ATTRIBUTE MARKER STANDS DIRECTLY AFTER ITS LINK OR IMAGE, however the link is spelled, and the import attaches its attributes to that construct. A SPAN TAKES AN OPENER `[` AND A CLOSER `]` FOLLOWED BY ITS ATTRIBUTE BLOCK, around the content this target writes for it; the pairs nest with the spans. A CROSS-REFERENCE MARKER STANDS DIRECTLY BEFORE THE LINK this target writes for a resolved cross-reference, whose fragment stays the GFM slug, and the import replaces that link with the cross-reference it names. An unresolved one takes no marker.

AN INLINE MARKER IS TEXT TO NO READER. It contributes nothing to a GFM slug ([CARVE-P11-038](#carve-p11-038)) or to an image's description, and an image's description holds no marker. A table cell and verbatim content take none, as for [CARVE-P11-063](#carve-p11-063)'s markers.

AN INVALID MARKER DROPS ALONE ([CARVE-P11-063](#carve-p11-063)): a payload outside these shapes, an attribute marker not directly after a link or image, and a cross-reference marker not directly before a link are ordinary comments and are reported. A span closer without its opener, or an opener left unclosed in its paragraph, breaks the pairing, and the set is damaged.

### CARVE-P11-038

**The Markdown target links a heading by its GFM slug.**

GFM has no heading-id syntax: a reader derives every heading's id from its text, and `## H {#h}` shows the suffix as text. So this target writes no `{#id}` suffix. A link or a resolved cross-reference whose fragment names a heading is written with that heading's GFM SLUG as its fragment:

``` text
{#h}
## Rise and divergence     ->  ## Rise and divergence

See </#h>.                 ->  See [Rise and divergence](#rise-and-divergence).
```

The carrier mode keeps this link and its slug, and adds [CARVE-P11-068](#carve-p11-068)'s marker before it so the import restores `</#h>`.

THE SLUG is the one GitHub assigns (github-slugger) and `pandoc -f gfm` reads:

- **G1** TEXT: the heading's text content under PART 2 HEADING IDENTIFIERS' contribution rule, each character as this target writes it (a smart punctuation glyph as the glyph, its source under source typography), NFC-normalized, with leading and trailing whitespace removed. A hard break contributes no text here: [CARVE-P11-065](#carve-p11-065) writes `<br>`, whose text content is empty. A soft break contributes the heading's folded SPACE. PART 2 counts an image's alt text and GitHub does not, so a heading holding an image can get a slug GitHub does not assign; PART 2's rule is kept so that every engine derives the text one way;
- **G2** lowercased (Unicode default case mapping);
- **G3** with every character removed that is not a letter, a mark, a number, connector punctuation (`_`), U+0020 SPACE or `-`;
- **G4** with each SPACE replaced by `-`;
- **G5** DEDUPLICATED over every heading the target writes, linked or not, in the order it writes them. Each base keeps a count starting at 0. A base not yet taken is the slug. Otherwise the count is raised by one and `-` plus the count appended, repeating while the result is taken; the result is then taken too.

THE REFERENCE IS STILL RECOGNIZED BY THE ID THE DOCUMENT ASSIGNED. A fragment names a heading when it equals that heading's id, explicit or derived under PART 2; only the WRITTEN destination is the slug. A heading the target does not write as a heading (one flattened into a table cell) is not a target, and a fragment naming no heading is [CARVE-P11-049](#carve-p11-049)'s.

NO ANCHOR CAN DANGLE. The target writes no anchor at all, and the reader derives each slug from text the target wrote, so every link to a heading resolves in a GFM reader (carve#352). A heading whose text removes to nothing has the empty slug, and a link to it is written `#`, or `#-1` and so on for a repeat.

A CROSS-REFERENCE CONTRIBUTES NOTHING TO THE TEXT, as PART 2 says: by the time this target runs, resolution has replaced `</#a>` with a link carrying the target heading's text, and counting it would slug `# A </#a>` as `a-a`.

THE SCAN INCLUDES FOOTNOTE DEFINITION BODIES. They render as block content, so a heading or a reference inside one is a heading or a reference.

### CARVE-P11-049

**The Markdown target keeps a fragment link.**

A `link` whose destination is a fragment (`#id`) is emitted as a Markdown link whether or not `id` names a heading. The author wrote the destination, so it is content: writing the label alone drops it, and a reader of the Markdown loses a link the HTML target keeps.

``` text
{#h}
## Head                   ->  ## Head

See [head](#h), [three](#chap03) and [gone](#nowhere).
                          ->  See [head](#head), [three](#chap03) and [gone](#nowhere).
```

A FRAGMENT THAT NAMES NO HEADING ADDS NO ANCHOR ANYWHERE: the target writes no ids, so `#chap03` above points at an id the Markdown does not carry. The link is kept anyway, because a page that embeds the Markdown can carry the id, and dropping the destination cannot be undone.

THE DESTINATION IS WRITTEN LIKE ANY OTHER. A fragment that names a heading is the heading's GFM slug ([CARVE-P11-038](#carve-p11-038)); any other fragment is the authored destination under the ordinary destination encoding, `#` alone included.

THE LABEL IS WRITTEN LIKE ANY OTHER LINK LABEL. `[[1]](#n1)` is emitted as `[\[1\]](#n1)`, with both text brackets escaped inside the label.

A CROSS-REFERENCE IS OUTSIDE THIS CLAUSE. [CARVE-P11-038](#carve-p11-038) still writes a resolved cross-reference to a target that is not a heading as its display text; this clause changes only the `link` node.
