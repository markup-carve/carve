# Upgrading from Carve 0.1 to Carve 0.2

This is a non-normative guide. Carve 0.2 is still a draft. The [0.2 specification](README.md) defines behavior. The [upgrade map](data/upgrade-map.json) holds the source and tree changes in these tables. Its source examples are literal strings with line breaks. `SILENT` means unchanged 0.1 source still parses in 0.2 but produces different HTML. Review those entries even when a document has no syntax error.

## Part 1. Authors: your documents

| Check first | 0.1 habit | 0.2 result | Action |
| --- | --- | --- | --- |
| Blocks under text | A heading, quote, definition, or attribute line could start a block at once. | Most such lines continue the paragraph. | Insert a blank line; `U-001` to `U-010`. **SILENT** |
| Lists | `+`, `{loose}`, marker columns, and task boxes controlled list shape. | Blank lines and content columns control shape; mixed task and plain items share a list. | Run the tool, then inspect list HTML; `U-014` to `U-030`, `U-117` to `U-119`. **SILENT** |
| Breaks, fences, tables | `---`, `___`, `~~~`, and GFM separator rows had special meanings. | These are text, typography, or table rows. | Use `***`, backticks, and 0.2 cell marks; `U-044` to `U-062`, `U-116`. **SILENT** |
| Inline | Bare `_`, `~`, `=`, substitution, flags, and references changed. | Several now print literally or gain a new interpretation. | Use braced spans and inspect escapes; `U-065` to `U-075`, `U-101` to `U-115`. **SILENT** |
| Raw HTML | Raw block and span forms emitted HTML by default. | `rawHtml` defaults to false and escapes it. | Decide whether the host may enable `rawHtml`; `U-076`, `U-077`, `U-079`. **SILENT** |

The tables below enumerate every entry in the shipped tool contract. The “0.2 unchanged” column shows the beginning of HTML from the 0.2 renderer for the first contract input. It is a rendering observation, not a proposed source spelling. The full input, output, and rendered HTML are in the map. A row marked `none` needs no source edit. A `report` needs a person. `rewrite` changes the spelling. `escape` keeps old literal text literal. The tool may report a case even when it cannot preserve its exact HTML.

### Source change index


#### Paragraphs and blocks

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-001 | Heading directly under text **SILENT** | &lt;p&gt;Some text ⏎ # Heading&lt;/p&gt; | Some text ⏎ ⏎ # Heading ⏎ ; rewrite |
| U-002 | Quote directly under text **SILENT** | &lt;p&gt;Some text ⏎ &gt; quote&lt;/p&gt; | Some text ⏎ ⏎ &gt; quote ⏎ ; rewrite |
| U-003 | Attribute line directly under text **SILENT** | &lt;p&gt;Some text ⏎ {.x} ⏎ Next block&lt;/p&gt; | Some text ⏎ ⏎ {.x} ⏎ Next block ⏎ ; rewrite |
| U-004 | Description list directly under text **SILENT** | &lt;p&gt;Some text ⏎ :: term ⏎ : description&lt;/p&gt; | Some text ⏎ ⏎ :: term ⏎ : description ⏎ ; rewrite |
| U-005 | Definition directly under text **SILENT** | &lt;p&gt;Some text ⏎ [ref]: https://example.com&lt;/p&gt; ⏎ &lt;p&gt;See [ref][].&lt;/p&g… | Some text ⏎ ⏎ [ref]: https://example.com ⏎ ⏎ See [ref][]. ⏎ ; rewrite |
| U-006 | Heading or quote at column 0 directly under item text **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt;item text ⏎ # Heading&lt;/li&gt; ⏎ &lt;/ul&gt; | - item text ⏎ ⏎ # Heading ⏎ ; rewrite |
| U-007 | List marker without the quote mark under a list in a quote **SILENT** | &lt;blockquote&gt; ⏎ &lt;ul&gt; ⏎ &lt;li&gt;a ⏎ - b&lt;/li&gt; ⏎ &lt;/ul&gt; ⏎ &lt;/block… | &gt; - a ⏎ ⏎ - b ⏎ ; rewrite |
| U-008 | List marker directly after description text **SILENT** | &lt;dl&gt; ⏎ &lt;dt&gt;term&lt;/dt&gt; ⏎ &lt;dd&gt;desc ⏎ - item&lt;/dd&gt; ⏎ &lt;/dl&gt; | :: term ⏎ : desc ⏎ ⏎ - item ⏎ ; rewrite |
| U-009 | Term mark directly under item text **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt;text ⏎ :: term ⏎ : desc&lt;/li&gt; ⏎ &lt;/ul&gt; | - text ⏎ ⏎ :: term ⏎ : desc ⏎ ; rewrite |
| U-010 | Block directly under a caption line **SILENT** | &lt;table&gt; ⏎ &lt;caption&gt;Caption ⏎ 1 Heading&lt;/caption&gt; ⏎ &lt;tbody&gt; ⏎ &lt;… | \| a \| b \| ⏎ ^ Caption ⏎ ⏎ # Heading ⏎ ; rewrite |
| U-011 | Include directive | &lt;p&gt;Some text ⏎ {{ other.crv }}&lt;/p&gt; | Review by hand; report |
| U-012 | List marker directly under text at the top level | &lt;p&gt;Some text ⏎ - item&lt;/p&gt; | Keep it; none |
| U-013 | Table row, fence line or &#96;***&#96; directly under text | &lt;p&gt;Some text&lt;/p&gt; ⏎ &lt;table&gt; ⏎ &lt;tbody&gt; ⏎ &lt;tr&gt;&lt;td&gt;a&lt;/… | Keep it; none |

#### Lists

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-014 | &#96;+&#96; line before a block in an item **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt;step one ⏎ + ⏎ &gt; a note&lt;/li&gt; ⏎ &lt;li&gt;step two&lt;/li&… | - step one ⏎ ⏎ &gt; a note ⏎ - step two ⏎ ; rewrite |
| U-015 | &#96;+&#96; line before a paragraph in an item **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt;a ⏎ + ⏎ second&lt;/li&gt; ⏎ &lt;li&gt;b&lt;/li&gt; ⏎ &lt;/ul&gt; | - a ⏎ ⏎ second ⏎ - b ⏎ ; rewrite |
| U-016 | &#96;+&#96; line in a quote **SILENT** | &lt;blockquote&gt;&lt;p&gt;quoted ⏎ + ⏎ - a list inside the quote&lt;/p&gt;&lt;/blockquot… | &gt; quoted ⏎ &gt; ⏎ &gt; - a list inside the quote ⏎ ; rewrite |
| U-017 | &#96;+&#96; as the first block of an item **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt;+ ⏎ &lt;pre&gt;&lt;code&gt;code ⏎ &lt;/code&gt;&lt;/pre&gt; ⏎ &lt;… | - &#96;&#96;&#96; ⏎ code ⏎ &#96;&#96;&#96; ⏎ - two ⏎ ; rewrite |
| U-018 | Blank line inside an item makes the list loose **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt;a ⏎ &lt;p&gt;second&lt;/p&gt; ⏎ &lt;/li&gt; ⏎ &lt;li&gt;b&lt;/li&g… | - a ⏎ ⏎ second ⏎ ⏎ - b ⏎ ; rewrite |
| U-019 | Later paragraph of a tight item **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt; ⏎ &lt;h1 id="Heading"&gt;Heading&lt;/h1&gt; ⏎ &lt;p&gt;more&lt;/p… | Review by hand; report |
| U-020 | &#96;{loose}&#96; on a list with several items **SILENT** | &lt;ul loose=""&gt; ⏎ &lt;li&gt;a&lt;/li&gt; ⏎ &lt;li&gt;b&lt;/li&gt; ⏎ &lt;/ul&gt; | - a ⏎ ⏎ - b ⏎ ; rewrite |
| U-021 | Loose list with one item **SILENT** | &lt;ul loose=""&gt; ⏎ &lt;li&gt;Note text.&lt;/li&gt; ⏎ &lt;/ul&gt; | Review by hand; report |
| U-022 | Right-aligned ordered markers | &lt;ol start="9"&gt; ⏎ &lt;li&gt;a&lt;/li&gt; ⏎ &lt;li&gt;b&lt;/li&gt; ⏎ &lt;/ol&gt; |  9. a ⏎ 10. b ⏎ ; rewrite |
| U-023 | Marker indented less than the content column of the item above **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt;item text ⏎ 3. child&lt;/li&gt; ⏎ &lt;/ul&gt; | - item text ⏎ 3. child ⏎ ; rewrite |
| U-024 | Alphabetic list that starts at &#96;i&#96; **SILENT** | &lt;ol type="i" data-delim=")"&gt; ⏎ &lt;li&gt;one&lt;/li&gt; ⏎ &lt;/ol&gt; ⏎ &lt;ol type… | {start=9} ⏎ a) one ⏎ b) two ⏎ ; rewrite |
| U-025 | Ordered marker of ten or more digits **SILENT** | &lt;p&gt;1234567890. x&lt;/p&gt; | {start=1234567890} ⏎ . x ⏎ ; rewrite |
| U-026 | Comment block at column 0 between two items **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt;a&lt;/li&gt; ⏎ &lt;/ul&gt; ⏎ &lt;ul&gt; ⏎ &lt;li&gt;b&lt;/li&gt; ⏎… | - a ⏎ %%% ⏎ x ⏎ %%% ⏎ - b ⏎ ; rewrite |
| U-027 | Three blank lines between two lists | &lt;ul&gt; ⏎ &lt;li&gt;a&lt;/li&gt; ⏎ &lt;/ul&gt; ⏎ &lt;ul&gt; ⏎ &lt;li&gt;b&lt;/li&gt; ⏎… | Keep it; none |
| U-028 | &#96;-&#96; and &#96;*&#96; items | &lt;ul&gt; ⏎ &lt;li&gt;one&lt;/li&gt; ⏎ &lt;/ul&gt; ⏎ &lt;ul&gt; ⏎ &lt;li&gt;two&lt;/li&g… | Keep it; none |
| U-029 | Comment-only line between items, uneven marker columns, empty task box, &#96;- -&#96; | &lt;ul&gt; ⏎ &lt;li&gt;a&lt;/li&gt; ⏎ &lt;li&gt;b&lt;/li&gt; ⏎ &lt;/ul&gt; | Keep it; none |
| U-030 | Uppercase letter marker | &lt;p&gt;A. Smith went home.&lt;/p&gt; ⏎ &lt;ol type="A"&gt; ⏎ &lt;li&gt;one&lt;/li&gt; ⏎… | Keep it; none |

#### Attributes

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-031 | Attribute line above a blank line **SILENT** | &lt;p&gt;{.note}&lt;/p&gt; ⏎ &lt;p&gt;Paragraph.&lt;/p&gt; | {.note} ⏎ Paragraph. ⏎ ; rewrite |
| U-032 | Attribute block over several lines **SILENT** | &lt;p&gt;{.a ⏎ .b} ⏎ Paragraph.&lt;/p&gt; | {.a .b} ⏎ Paragraph. ⏎ ; rewrite |
| U-033 | Attribute line between two items **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt;a ⏎ {.x}&lt;/li&gt; ⏎ &lt;li&gt;b&lt;/li&gt; ⏎ &lt;/ul&gt; | - a ⏎ ⏎ {.x} ⏎ - b ⏎ ; rewrite |
| U-034 | Attribute line that reaches no block **SILENT** | &lt;p&gt;Paragraph.&lt;/p&gt; ⏎ &lt;p&gt;{.x}&lt;/p&gt; | Paragraph. ⏎ ; rewrite |
| U-035 | Glued and stacked attribute blocks, empty braces **SILENT** | &lt;p id="b" class="a"&gt;Paragraph.&lt;/p&gt; | Keep it; none |
| U-036 | Order of attributes in HTML **SILENT** | &lt;p id="b" class="a"&gt;Paragraph.&lt;/p&gt; ⏎ &lt;p&gt;&lt;span id="b" class="a"&gt;x&… | Review by hand; report |
| U-037 | Attribute block after a fence language or an admonition name | &lt;pre&gt;&lt;code class="language-js"&gt;code ⏎ &lt;/code&gt;&lt;/pre&gt; ⏎ &lt;aside c… | &#96;&#96;&#96;js ⏎ code ⏎ &#96;&#96;&#96; ⏎ ⏎ ::: note ⏎ body ⏎ ::: ⏎ ; rewrite |

#### Definitions

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-038 | Definition inside a quote or an item **SILENT** | &lt;blockquote&gt; ⏎ &lt;p&gt;See [ref][].&lt;/p&gt; ⏎ &lt;p&gt;[ref]: https://example.co… | &gt; See [ref][]. ⏎ ⏎ [ref]: https://example.com ⏎ ⏎ Outside [ref][]. ⏎ ; rewrite |
| U-039 | Indented definition at the top level **SILENT** | &lt;p&gt;Text [a][].&lt;/p&gt; ⏎ &lt;p&gt;[a]: /u&lt;/p&gt; | Text [a][]. ⏎ ⏎ [a]: /u ⏎ ; rewrite |
| U-040 | Duplicate link definition **SILENT** | &lt;p&gt;&lt;a href="/one"&gt;x&lt;/a&gt;&lt;/p&gt; | [a]: /two ⏎ ⏎ [x][a] ⏎ ; rewrite |
| U-041 | Duplicate abbreviation definition **SILENT** | &lt;p&gt;&lt;abbr title="First"&gt;HTML&lt;/abbr&gt; here.&lt;/p&gt; | *[HTML]: Second ⏎ ⏎ HTML here. ⏎ ; rewrite |
| U-042 | Definitions that read the same | &lt;p&gt;Text&lt;a id="fnref1" href="#fn1" role="doc-noteref"&gt;&lt;sup&gt;1&lt;/sup&gt;… | Keep it; none |

#### Headings

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-043 | &#96;#&#96; headings, closing hashes, brace text, seven markers | &lt;section id="One"&gt; ⏎ &lt;h1&gt;One&lt;/h1&gt; ⏎ &lt;/section&gt; ⏎ &lt;section id="… | Keep it; none |

#### Breaks

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-044 | Hyphen or underscore run **SILENT** | &lt;p&gt;para&lt;/p&gt; ⏎ &lt;p&gt;—&lt;/p&gt; ⏎ &lt;p&gt;next&lt;/p&gt; ⏎ &lt;p&gt;___&l… | para ⏎ ⏎ *** ⏎ ⏎ next ⏎ ⏎ *** ⏎ ⏎ *** ⏎ ; rewrite |
| U-045 | Spaced breaks **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt; ⏎ &lt;ul&gt; ⏎ &lt;li&gt;*&lt;/li&gt; ⏎ &lt;/ul&gt; ⏎ &lt;/li&gt;… | *** ⏎ ⏎ *** ⏎ ; rewrite |
| U-046 | Spaced underscores, stars under an item | &lt;p&gt;_ _ _&lt;/p&gt; | Keep it; none |

#### Frontmatter

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-047 | Format names, the space before them, unclosed frontmatter | &lt;p&gt;text&lt;/p&gt; | Keep it; none |
| U-048 | Unknown format name | &lt;p&gt;text&lt;/p&gt; | Keep it; none |

#### Fences, quotes, comments

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-049 | Fence closer at another indent **SILENT** | &lt;pre&gt;&lt;code&gt;code ⏎ &lt;/code&gt;&lt;/pre&gt; ⏎ &lt;p&gt;after&lt;/p&gt; | &#96;&#96;&#96;&#96; ⏎ code ⏎ &#96;&#96;&#96; ⏎ after ⏎ &#96;&#96;&#96;&#96; ⏎ ; rewrite |
| U-050 | &#96;%%%&#96; closer followed by text **SILENT** |  | %%% ⏎ hidden ⏎ visible? ⏎ %%% ⏎ after ⏎ ; rewrite |
| U-051 | Unquoted words after a fence language or a div name | &lt;pre&gt;&lt;code class="language-js"&gt;code ⏎ &lt;/code&gt;&lt;/pre&gt; ⏎ &lt;aside c… | &#96;&#96;&#96;js ⏎ code ⏎ &#96;&#96;&#96; ⏎ ⏎ ::: note ⏎ body ⏎ ::: ⏎ ; rewrite |
| U-052 | &#96;%%&#96; line inside a line block **SILENT** | &lt;div class="line-block"&gt; ⏎ &lt;p&gt;one&lt;br&gt; ⏎ %% hidden&lt;br&gt; ⏎ two&lt;/p… | ::: \| ⏎ one ⏎ {% hidden %} ⏎ two ⏎ ::: ⏎ ; rewrite |
| U-053 | Tab in code under a container **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt;item ⏎ &lt;pre&gt;&lt;code&gt;x ⏎ y ⏎ &lt;/code&gt;&lt;/pre&gt; ⏎ … | - item ⏎ ⏎ &#96;&#96;&#96; ⏎ x ⏎ y ⏎ &#96;&#96;&#96; ⏎ ; rewrite |
| U-054 | Fence and div spellings that read the same | &lt;pre title="T"&gt;&lt;code class="language-js"&gt;code ⏎ &lt;/code&gt;&lt;/pre&gt; | Keep it; none |

#### Tables

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-055 | GFM separator row **SILENT** | &lt;table&gt; ⏎ &lt;tbody&gt; ⏎ &lt;tr&gt;&lt;td&gt;a&lt;/td&gt;&lt;td&gt;b&lt;/td&gt;&lt… | \|= a \|={&gt;} b \| ⏎ \| 1 \| 2 \| ⏎ ; rewrite |
| U-056 | Glued alignment marks **SILENT** | &lt;table&gt; ⏎ &lt;thead&gt; ⏎ &lt;tr&gt;&lt;th scope="col"&gt;&lt; a&lt;/th&gt;&lt;th s… | \|={&lt;} a \|={&gt;} b \|={~} c \| ⏎ \| 1 \| 2 \| 3 \| ⏎ ; rewrite |
| U-057 | Escaped last pipe **SILENT** | &lt;p&gt;\| a \| b \|&lt;/p&gt; | \| a \| b \\| \| ⏎ ; rewrite |
| U-058 | &#96;header-rows&#96; on a pipe table **SILENT** | &lt;table&gt; ⏎ &lt;tbody&gt; ⏎ &lt;tr&gt;&lt;td&gt;a&lt;/td&gt;&lt;td&gt;b&lt;/td&gt;&lt… | \|= a \|= b \| ⏎ \| 1 \| 2 \| ⏎ ; rewrite |
| U-059 | &#96;footer-rows&#96; on a table with only a header row **SILENT** | &lt;table&gt; ⏎ &lt;thead&gt; ⏎ &lt;tr&gt;&lt;th scope="col"&gt;a&lt;/th&gt;&lt;th scope=… | Review by hand; report |
| U-060 | Row span into the head **SILENT** | &lt;table&gt; ⏎ &lt;thead&gt; ⏎ &lt;tr&gt;&lt;th scope="col"&gt;a&lt;/th&gt;&lt;th scope=… | Review by hand; report |
| U-061 | Delimited table with bad quoting **SILENT** | &lt;table&gt; ⏎ &lt;thead&gt; ⏎ &lt;tr&gt;&lt;th scope="col"&gt;a&lt;/th&gt;&lt;th scope=… | Review by hand; report |
| U-062 | Table forms that read the same | &lt;p&gt;\| a \| b ⏎ \| c \| d&lt;/p&gt; | Keep it; none |

#### Captions

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-063 | Caption after a blank line **SILENT** | &lt;table&gt; ⏎ &lt;tbody&gt; ⏎ &lt;tr&gt;&lt;td&gt;a&lt;/td&gt;&lt;td&gt;b&lt;/td&gt;&lt… | \| a \| b \| ⏎ ^ Caption ⏎ ; rewrite |
| U-064 | Captions that read the same | &lt;figure&gt; ⏎ &lt;pre&gt;&lt;code class="language-js"&gt;let x = 1 ⏎ &lt;/code&gt;&lt;… | Keep it; none |

#### Inline emphasis and typography

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-065 | Bare underline **SILENT** | &lt;p&gt;an _underlined_ word and snake_case and _id&lt;/p&gt; | an {_underlined_} word and snake_case and _id ⏎ ; rewrite |
| U-066 | Bare strike **SILENT** | &lt;p&gt;a ~struck~ word and ~/config&lt;/p&gt; | a {~struck~} word and ~/config ⏎ ; rewrite |
| U-067 | Bare highlight **SILENT** | &lt;p&gt;a =marked= word and x =1, y= 2&lt;/p&gt; | a {=marked=} word and x {=1, y=} 2 ⏎ ; rewrite |
| U-068 | Emphasis outside strong **SILENT** | &lt;p&gt;&lt;em&gt;&lt;strong&gt;bold italic&lt;/strong&gt;&lt;/em&gt; and &lt;strong&gt;… | */bold italic/* and */bold italic/* ⏎ ; rewrite |
| U-069 | Substitution arrow **SILENT** | &lt;p&gt;&lt;s&gt;old~&gt;new&lt;/s&gt;&lt;/p&gt; | {-old-}{+new+} ⏎ ; rewrite |
| U-070 | Delimiter inside a braced span that closes an outer span **SILENT** | &lt;p&gt;&lt;strong&gt;bold {/note&lt;/strong&gt;/} more*&lt;/p&gt; | *bold {/note\*/} more* ⏎ ; rewrite |
| U-071 | Single opening quote with no closer **SILENT** | &lt;p&gt;said ‘Bob and left.&lt;/p&gt; | said ’Bob and left. ⏎ ; rewrite |
| U-072 | Editorial comment that starts like an id **SILENT** | &lt;p&gt;a*{#b} c #}&lt;/p&gt; | Review by hand; report |
| U-073 | Sigil after a letter or number **SILENT** | &lt;p&gt;see config:items[0] and :smile: and x:smile:&lt;/p&gt; | Review by hand; report |
| U-074 | Inline spellings that read the same | &lt;p&gt;***bold italic*** here&lt;/p&gt; | Keep it; none |

#### References and footnotes

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-075 | References that read the same | &lt;p&gt;See &lt;a id="fnref1" href="#fn1" role="doc-noteref"&gt;&lt;sup&gt;1&lt;/sup&gt;… | Keep it; none |

#### HTML

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-076 | Raw HTML block **SILENT** | &lt;pre&gt;&lt;code class="language-html"&gt;&lt;b&gt;x&lt;/b&gt; ⏎ &lt;/code&gt;&lt;/pre… | Review by hand; report |
| U-077 | Raw HTML span **SILENT** | &lt;p&gt;a &lt;b&gt;x&lt;/b&gt; b&lt;/p&gt; | Review by hand; report |
| U-078 | Bare HTML tag | &lt;p&gt;a &lt;b&gt;bold&lt;/b&gt; tag&lt;/p&gt; | Keep it; none |

#### Host options

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-079 | Render options of the host | Host options must be reviewed | Review by hand; report |

#### New block shapes

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-101 | &#96;=&#96; at the start of a paragraph, an item or a quote **SILENT** | &lt;section id="s-4-is-the-answer"&gt; ⏎ &lt;h1&gt;4 is the answer&lt;/h1&gt; ⏎ &lt;p&gt;… | \= 4 is the answer ⏎ and more. ⏎ ; escape |
| U-102 | Indented line directly under a heading **SILENT** | &lt;section id="Heading-indented-text"&gt; ⏎ &lt;h1&gt;Heading ⏎ indented text&lt;/h1&gt;… | # Heading ⏎ indented text ⏎ ; escape |
| U-103 | Letter marker with one space **SILENT** | &lt;ol type="a"&gt; ⏎ &lt;li&gt;one&lt;/li&gt; ⏎ &lt;li&gt;two&lt;/li&gt; ⏎ &lt;/ol&gt; | a\. one ⏎ b. two ⏎ ; escape |
| U-104 | Quote fence or line block with a title **SILENT** | &lt;blockquote&gt;&lt;p&gt;quoted&lt;/p&gt;&lt;/blockquote&gt; | \::: &gt; "T" ⏎ quoted ⏎ ::: ⏎ ; escape |
| U-105 | Raw fence with a title **SILENT** | &lt;pre&gt;&lt;code class="language-html"&gt;&lt;b&gt;x&lt;/b&gt; ⏎ &lt;/code&gt;&lt;/pre… | {%%}&#96;&#96;&#96;=html "T" ⏎ &lt;b&gt;x&lt;/b&gt; ⏎ &#96;&#96;&#96; ⏎ ; escape |
| U-106 | Text line directly under a term **SILENT** | &lt;dl&gt; ⏎ &lt;dt&gt;term ⏎ more term text&lt;/dt&gt; ⏎ &lt;dd&gt;first description&lt;… | :: term ⏎ ⏎ more term text ⏎ : first description ⏎ ; escape |
| U-107 | Second caret line under a caption **SILENT** | &lt;table&gt; ⏎ &lt;caption&gt;first ⏎ ^ second&lt;/caption&gt; ⏎ &lt;tbody&gt; ⏎ &lt;tr&… | \| a \| b \| ⏎ ^ first ⏎ ⏎ ^ second ⏎ ; escape |
| U-108 | Row attribute one space after the closing pipe **SILENT** | &lt;table&gt; ⏎ &lt;tbody&gt; ⏎ &lt;tr class="r"&gt;&lt;td&gt;a&lt;/td&gt;&lt;td&gt;b&lt;… | \| a \| b \| \{.r} ⏎ ; escape |
| U-109 | Line indented short of the content column after a blank line **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt;item ⏎ &lt;p&gt;second paragraph&lt;/p&gt; ⏎ &lt;/li&gt; ⏎ &lt;/ul… | - item ⏎ ⏎ second paragraph ⏎ ; escape |

#### New inline shapes

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-110 | Full reference whose label is a heading **SILENT** | &lt;section id="My-Heading"&gt; ⏎ &lt;h1&gt;My Heading&lt;/h1&gt; ⏎ &lt;p&gt;See &lt;a hr… | # My Heading ⏎ ⏎ See [My Heading][] and \[the text][My Heading]. ⏎ ; escape |
| U-111 | Reference label that wraps **SILENT** | &lt;p&gt;See &lt;a href="/u"&gt;the text&lt;/a&gt; here.&lt;/p&gt; | See \[the text][a long ⏎ label] here. ⏎ ⏎ [a long label]: /u ⏎ ; escape |
| U-112 | Reference label that starts with a caret **SILENT** | &lt;p&gt;See [x]&lt;a id="fnref1" href="#fn1" role="doc-noteref"&gt;&lt;sup&gt;1&lt;/sup&… | See [x]\[^n]. ⏎ ⏎ [^n]: Note. ⏎ ; escape |
| U-113 | Markup inside an unresolved reference **SILENT** | &lt;p&gt;See [&lt;strong&gt;b&lt;/strong&gt; and &lt;em&gt;i&lt;/em&gt;][nope] and [&lt;c… | See [\*b\* and \/i\/][nope] and [\&#96;c\&#96;][]. ⏎ ; escape |
| U-114 | New spellings that 0.1 already had | &lt;ol&gt; ⏎ &lt;li&gt;first&lt;/li&gt; ⏎ &lt;li&gt;second&lt;/li&gt; ⏎ &lt;/ol&gt; | Keep it; none |
| U-115 | Hyphen run 0.1 kept as typed, and the braced en dash **SILENT** | &lt;p&gt;a{–}b and –flag&lt;/p&gt; | a--b and -\-flag ⏎ ; escape |

#### Later rulings

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-116 | Tilde fence **SILENT** | &lt;p&gt;~~~js ⏎ x ⏎ ~~~&lt;/p&gt; | &#96;&#96;&#96;js ⏎ x ⏎ &#96;&#96;&#96; ⏎ ; rewrite |
| U-117 | List of task items next to a list of plain items **SILENT** | &lt;ul class="task-list"&gt; ⏎ &lt;li class="task"&gt;&lt;input type="checkbox" disabled … | - [ ] a ⏎ ⏎ ⏎ ⏎ - b ⏎ ; rewrite |
| U-118 | Uppercase marker with a dot and one space | &lt;p&gt;II. Background&lt;/p&gt; | Keep it; none |
| U-119 | List marker left of every open list under item text | &lt;ul&gt; ⏎ &lt;li&gt;a&lt;/li&gt; ⏎ &lt;li&gt;b&lt;/li&gt; ⏎ &lt;/ul&gt; | Keep it; none |

### Worked source changes

These before and after pairs were rendered on both engines. The after text is the tool's actual output.

A heading directly below text is a lazy paragraph line in 0.2 (`U-001`).

Before:

```carve
Some text
# Heading
```

After:

```carve
Some text

# Heading
```

The 0.1 and upgraded 0.2 output is a paragraph followed by `<section id="Heading"><h1>Heading</h1></section>`. Without the blank line, 0.2 prints `# Heading` inside the paragraph.

Bare underline, strike, and highlight need braces (`U-065` to `U-067`). For example, the tool changes:

```carve
an _underlined_ word and snake_case and _id
```

into:

```carve
an {_underlined_} word and snake_case and _id
```

Both render `<u>underlined</u>`. An unchanged `_underlined_` prints as text in 0.2. For strong emphasis containing emphasis, `/*text*/` becomes `*/text/*` (`U-068`); the nesting of `<strong>` and `<em>` otherwise reverses. Substitution `{~old~>new~}` becomes `{-old-}{+new+}` (`U-069`). Bare flags such as `--flag` need a code span or an escaped second hyphen. The tool writes `-\-flag` (`U-115`).

The backtick is the only code fence marker in 0.2 (`U-116`):

Before:

````carve
~~~js
x
~~~
````

After:

````carve
```js
x
```
````

Both produce `<pre><code class="language-js">x` followed by a newline and `</code></pre>`. Unchanged `~~~js` is paragraph text. A body with a backtick run needs a longer backtick fence; the tool measures it.

Task and plain items now share one list (`U-117`). The tool puts four line breaks between adjacent lists to keep the 0.1 HTML list boundaries. This exact output came from its first contract example:

```carve
- [ ] a



- b
```

This preserves two lists, but the 0.2 engine adds `class="task"` on the boxed item. If one mixed list is what you want, keep the original two lines and update the page CSS. In a new document, one mixed list is valid. An uppercase ordered marker with a dot needs two spaces after it, including roman numerals (`U-118`). Right-aligned numbers such as ` 9.` and `10.` form one ordered list (`U-022`, `U-119`).

A 0.2 heading may start with `=` and continue on indented lines. For example, `= Heading` followed by two spaces and `continued` makes one heading. The 0.1 engine treats those lines as a paragraph. The 0.2 formatter accepts `normalize: true` to choose its canonical spelling when the source layout offered alternatives; `carve fmt --normalize` is a specified command, but a 0.2 CLI is not shipped yet.

### Running the rewrite tool

From a checkout of `carve-js` on `next2`, build the 0.1 engine once with `npm ci` and `npm run build`, then run:

```sh
node upgrade/src/cli.ts --check docs/intro.crv
node upgrade/src/cli.ts --json docs/intro.crv
node upgrade/src/cli.ts --write docs/intro.crv
```

Use the real path to each file. Without `--write`, one file's upgraded source goes to stdout and the report goes to stderr. `--json` puts the report on stdout. `--check` writes nothing and exits 1 if a change or human review is needed. Exit 2 is a usage error. This is a separate tool in `upgrade/`; it is not a 0.2 engine CLI.

For the first heading example, `--json` returns a file record with `changed: true`, `check: "pass"`, and a record with `entry: "U-001"`, `class: "rewrite"`, `line: 2`, and `lint: "block-opener-without-blank-line"`. The full report also names the pinned 0.1 engine, currently `0.1.17`. `report` and `escape` records need the same review as rewrites. `U-019` summarizes extra list paragraph elements once per file. `U-079` reminds you to migrate host render options.

The tool renders the old input in 0.1 and the proposed output in 0.2. It compares after sorting attributes, ignoring whitespace between tags, and ignoring the new `task` class. `upgrade-mismatch` means an HTML difference is not explained by a contract entry. Without `--force`, `--write` leaves that file alone. `--force` writes the proposed text despite the difference; inspect the HTML before using it. Two edits on the same span produce `upgrade-conflict`; the lower entry ID wins. The tool reads only 0.1 source. **Run it once per file. It is not idempotent.** A second run can change already upgraded list text.

### Repository checklist

1. Make a copy or branch and inventory every `.crv` file, including generated and included documents.
2. Run `--check`, then `--json` for each file. Record all `report`, `upgrade-conflict`, and `upgrade-mismatch` entries.
3. Run `--write` once on the 0.1 files. Review every `SILENT` row above, especially list shape, punctuation, references, raw HTML, and host options.
4. Render representative pages with both engines. Compare selectors, generated ids, links, and page scripts. Review differences that the tool's normalized comparison hides, including attribute order and the `task` class.
5. Decide how the application will handle includes, lint, extensions, importers, and non-HTML output before switching its runtime.
6. Keep the upgraded source and the tool's JSON report together in review. Do not feed upgraded files into the tool again.

## Part 2. Integrators: your code and your pages

| Surface | 0.1 | 0.2 action |
| --- | --- | --- |
| JavaScript | One large package API with parse, resolve, render, import, lint, and extension helpers. | Port to `v2/src/index.ts` functions. The `v2/` engine is not the package root yet. |
| HTML | Existing section, list, table, footnote, and raw HTML conventions. | Compare rendered pages and update CSS and scripts. The source rewrite check hides some HTML changes. |
| CLI | `dist/cli.js` offers render, fmt, lint, flatten, fix, diff, merge, portability, trace, and migrate. | There is no 0.2 CLI yet. The upgrade tool has its own CLI. |
| Missing runtime features | Lint, extension pipeline, include expansion, importers, and other output formats work in 0.1. | Keep the 0.1 path or postpone switching those callers. |

### JavaScript API

The 0.2 entry point is `carve-js/v2/src/index.ts` in this checkout. The current npm package root still exports 0.1. These are the function replacements for the main public workflows.

| 0.1 public function | 0.2 counterpart or action |
| --- | --- |
| `carveToHtml(source, options)` | `render(source, options)`; pass only 0.2 options. |
| `parse(source, options)` | `parseTree(source, options)` for syntax only, or `parse(source, options)` for a resolved document. |
| `resolve(document, options)` | `resolveTree(parsedOrDocument, options)`; use its result with `renderTree`. |
| `renderHtml(document, options)` | `render(document, options)`, or `renderTree(resolveTree(document, options))`. |
| `renderDocument`, `renderDocumentWithReport` | `render` or `renderWithDiagnostics`; the old grouped entry points are absent. |
| `carveToHtmlWithReport`, `renderHtmlWithReport` | `renderWithDiagnostics`; inspect `html` and `diagnostics`. |
| `carveToAstJson`, `toAstJson`, `toAstEnvelope` | `parse` plus `encodeTree` or `encodeEnvelope`; the 2.0 schema differs. |
| `fromAstJson`, `fromAstEnvelope` | `decodeTree`; it accepts a 2.0 bare tree or envelope and refuses 1.x. |
| `parseWithSourceLayout`, `toSourceLayout` | `parseWithLayout`; use its `document`, `layout`, and `diagnostics`. |
| `renderCarve`, `carveToCarve`, `renderCarveWithReport`, `carveToCarveWithReport` | `write` or `writeWithDiagnostics` for a 2.0 tree. |
| `carveToCarvePatch`, `createSourcePatch`, `applySourcePatch` | No 0.2 patch API; keep a 0.1 caller or implement the edit outside the engine. |
| `renderMarkdown`, `renderPlainText`, `renderAnsi` and each `carveTo*` or `*WithReport` variant | No 0.2 renderer for those targets. |
| `carveToMarkdown`, `carveToPlainText`, `carveToAnsi` and report variants | No 0.2 counterpart. |
| `parseWithProvenance`, `createEditorSession`, `astNodePaths`, node identity, provenance and annotation-range helpers | No 0.2 counterpart. `parseWithLayout` covers source layout only. |
| `diffAst`, `mergeAst`, `createAstPatch`, `applyAstPatch`, reversible patch and change-format helpers | No 0.2 counterpart. |
| `lintCarve`, `lintIncludes`, `lintAccessibility`, `formatLintWarnings` | No 0.2 lint runner yet. `parseWithDiagnostics` reports parser and resolution findings. |
| `htmlToAst`, `htmlToCarve`, `markdownToCarve`, `djotToCarve`, `bbcodeToCarve`, every `migrate*` helper | No 0.2 importer. |
| `expandIncludes`, `findDirectiveSites`, `parseDirective`, include helpers | No include expansion in the 0.2 engine. An `include` node remains in the tree. |
| `Profile`, `LinkPolicy`, `applyProfile` | Use the 0.2 `profile` option; no public mutable profile object API. |
| `checkPortability`, `normalizeHtml`, `assessTablePreservation`, `carveToPreservationReport` | No 0.2 counterpart. |
| `stampCarve`, stamp/read/version helpers, `decisionTrace`, `tabNormalize` | No 0.2 counterpart. |
| Extension factories such as `smartQuotes`, `tableOfContents`, `tabs`, `mermaid`, `mathBlock`, `wikilinks`, and `listTable` | The 0.2 extension interface is specified, but the current engine has no implementation; nonempty `extensions` or `renderers` options are rejected. |

The 0.2 entry point also exposes `format`, `formatWithDiagnostics`, `writeWithDiagnostics`, `validateTree`, `validateLayout`, and low-level scanner and event helpers. Those are new APIs, not drop-in replacements for the 0.1 helpers with similar names.

The remaining 0.1 function exports have no 0.2 counterpart in the current entry point. Review each call before switching.

| 0.1 function | 0.2 action |
| --- | --- |
| `abc` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `applyMigrationFixes` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `applyReversibleAstPatch` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `autolink` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `buildMarker` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `canonicalType` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `carveToAnsiWithReport` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `carveToMarkdownWithReport` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `carveToPlainTextWithReport` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `chart` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `citations` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `codeCallouts` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `codeGroup` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `colorSwatch` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `compareSpecVersions` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `createReversibleAstPatch` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `d2` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `decisionTraceJsonLines` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `defaultAttributes` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `details` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `djotMigrationWarnings` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `expandsForTarget` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `externalLinks` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `fencedRender` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `formatChanges` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `formatMigrationWarnings` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `formatProfileViolation` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `glossary` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `graphviz` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `headingLevelShift` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `headingNumbers` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `headingPermalinks` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `headingReference` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `imgFence` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `index` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `inspectColonFences` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `isDirectiveShape` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `isSmartQuoteLocaleSupported` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `migrateBbcode` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `migrateCaseOnlyReferences` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `migrateDjot` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `migrateHtml` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `migrateMarkdown` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `needsReview` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `plantuml` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `presets` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `readAnnotationRanges` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `readNodeIdentity` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `readProvenance` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `readStamp` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `renderAnsiWithReport` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `renderCarveWithConversionReport` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `renderMarkdownWithReport` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `renderPlainTextWithReport` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `sanitizeSvg` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `selectIncludeRegion` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `semanticSpan` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `smartQuoteLocales` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `sourceFingerprint` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `spoiler` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `stripTrailingMarker` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `toAnnotationRanges` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `toAuthoredProvenance` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `toNodeIdentity` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `toProvenance` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `tocPlacement` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `tryRenderHtmlStreaming` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `vegaLite` | No counterpart; retain the 0.1 path or implement this operation in the host. |
| `wavedrom` | No counterpart; retain the 0.1 path or implement this operation in the host. |

| 0.1 option or behavior | 0.2 option or behavior |
| --- | --- |
| `lowercaseHeadingIds`, `asciiHeadingIds` | `headingIds: 'keep-case'` (default), `'lower'`, `'ascii'`, or `'off'`. `'off'` still writes authored ids. |
| `sourceLine` | `sourceLines`, default false. |
| `allowRawHtml`, default true | `rawHtml`, default false. |
| `sanitizeUrls`, `allowedUrlSchemes`, `deniedUrlSchemes` | `urlPolicy: {allow: [...]}` or `{deny: [...]}`. There is no disabled URL filter. |
| `mentionUrl`, `tagUrl`, `resolveMention`, `resolveTag` | `social` object with the same named members; default null. |
| `profile` object and `profileBaseHost` | `profile` string: `full`, `article`, `comment`, or `minimal`; default `full`. No base-host field. |
| `mode`, `sections`, `roundtrip` | Same names and defaults: `interactive`, true, false. Review changed HTML semantics. |
| `smartTypography` | Boolean, default true; 0.1 accepted a richer option shape. |
| `labels`, `symbols` | Same names; labels are escaped text, symbols are host-supplied output. |
| `positions` | Parse option, default true. |
| `extensions`, `includes`, `renderers` | Declared but nonempty values are refused by this engine. |
| `strictLosses` | Same name, default false. `renderWithDiagnostics` returns empty HTML on a render loss when true. |
| `defaultFrontmatterFormat`, parser callbacks, `semanticSpanNames`, `socialContext`, `codeBlockTabWidth` | No 0.2 option. An unknown option throws `CarveOptionError`. |
| 0.1 formatter flags | `format` accepts `alignTables` and `normalize`, both false by default. The 0.2 CLI for them is pending. |
| 0.1 lint options | `rules` and `platforms` are specified for 0.2 lint, but the runner is pending. |

0.2 checks option names and types. `CarveOptionError` names a refused option. Invalid trees raise `CarveTreeError`; invalid layout records raise `CarveLayoutError`. `renderTree` can raise `CarveRenderError` under `strictLosses`. `parseWithDiagnostics` and `renderWithDiagnostics` return structured findings. Port code that used 0.1 parser callbacks or `*WithReport` loss objects to this channel. Resolution results stay on the 2.0 tree. A caller should not infer them from rendered HTML.

### HTML and page selectors

The table groups differences observed by rendering the same source with both engines. The comparison included the 0.1 `resources/examples/` fixtures and fenced Carve examples in the six 0.2 documents. Of 850 inputs, 221 had different HTML before source upgrades. Many are intentional source changes in Part 1. The 167 rewrite contract inputs were also rendered before and after the tool. Do not treat those counts as a claim that every existing document differs.

| HTML surface | Observed 0.1 to 0.2 difference | Page action |
| --- | --- | --- |
| Paragraphs and sections | A block opener directly below text can become text inside one `<p>` instead of a new `<section>`, `<blockquote>`, list, or table. | Add the source blank lines and review direct-child selectors. |
| Heading ids | The default case-preserving slug and duplicate suffix still rendered `Héllo-World` and `Héllo-World-2` in both engines for the tested heading. The 0.2 `headingIds` option can move, fold, or suppress generated ids; authored ids remain. | Check every `#fragment` link and any script that finds ids. |
| Section wrappers | Both default renderers wrap top-level headings in `<section id="…">`. With `sections: false`, ids are on headings. A changed block boundary changes which wrapper owns a block. | Check `section > *`, sibling, and child-index selectors. |
| Lists | A changed item boundary can add or remove `<ul>` or `<ol>`, nested lists, `<p>` in `<li>`, and `start` or `type` attributes. A later paragraph in a tight item gains `<p>` in 0.2 (`U-019`). | Review list spacing and selectors based on list depth. |
| Tasks | 0.1 split a task item next to a plain item into two lists. 0.2 uses one list with `class="task-list"` on the `<ul>` and `class="task"` on the boxed `<li>`. Checkbox inputs and `data-task-state` remain. | Add a `li.task` rule for the bullet and review list grouping. The current engine omits the specified inline `list-style: none` style. |
| Description lists and quotes | Lazy lines and continuation changes alter `<dt>`, `<dd>`, `<blockquote>`, and their child paragraphs. A caption may cease to wrap a quote in `<figure>`. | Review quote and definition layout. |
| Tables | Old GFM separator rows can become data rows; 0.2 cell marks can change `<thead>`, `<tbody>`, `<tfoot>`, `<th>`, `<td>`, `scope`, `rowspan`, `colspan`, and cell alignment. A row span into a head is reported. | Compare table structure and header associations. |
| Captions and images | A caption separated by a blank line no longer supplies `<figure>` and `<figcaption>`. A shaped block image still does in the tested direct-caption case. | Check figure selectors and caption scripts. |
| Attributes | 0.1 wrote some attributes in authored order; 0.2 writes id, class, and other attributes in a fixed order. One test changed `<p class="a" id="b">` to `<p id="b" class="a">`. Attribute attachment can also move to a different element. | Scripts that compare serialized HTML must parse attributes; selectors must inspect the new host element. |
| Inline elements | Bare underline, strike, highlight, substitution, and strong/emphasis nesting can replace `<u>`, `<s>`, `<mark>`, `<del>`, `<ins>`, `<strong>`, or `<em>` with text or another nesting. | Run the source tool and check inline styling. |
| Typography | Single quotes, long hyphen runs, flags, and some line-block spaces produce different text and entities. | Check text comparisons and generated labels. |
| Links and references | A definition moved into a container, a duplicate definition, or an unresolved reference changes `<a>` and its `href`. Unresolved reference children now render as inline HTML inside literal brackets. | Test navigation and fallback text. |
| Footnotes | A plain top-level footnote still rendered `<a role="doc-noteref">` plus `<section role="doc-endnotes">` with `fn1` and `fnref1` in both engines. Definition placement and lazy lines can remove or add that markup. | Verify note links and backlink scripts on real pages. |
| Raw HTML and escaping | 0.1 emitted `=html` raw blocks and spans by default. 0.2 escapes a raw block inside `<pre><code class="language-html">` and escapes an inline raw span when `rawHtml` is false. Bare `<b>` text stays escaped in both. | Set `rawHtml: true` only where the old output is required and allowed. |
| URL filtering | Both default engines blanked a tested `javascript:` link and `data:` image URL, keeping `href=""` or `src=""`. 0.2 also filters URL-valued attributes by its `urlPolicy`, and refuses a disabled policy. | Test scheme handling and any code that assumes a missing attribute instead of an empty one. |
| Source lines and carriers | `sourceLine` becomes `sourceLines`. `roundtrip` carriers and their names changed. | Update `data-source-line` readers and do not parse old carrier names as a 2.0 contract. |
| Opaque blocks and comments | A changed fence or comment closer can replace a code block, div, or hidden comment with visible paragraph text. | Review syntax highlighting and content hiding. |

For one concrete HTML comparison, the unchanged 0.1 source below produced two `<ul>` elements in 0.1 and one `<ul class="task-list">` with both `<li>` elements in 0.2:

```carve
- [ ] task
- plain
```

A direct top-level heading and a direct footnote, by contrast, produced the same default section and endnotes markup on both engines in the probes. Those stable cases are useful regression checks, not reasons to skip the other rows.

### Command line and missing features

The 0.1 CLI at `dist/cli.js` exists and accepts a file or stdin. It has render targets for HTML, Markdown, plain text, ANSI, Carve, and AST JSON; `fmt`, `flatten`, `fix`, `lint`, `diff`, `merge`, `portability`, `trace`, and `migrate --from html|markdown|djot|bbcode`. It can expand includes. The 0.2 engine has **no command line program yet**. It has JavaScript `render`, `parse`, `format`, and `write` functions. The specified `carve fmt --normalize` command is therefore future work. `node upgrade/src/cli.ts` is the separate rewrite program described in Part 1.

The 0.2 engine currently lacks a lint runner, an extension registration and transform pipeline, include expansion, importers, Markdown/plain/ANSI renderers, patch and editor APIs, and a 0.2 CLI. Nonempty `extensions`, `includes`, and `renderers` are rejected. Do not switch a caller that depends on these features without another implementation.

## Part 3. Tree consumers: AST 1.x to 2.0

| First check | 1.x shape | 2.0 rule |
| --- | --- | --- |
| Version | A 1.x document can be stored as a bare tree or older envelope. | Set `astVersion: "2.0"` on the document and matching envelope; a 2.0 reader refuses another major version. |
| Child traversal | `items`, `rows`, `cells`, inline special slots, and flat table rows occur in several types. | Walk only declared child slots. Lists and tables use `children`; tables have groups and `cell_paragraph`. |
| Meaning and spelling | Some source spelling was stored in tree fields. | Keep semantic fields in the tree and ask for `parseWithLayout` for source spelling and ranges. |
| Resolution | Generated ids and resolved targets could be mixed with authored fields. | Read the typed resolution result fields in the resolved tree. Do not copy them into authored attributes. |
| Storage | 1.x JSON passed through a 1.x decoder. | Migrate it outside the current engine, validate the 2.0 tree, and then use `decodeTree`. |

The table below combines the migration section of [ast.md](ast.md#migration), its node table, and field changes observed in both engines. `T-001` onward identify map rows. A row describing an earlier draft is included because stored draft trees may exist. A field marked “dropped” does not survive a tree-only migration. These tree changes are loud to the strict 2.0 decoder: it refuses the old shape. A permissive custom reader could still lose meaning, so validate before consuming.

### Tree and field migration index

| ID | Change | 1.x or draft form | 2.0 form | Rule |
| --- | --- | --- | --- | --- |
| T-001 | split | `critic_substitution` with `old` and `new` | a `delete` holding `old`, directly followed by an `insert` holding `new` | C2-A-178 |
| T-002 | merge | `escaped_text` | `text` with the same `value`, then coalesced with its neighbors | C2-A-178 |
| T-003 | merge | `cell_wrap` | a `text` node holding one space, then coalesced | C2-A-178 |
| T-004 | drop | `cellWraps` on `code`, `math` and `raw_inline` | dropped | C2-A-178 |
| T-005 | move | `rawRef` | dropped; `refForm` is `collapsed` when it ends in `[]` and `full` otherwise; `key` is folded | C2-A-178 |
| T-006 | merge | `key` on definitions and footnote references | folded | C2-A-178 |
| T-007 | merge | `attrs.order` and the `keyValues` object | `keyValues` becomes a list of pairs, in the order `attrs.order` gives or else in member order; `order` is dropped; a key named `id` or `class` folds in | C2-A-178 |
| T-008 | move | an `image` in a list of blocks | a `paragraph` with `role: "image"` that holds the image | C2-A-178 |
| T-009 | split | a `line_block` with block children | `line` children, split at the breaks of each paragraph, with an empty `line` between stanzas; `lines` is dropped | C2-A-178 |
| T-010 | move | a heading id in `attrs.id` | kept as an authored id: the draft tree does not say which ids were generated | C2-A-178 |
| T-011 | move | `marker.bare`, `block_quote.fenced`, `table.sourceFormat` | dropped from the tree; written to a source-layout sidecar when the caller asks for one | C2-A-178 |
| T-012 | drop | `definition_list.spacing` | dropped | C2-A-178 |
| T-013 | drop | `blockImagePromotion` in `stages` | dropped; `role: "image"` stays as the tree has it | C2-A-178 |
| T-014 | drop | the task status `cancelled`, in a draft tree or a 1.2 tree | removed; status derives from the mark | C2-A-178 |
| T-015 | rename | `link.form` and `image.form` | `refForm`; the name identifies reference spelling rather than xref display. | C2-A-178 |
| T-016 | rename | `xref.form` | `display`; the name identifies generated display text rather than reference spelling. | C2-A-178 |
| T-017 | rename | `link_reference_definition.title` | `tooltip`; all link target strings use one name, while visible titles stay inline lists. | C2-A-178 |
| T-018 | merge | `paragraph.blockImage` and `paragraph.blockMath` | `role: "image"` and `role: "math"`; one field makes the two exclusive. | C2-A-178 |
| T-019 | rename | `rubyPair` | `ruby_pair`; the type follows snake_case and carries common node fields. | C2-A-178 |
| T-020 | rename | `citation.suppressAuthor` | `citation.mode: "suppress-author"`; one field determines the mode. | C2-A-178 |
| T-021 | drop | `citation_group.mode` | removed; every item carries its own mode. | C2-A-178 |
| T-022 | merge | `citation.locatorLabel` and `citation.locatorValue` | `locator` object with label and inline children; its parts cannot disagree. | C2-A-178 |
| T-023 | drop | `task.status` | removed; the state derives from `task.mark`. | C2-A-178 |
| T-024 | rename | `include.options` string pairs | decoded typed option object; source quoting moves to layout. | C2-A-178 |
| T-025 | drop | `thematic_break.marker`, `table.separatorWidths`, `table_row.continuationLines`, `table_cell.sourceContent`, `strong.boldItalic` | dropped | C2-A-178 |
| T-026 | move | a definition inside a container | not produced by the draft, which moves it to the document; no change | C2-A-178 |
| T-027 | move | a named `admonition` whose `kind` is not one of the eight admonition names | a `div` with the name as its first class | C2-A-178 |
| T-028 | version | 1.x bare document or envelope | document.astVersion = "2.0" and matching envelope.astVersion; reject other major versions | C2-A-012 C2-A-176 C2-A-177 |
| T-029 | add | common node fields | optional typed metadata, opaque data, dir, lang and segments; only declared child slots contain nodes | C2-A-027 C2-A-189 |
| T-030 | rename | definition/ref label or abbr | key plus namespace; abbreviation.abbr becomes key | C2-A-050 C2-A-070 |
| T-031 | rename | code_block.content, header and label | value, syntax, title and groupLabel; code_block language is syntax | C2-A-050 |
| T-032 | rename | frontmatter/raw_block/raw_inline/literal_inline/math content; critic_comment.text | value | C2-A-050 |
| T-033 | split | comment block, delimited and content | form and value | C2-A-050 |
| T-034 | merge | list ordered, start, olType, delim, bareMarker, bulletChar; tight | marker object; spacing = tight or loose | C2-A-053 C2-A-054 |
| T-035 | rename | list.items, definition_list.items, table.rows, table_row.cells, citation_group.items | children with typed child slots | C2-A-050 C2-A-051 |
| T-036 | split | table.rows and rowGroups | table_head, table_body, table_foot children; table columns move to table_column nodes | C2-A-050 |
| T-037 | split | table_cell inline children and blocks | cell_paragraph child for inline content; block children for other content | C2-A-050 |
| T-038 | rename | figure.target and shortCaption | figure.kind and caption.short | C2-A-050 |
| T-039 | rename | mention.user | target, kind and optional label | C2-A-050 |
| T-040 | rename | inline_footnote.inline | children | C2-A-050 |
| T-041 | rename | inline_extension.content | children; declared props, slots, fallback, payload and resourceIds | C2-A-050 |
| T-042 | rename | heading_ref | xref with key, namespace, href and display | C2-A-050 |
| T-043 | split | substitution or critic_substitution | delete followed by insert | C2-A-178 |
| T-044 | add | image alt and target fields | optional decorative, longDescription, targetKind and resourceId | C2-A-050 |
| T-045 | add | table cell accessibility | optional scope and headerIds | C2-A-050 |
| T-046 | add | resolution outputs | generatedId, number, resolvedAlign, href or src, display and table span counts remain in resolved tree | C2-A-106 C2-A-162 |
| T-047 | move | source spelling and physical layout | source-layout record from parseWithLayout; marker, fences, wraps, whitespace and quote choices | C2-L-003 |
| T-048 | drop | 0.1 rawRef, sourceFormat and layout-only fields | use semantic fields; original spelling is unavailable without source/layout | C2-A-178 |
| T-049 | add | include directive | include with path, section and typed options; no expansion in core tree | C2-A-181 |
| T-050 | add | no extension source record; block extension deferred in an earlier draft | qualified `block_extension` and `inline_extension` may carry a typed `source` record; a block extension has a required core fallback | C2-A-122 C2-A-125 C2-X-024 |

### Reading and storing 2.0 trees

A 2.0 document root has `type: "document"`, `astVersion: "2.0"`, and `children`. Storage or process exchange uses an envelope with the same version and a `document`; optional `vocabulary` and `extensions` declarations may follow. An in-memory handoff may use the bare tree. The reader rejects a mismatched envelope version, unknown core fields or types, and unknown required extensions. A later `2.MINOR` may add only optional declared extensions and namespaced `data`, not a new core node or core field.

The tree holds meaning. The source-layout record holds spelling. Call `parseWithLayout(source)` to obtain `document`, `layout`, and `diagnostics`. The layout has version 2, the original UTF-8 source, line-ending form, byte-order-mark flag, and `nodes` addressed by JSON Pointers into that exact tree. Its ranges are UTF-8 byte offsets. It records such facts as a bare-dot list marker, a fenced quote, a table's source format, a reference's exact spelling, and table continuation wraps. It cannot reconstruct an old spelling that was absent from stored 1.x JSON. Do not synthesize a layout fact from a semantic tree field.

A resolution result is computed beside authored content. In the 0.2 schema, examples are `heading.generatedId`, `footnote_ref.number`, `inline_footnote.number`, `link.href` or `image.src` for a reference, `table_column.resolvedAlign`, and some table span counts. The [result-field list](data/ast-results.json) identifies them. They stay in the resolved tree but are excluded from semantic equality as specified. Authored heading ids stay in `attrs.id`. The 0.1 and 0.2 engines were both run on the same heading, list, table, link, and footnote sources to check the shapes in the table. For `# A & B`, 0.1 put the generated `A-B` in `heading.attrs.id`; 0.2 put it in `heading.generatedId`.

For stored 1.x JSON, first identify the producer's exact contract version. Map old fields and node types using the table, preserve the order of authored children, and add `astVersion: "2.0"` to the root and envelope. Turn `list.items`, `table.rows` and `table_row.cells` into typed `children`; derive list `marker` and `spacing`; fold definition and reference labels into `key` and `namespace`; convert retired nodes; move only known spelling into a layout record if the original source is available. Keep `pos` byte offsets only if they still match the original source. Then validate against [the 2.0 schema](data/ast-schema.json) and decode with `decodeTree`. A 1.2 tree takes the earlier draft migration first, then the rows under `C2-A-178`. Record losses where a construct has no 2.0 representation. **The current 0.2 engine has no migration function for stored 1.x or draft JSON.** `decodeTree` validates and refuses them.

Treat `data` as opaque JSON keyed by a declared qualified name. Preserve unknown optional data. Walk only declared child slots, including root metadata `headers`, `footers`, `abstract` and nested `fields` values. A metadata value tags a string, boolean, number, inline list, block list, ordered value list or named value map. The core HTML renderer ignores root metadata; the Carve writer reports `fields` when no frontmatter node preserves the raw source. The [0.2 extension interface](extensions.md) lets a registered matcher claim a core inline, div, or code-block node and transform it into a declared `inline_extension` or `block_extension`. Both need a valid same-role fallback containing only core nodes; qualified forms may carry a typed `source` record for the writer. Declarations on the root or envelope carry slot names in walk order. A tree-only reader checks annotation id shape and duplicates; a reader with the range sidecar also checks each referenced range. `carve.tabs` is the specified standard extension. An extension renderer is trusted host code and returns HTML unchanged; hosts use trusted renderers for untrusted documents. The interface is specified but is not built in the current engine. For unknown required extensions, refuse the tree; for unknown optional ones, use the valid fallback as the spec directs. Do not silently discard an extension's payload or `data` on storage round trips.

## Open work

- Build and publish a 0.2 CLI, including `fmt --normalize`.
- Add a versioned migration function for stored AST 1.x and earlier 0.2 draft JSON, with loss reports.
- Resolve the rewrite tool's `U-114` fifth-input `upgrade-mismatch` and classify remaining corpus mismatches.
- Align the engine's tree fields and task-item style with the current 0.2 schema and HTML rulings.
- Finish the 0.2 lint runner, extension API, include expansion, importers, and non-HTML renderers before those callers switch.
