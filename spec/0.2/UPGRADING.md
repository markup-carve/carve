# Upgrading from Carve 0.1 to Carve 0.2

This is a non-normative guide. Carve 0.2 is still a draft. The [0.2 specification](README.md) defines behavior. The [upgrade map](data/upgrade-map.json) holds the source and tree changes in these tables. Its source examples are literal strings with line breaks. `SILENT` means unchanged 0.1 source still parses in 0.2 but produces different HTML. Review those entries even when a document has no syntax error.

## Part 1. Authors: your documents

| Check first | 0.1 habit | 0.2 result | Action |
| --- | --- | --- | --- |
| Blocks under text | A heading, quote, definition, or attribute line could start a block at once. | Most such lines continue the paragraph. | Insert a blank line; `U-001` to `U-010`. **SILENT** |
| Lists | `+`, `{loose}`, marker columns, and task boxes controlled list shape. | Blank lines and content columns control shape; mixed task and plain items share a list, including ordered items. | Run the tool, then inspect list HTML; `U-014` to `U-030`, `U-117` to `U-120`. **SILENT** |
| Breaks, fences, tables | `---`, `___`, `~~~`, and GFM separator rows had special meanings. | These are text, typography, or table rows. | Use `***`, backticks, and 0.2 cell marks; `U-044` to `U-062`, `U-116`. **SILENT** |
| Inline | Bare `_`, `~`, `=`, substitution, flags, and references changed. | Several now print literally or gain a new interpretation, including defined shortcuts. | Use braced spans and inspect escapes; `U-065` to `U-075`, `U-101` to `U-115`, `U-121`. **SILENT** |
| Table column lists | `{aligns=right,x}` and `{widths=25,x}` applied their valid entries and skipped the bad one. | A list with one empty or malformed entry sets no column at all, and the attribute stays on the table without effect. Lint reports it as `table-attribute-invalid`. | Correct or remove the bad entry; C2-B-211, C2-B-212, C2-B-227. No tool entry yet. **SILENT** |
| Raw HTML | Raw block and span forms emitted HTML by default. | `rawHtml` defaults to false and escapes it. | Decide whether the host may enable `rawHtml`; `U-076`, `U-077`, `U-079`. **SILENT** |
| Notes in link text | A footnote mark appeared inside the link anchor, as in `[t^[n]](/u)`. | Each footnote reference or inline footnote mark follows the closing link anchor, in source order. The tree keeps the original positions. | U-154 reports this change. Inspect HTML or CSS that depends on the mark's position; C2-H-088. **SILENT** |

Proposed source contract entry `U-126` for the rewrite tool owner: `kind: report`, `group: references and footnotes`, `from` and `to` both `[see this[^1] page](/u)` followed by the `[^1]: n` definition, `toolEntry: "U-126"`, `silent: true`. The unchanged 0.2 rendering starts `<p><a href="/u">see this page</a><a id="fnref1"`. This entry is pending in the upgrade map and tool; the full proposed record is in the session report.

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
| U-023 | Marker indented less than the content column of the item above **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt;item text ⏎ 3. child&lt;/li&gt; ⏎ &lt;/ul&gt; | - item text ⏎ 3. child ⏎ ; rewrite |
| U-024 | Alphabetic list that starts at &#96;i&#96; **SILENT** | &lt;ol type="i" data-delim=")"&gt; ⏎ &lt;li&gt;one&lt;/li&gt; ⏎ &lt;/ol&gt; ⏎ &lt;ol type… | {start=9} ⏎ a) one ⏎ b) two ⏎ ; rewrite |
| U-025 | Ordered marker of ten or more digits **SILENT** | &lt;p&gt;1234567890. x&lt;/p&gt; | {start=1234567890} ⏎ . x ⏎ ; rewrite |
| U-026 | Comment block at column 0 between two items **SILENT** | &lt;ul&gt; ⏎ &lt;li&gt;a&lt;/li&gt; ⏎ &lt;/ul&gt; ⏎ &lt;ul&gt; ⏎ &lt;li&gt;b&lt;/li&gt; ⏎… | - a ⏎ %%% ⏎ x ⏎ %%% ⏎ - b ⏎ ; rewrite |
| U-027 | Three blank lines between two lists | &lt;ul&gt; ⏎ &lt;li&gt;a&lt;/li&gt; ⏎ &lt;/ul&gt; ⏎ &lt;ul&gt; ⏎ &lt;li&gt;b&lt;/li&gt; ⏎… | Keep it; none |
| U-028 | &#96;-&#96; and &#96;*&#96; items | &lt;ul&gt; ⏎ &lt;li&gt;one&lt;/li&gt; ⏎ &lt;/ul&gt; ⏎ &lt;ul&gt; ⏎ &lt;li&gt;two&lt;/li&g… | Keep it; none |
| U-029 | Comment-only line between items, empty task box, &#96;- -&#96; | &lt;ul&gt; ⏎ &lt;li&gt;a&lt;/li&gt; ⏎ &lt;li&gt;b&lt;/li&gt; ⏎ &lt;/ul&gt; | Keep it; none |
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
| U-037 | Brace suffix after a fence language | &lt;pre&gt;&lt;code class="language-js"&gt;a ⏎ &lt;/code&gt;&lt;/pre&gt; | &#96;&#96;&#96;js ⏎ a ⏎ &#96;&#96;&#96; ⏎ ; rewrite |

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
| U-065 | In 0.1, `_underlined_` writes an underline, and `_z_/y/` writes an underline followed by literal `/y/`. **SILENT** | Under C2-I-046 through C2-I-048, a bare underscore is text and the slash after `{_z_}` can start emphasis in 0.2. | Write `{_underlined_}` or `{_z_}\/y/`; rewrite |
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
| U-111 | Reference label that wraps **SILENT** | &lt;p&gt;See &lt;a href="/u"&gt;the text&lt;/a&gt; here.&lt;/p&gt; | See \[the text]\[a long ⏎ label] here. ⏎ ⏎ [a long label]: /u ⏎ ; escape |
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
| U-120 | Ordered marker followed by task box text **SILENT** | &lt;ol class="task-list"&gt; ⏎ &lt;li class="task"&gt;&lt;input type="checkbox" disabled aria-label="x"&gt; x&lt;/li&gt; ⏎ &lt;/ol&gt; | `1. \[ ] x`; escape |
| U-121 | Defined shortcut that was text **SILENT** | &lt;p&gt;&lt;a href="/u"&gt;text&lt;/a&gt;&lt;/p&gt; | `\[text]` before `[text]: /u`; escape |

### Rulings of 16 November 2026

These rulings change what some documents give against the 0.1 engine or against early 0.2 engines. They have no rewrite-tool entry yet, so the table carries no `U-` id; the clause decides.

| What you wrote | Before | 0.2 now | Clause |
| --- | --- | --- | --- |
| A div name or fence language with a character glued behind it: `::: glossary>`, ```` ```js} ````, ```` ```=html~ ```` | 0.1: text. Early 0.2: the whole word was the name or language, as `class="glossary&gt;"`. | The name ends at the first character outside its set; the rest is reported and dropped. | C2-B-225 |
| An admonition name with a glued attribute block: `::: note{.x}` | Early 0.2: a div with `class="note{.x}"`. | The admonition `note`; the attribute block is reported and not applied. | C2-B-105, C2-B-225 |
| Two spaces after a fence run: ```` ```  b ```` | Early 0.2: language `b`. | No language; `b` is reported. | C2-B-122 |
| Spaces at the end of a line inside a code span | Early 0.2: kept in the code value. | Removed, as in text. | C2-I-002, C2-I-015 |
| `{++-+}`, an insertion of `+-` | Early 0.2: `+-`. | `±`. | C2-I-117 |
| A letter assigned in Unicode 18.0.0 next to a delimiter | Depended on the engine's Unicode tables. | Unicode 18.0.0 decides. | C2-I-127 |
| `{{ a.crv @shift:1234567890 }}`, ten or more digits | 0.1: an include with a rounded number. Early 0.2: a paragraph. | An include whose node keeps the option as written in `invalid`, with no effect; `include-option-invalid` reports it. | C2-B-205, C2-B-206 |
| An include option with an unknown key, a value outside its shape, a missing value or a repeated key: `{{ a.crv @size:2 }}`, `{{ a.crv @shift:x }}`, `{{ a.crv @lines }}` | Early 0.2: a paragraph for some options and an include for others, depending on the key. | Always an include. The option has no effect, the node keeps it as written, `fmt` writes it back, and `include-option-invalid` reports it. | C2-A-181, C2-B-206 |
| A span mark that cannot join: `\| < \|` in the first column, `\| ^ \|` in the first row, below a head row or in the first footer row | 0.1 and early 0.2: an empty cell, a header cell when the other cells of its row were; a row span from the body into the foot made the HTML one `<tbody>`. | A cell that holds `<` or `^` as text, reported by `table-span-marker-blocked`; its header mark applies as on any cell. No span crosses the head, the body or the foot. Remove the mark, or write an empty cell. | C2-B-172 to C2-B-174 |
| Trees of a captioned image, code block, quote or math block, for tree consumers | Early 0.2: a `figure` node around the block, holding the caption and the attributes of the attribute line. | The block carries `caption` in its own slot and keeps its attributes; there is no `figure` node, and the HTML is unchanged. Migrate stored trees by T-051 and T-052. | C2-A-082, C2-A-183, C2-H-062 |
| An attribute line on a block image | Early 0.2: a bare `<img>`, the id and classes lost. | `<p id="…" class="…"><img …></p>`. | C2-H-020 |
| A table panel of a figure group | Early 0.2: a bare `<table>`. | `<figure class="carve-figure-panel">` around the `<table>`. | C2-H-064 |
| A captioned figure or table under `comment` or `minimal` | Early 0.2: `Figure : cap`, table caption lost. | `Figure 1: cap` as a paragraph after the degraded block. | C2-H-165 |
| A linked mention under a profile without `link` | Early 0.2: an `<a class="mention">`. | The inert `<span class="mention">`. | C2-H-167 |
| A reference to a heading the profile degrades | Early 0.2 library resolution read the profile. | The tree does not change with the profile; the reference renders as unresolved text. | C2-H-177 |
| A trailing comment on a table row, `\| 1 \| 2 \| %% note` | Early 0.2: no tree node for the comment. | A `comment` node after the row; `fmt` writes it on its own line below the row. | C2-A-086, C2-W-135 |
| Positions (`pos`) of tree consumers | Early 0.2: no `pos` on empty cells, span mark cells, caption numbers; an include and a last-line comment ended before trailing spaces. | These carry `pos`; trailing spaces belong to the block, the line comment or the break. | C2-A-151, C2-A-153, C2-A-158 |
| A code span line that ends in a backslash and one space | 0.1: the space was removed. | The escaped space stays in the code value; a tab there is still removed. | C2-I-002 |
| A div opener with a sigil glued to a word, `::: >a`, or with a first word that is no name, `::: *` | 0.1: text. Early 0.2: a div. | `::: >a` opens a quote fence, `::: *` an anonymous div; the words are reported. | C2-B-119, C2-B-122 |
| An abbreviation expansion after two spaces or after a space and a tab: `*[HTML]:  Hyper Text` | 0.1 and early 0.2: the leading space or tab was dropped. | It is the first character of the expansion, as `title=" Hyper Text"`. | C2-B-084 |
| A list marker at column 0 directly below item text of a list inside a footnote or a description: `[^n]: note`, `  - one`, `- x` | Early 0.2: a lazy line, so `- x` was text of `one`. | The note or the description closes and the marker opens a list at the top level, as in 0.1. | C2-B-015, C2-B-228 |
| A bare dot with a task box before a further dot: `. [x] . x` | 0.1: an item with the text `[x] . x`. Early 0.2 (one engine): a paragraph. | A task item whose content `. x` is a nested ordered list. | C2-B-043, C2-B-229 |
| Inline markup nested about 200 deep inside quotes, lists or divs, as `- *[x](u)` behind 197 quote marks | 0.1 and early 0.2: blocks and inline nodes shared one cap of 200, so deep blocks left inline openers as text. | Blocks and inline content have a limit of 200 each; inline depth counts from zero in each inline content, so the link forms. | C2-B-190, C2-I-118 |
| A delimited table whose `header-rows` count is larger than its rows: `{table header-rows=5}` on two rows | 0.1 and early 0.2: no head, every cell a header cell, all rows in one body, and `fmt` kept the 5. | Every row is in the head; `fmt` writes the effective count, and `table-row-count-clamped` reports it. | C2-B-209, C2-B-221 |
| A comment-only line directly below a heading, at or left of its marker: `= Title`, `%% note`, `  more` | 0.1 and early 0.2: the comment closed the heading and stood beside it, and `more` was a paragraph. | The comment is a child of the heading, and `more` continues the heading; the HTML of a heading followed by an unindented line is unchanged. `deprecated-indented-line-under-heading` reports `more`. | C2-B-137, C2-B-154 |
| An inline form that crosses a continuation row, as a code span opened in a row and closed in its `+` row | 0.1: rows joined before inline parsing, one code span with a space, `<code>a b</code>`. Early 0.2: one code span whose value holds a line feed. | Each fragment is read alone: the backticks, and any other opener without its closer in the same row, are text. | C2-B-184, C2-B-223 |
| A single quote at the start of a word: `'tis`, `'em`, `rock 'n' roll`, or a quote inside a single quotation: `'I said 'yes' twice'` | 0.1 and early 0.2: a list of elision words gave an apostrophe, and an open quotation made the inner quote an apostrophe. | A quote after whitespace or opening punctuation opens; only a quote between two word characters or before a digit is an apostrophe. Type `’` where it matters: `’tis`. | C2-I-104, C2-I-105 |
| A quote directly behind a hyphen, a dash or a slash: `said---"Go"`, `and/"or"` | 0.1 and early 0.2: the quote opened unless a space or a closing punctuation character followed. | The quote closes. Type `“` where it opens. | C2-I-104 |
| A backtick run with no closing run of its length in the same paragraph, heading, caption or cell: ``see `x and *y*``, `` $`a + b `` | 0.1 and early 0.2: code or math to the end of the content, except at the end of a table cell. `fmt` could write a code value that starts with a line break and ends with a backtick as an open span. | The run, and a `!`, `$` or `$$` before it, is text, and the rest of the content is read as usual. Close the span where the code ends. A code value that starts with a line break and ends with a backtick has no spelling, and `fmt` reports `field-unspellable`. | C2-I-017, C2-W-077 |

A code span, or any other inline form, that crossed a continuation row is now text. Write the cell on one row, which gives the code a space where the row broke, or use a delimited table when the value must keep its line break: a delimited cell is plain text and may hold a quoted line break (C2-B-226).

Before:

```carve
| `a | 1 |
+ b` | 2 |
```

After, on one row:

```carve
| `a b` | 1 2 |
```

### Include expansion

The Includes document (`includes.md`) defines expansion for 0.2.0. These differences against the 0.1 processor are observable; they have no rewrite-tool entry, so the table carries no `U-` id.

| What you wrote | 0.1 | 0.2 | Clause |
| --- | --- | --- | --- |
| One authored id in two files, `{#tip}` in the document and in an included file | The later id became `tip-2`, the references of its file followed it, and `include-id-rename` reported it. | Both elements keep `tip`; `duplicate-id` reports the later one, and every `</#tip>` and `#tip` link reaches the first in document order, also from the file of the later one. Give each id one name across the files. | C2-N-057, C2-N-058 |
| One footnote label in two files | The later label was renamed, and `include-footnote-rename` reported it. | Two notes; a reference reaches the note of its own file, else of the nearest including file. | C2-N-055 |
| A footnote reference in the including document to a note that only an included file defines | Resolved, the note was numbered. | Unresolved: definitions reach outward, never inward. Define the note in the including document. | C2-N-054, C2-N-055 |
| A directive inside a sentence, a heading or a table cell | Expanded inline. | Text; only a directive alone on its line is an include. | C2-N-002 |
| A directive with no resolver | Literal, no warning, no dependency. | Literal, with `include-no-resolver` and the render loss `include-unresolved`; the node is a dependency that was not read. | C2-N-003, C2-N-070, C2-N-083 |
| A missing file, a path outside the root, an unreadable file | `include-unresolved` for all three. | `include-not-found`, `include-outside-root` or `include-unreadable`, and the render loss `include-unresolved`. | C2-N-061 |
| An option value outside its shape or a repeated key, as `@lines:5-2` or two `@code` | `include-lines-invalid`, `include-duplicate-option` and others; the directive stayed literal. | `include-option-invalid`; the directive stays literal. | C2-N-025 |
| A large include tree | A budget of `max(1 MB, 8 x input length)` over the output and at most 1000 resolver calls. | A cap of 8388608 bytes over the texts the resolver returns, and no call bound. | C2-N-065, C2-N-067 |
| Malformed quoting in a `{table}` CSV or TSV include | A code block. | A table, as on an authored fence, with `delimited-table-malformed`. | C2-N-045, C2-B-181 |

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

This preserves two lists, but the 0.2 engine adds `class="task"` on the boxed item. If one mixed list is what you want, keep the original two lines and update the page CSS. In a new document, one mixed list is valid. An uppercase ordered marker with a dot needs two spaces after it, including roman numerals (`U-118`). Right-aligned numbers such as ` 9.` and `10.` form one ordered list (C2-B-030).

In 0.1, `1. [ ] x` is an ordered item whose text starts with `[ ] x`. In 0.2 the box is a task field and the ordered number stays visible. The tool writes `1. \[ ] x` to keep the old text (`U-120`). In 0.1, `[text]` and `![text]` remain text even when `[text]: /u` is defined. In 0.2 both are shortcut references. The tool escapes their opening brackets to keep the old text (`U-121`).

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

#### Measured continuation rewrites

The 0.1 continuation marker `+` no longer owns a following block in 0.2 under C2-B-059. Write the block at the indentation of its owning list item, description, footnote, or quote. The tool checks the HTML before applying these rewrites.

| ID | Before in 0.1 | 0.2 unchanged input | After in 0.2 |
| --- | --- | --- | --- |
| U-122 | Plus continuation in a list item **SILENT** | - > + | - >; rewrite |
| U-123 | Under C2-B-059 and C2-B-076, `:: term` then `:  intro` then `+` then `  more` writes `more` outside the description in 0.1. **SILENT** | The same lines keep `more` in the description body in 0.2. | Replace `+` with a blank line and move `more` to column zero; rewrite |
| U-124 | Plus continuation in a footnote body **SILENT** | a ⏎ [^n]: + | a ⏎  ⏎ [^n]: +; rewrite |
| U-125 | Under C2-B-032, C2-B-059, and C2-I-015, a quote `+` can attach the next line or leave a code-span paragraph before it in 0.1. **SILENT** | The same 0.2 lines can merge the code span and following paragraph. | Remove `+`; insert an empty quote line when needed, after the full HTML check; rewrite |

#### Measured quote boundary rewrite

Under C2-B-031 and C2-B-032, an empty quote directly after paragraph text is a lazy line in 0.2. For `y` followed by `>`, the 0.1 HTML has a paragraph and an empty block quote, while unchanged 0.2 source has one paragraph containing a literal `>`. A blank line before `>` retains the 0.1 HTML.

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-126 | `y` then `>` **SILENT** | One paragraph containing `y` and a literal `>` | `y`, a blank line, then `>`; rewrite |

#### Measured list fence boundary rewrite

Under C2-B-057, C2-B-109, and C2-B-111, a code fence in a list item ends when the item ends. For `- ````, a blank line, then `+`, 0.1 writes an empty code line inside the item, while unchanged 0.2 source writes an empty code block and a paragraph containing `+`. Close the fence at the item's content column to retain the 0.1 HTML.

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-127 | `- ````, a blank line, then `+` **SILENT** | An empty item code block followed by a `+` paragraph | `- ````, a blank line, then an indented closer; rewrite |

#### Measured description ownership rewrite

Under C2-B-069, C2-B-076, and C2-B-078, a description body belongs to its term only when its mark is at the list's owning column and later body blocks are indented past that mark. For ` :: t` followed by `: x`, 0.1 writes a description list, while unchanged 0.2 source folds `: x` into the term text. Move the term mark to the owning column to retain the 0.1 HTML.

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-128 | ` :: t` then `: x` **SILENT** | One term containing `: x` | `:: t` then `: x`; rewrite |

#### Measured percent comment fence rewrite

Under C2-B-108, C2-B-110, and C2-B-114, a longer percent run closes a comment in 0.2 when it has at least the opener's length. For `%%%`, then `%%%%`, then `y`, 0.1 hides every line, while unchanged 0.2 source shows `y` as a paragraph. Lengthen the opener beyond the internal run to retain the 0.1 HTML.

| ID | What you wrote in 0.1 | 0.2 unchanged rendering | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-129 | Under C2-B-108, C2-B-110, and C2-B-114, `- a` then ` %%% n`, ` x`, ` %%%`, and ` tail` writes `tail` outside the list in 0.1. In a quoted sequence of three bare percent runs, 0.1 can hide the follower and leave the later line outside the quote. **SILENT** | The same lines keep `tail` inside the list in 0.2; the quoted sequence can expose its follower. | Move `tail` to column zero, or indent the whole comment fence under its owner when 0.1 kept the follower inside. Add one matching bare percent line to keep the quoted follower hidden when the complete HTML check passes; rewrite |

#### Measured rendering changes

The following changes are specified by the cited 0.2 clauses and require review when the old HTML matters.

| ID | Before in 0.1 | After in 0.2 | Tool |
| --- | --- | --- | --- |
| U-130 | Under C2-B-123 and C2-B-130, `::: \|` followed by a tab and `x` writes `&amp;nbsp;` spaces before `x`. An unclosed code fence inside a quoted line block also keeps the following lazy line as code in 0.1. **SILENT** | The line block keeps the tab as text before `x`. In 0.2, the fence ends at the line block boundary and the following text becomes a separate paragraph. | The tool checks removal of trailing no-break spaces in plain line-block lines under C2-H-043. Other ownership differences need review; report |
| U-131 | Under C2-B-081 and C2-B-083, `* [d]:` writes an empty list item. A nested item with a definition can also leave a following colon line outside the list. **SILENT** | The item contains the definition text, and the following line can stay inside it. | The tool replaces a consumed definition with `{% %}` and releases a following colon when the complete HTML check passes. Review other shapes; report |
| U-132 | Under C2-B-081 and C2-B-083, `[r]:` writes no HTML. **SILENT** | The line writes a paragraph containing `[r]:`. | Review the definition; report |
| U-133 | Under C2-H-032, `- [ ] +` writes a task item with an unlabeled checkbox and no item class or generated style. For `-{#k} [x] bare` followed by `  # inside`, 0.1 uses `aria-label="bare"`. **SILENT** | The item has class `task`, generated bullet suppression style, and a checkbox with `aria-label="+"`; the plus is item text. The following heading makes the second example use `aria-label="bare inside"`. | Review task HTML; report |
| U-134 | Under C2-B-032 and C2-B-081, `> [f]:` writes one empty block quote. **SILENT** | It writes a paragraph containing `[f]:`. | Review the quote; report |

#### Measured block and inline rewrites

The tool applies these spellings only when the complete 0.1 and rewritten 0.2 HTML compare equal.

| ID | Before in 0.1 | After in 0.2 | Tool |
| --- | --- | --- | --- |
| U-135 | Under C2-B-113, an unclosed ` ``` ` fence with one trailing blank line writes one code line; `- q` then an indented fence and a blank line before `tail` keeps that blank code line in 0.1. **SILENT** | The same 0.2 source discards the trailing blank code line. | Close the fence after the blank line and before `tail`; rewrite |
| U-136 | Under C2-I-036, `{%` followed by a newline and `%}x` prints literally in 0.1. **SILENT** | Unchanged 0.2 source consumes the brace comment and prints only `x`; escaping the opening brace prints the old text. | Escape the brace; escape |
| U-137 | Under C2-B-090, C2-B-100, and C2-B-101, `- {k}` writes an empty item in 0.1; `- {.k}` then `tail` leaves `tail` outside that item. **SILENT** | The same 0.2 sources print the attribute or keep `tail` inside the item. | Write `- {% %}` and insert a blank line before `tail`; use the same empty comment for an empty item inside a quote; remove an empty `{}` after the marker when the item has later text; rewrite |
| U-138 | Under C2-B-147 and C2-B-149, `>` followed by `^ p` writes an empty quote and a paragraph in 0.1. **SILENT** | Unchanged 0.2 source attaches `p` as a figure caption; a blank line before the caret retains the paragraph. | Insert a blank line; rewrite |
| U-139 | Under C2-I-089, `x^[]` prints literally in 0.1. **SILENT** | Unchanged 0.2 source creates an empty inline footnote; escaping the caret retains the literal text. | Write `x\^[]`; escape |

#### Measured cell and attribute changes

| ID | Before in 0.1 | After in 0.2 | Tool |
| --- | --- | --- | --- |
| U-140 | Under C2-B-171, a tab between two table pipes is cell text in 0.1. **SILENT** | Unchanged 0.2 source treats the tab as cell padding and writes an empty cell. | Review the cell; report |
| U-141 | Under C2-B-090, C2-B-095, and C2-B-101, `> {k}` followed by `t` writes an empty quote and a paragraph in 0.1. The multiline `{.x` then `.y}` form under `- >` is also consumed. In a doubly quoted item, `> > - {.x` then `> >    .y}` leaves an empty item and a following paragraph in 0.1. **SILENT** | Unchanged 0.2 source prints the attribute inside the quote. | Remove the consumed attribute and keep the empty quote or item; use an empty comment and blank line for the doubly quoted item; rewrite |
| U-142 | Under C2-B-090, C2-B-100, and C2-B-101, `:: t` then `: {empty}` then `flush` writes an empty description body and a following paragraph in 0.1. **SILENT** | The same 0.2 source prints `{empty}` and keeps `flush` in the body. | Write `: {% %}` and insert a blank line before `flush`, and replace every sentinel when several empty descriptions occur together; rewrite |

#### Other measured rendering changes

Each row gives the smallest input retained by the measurement and the exact HTML from both renderers.

| ID | Before in 0.1 | After in 0.2 | Tool |
| --- | --- | --- | --- |
| U-143 | Under C2-I-047,C2-I-051, /{/ writes &lt;p&gt;&lt;em&gt;{&lt;/em&gt;&lt;/p&gt; in 0.1. **SILENT** | The same source writes &lt;p&gt;/{/&lt;/p&gt; in 0.2. | Review; report |
| U-144 | Under C2-I-035,C2-I-048, {+-"+} writes &lt;p&gt;&lt;ins&gt;-”&lt;/ins&gt;&lt;/p&gt; in 0.1. **SILENT** | The same source writes &lt;p&gt;&lt;ins&gt;-“&lt;/ins&gt;&lt;/p&gt; in 0.2. | Review; report |
| U-145 | Under C2-I-047,C2-I-048,C2-I-051, /*// writes &lt;p&gt;&lt;em&gt;*&lt;/em&gt;/&lt;/p&gt; in 0.1. The 0.1 reading of `/***/` nests strong and emphasis around a star. **SILENT** | The first source is text in 0.2; C2-I-049 makes the three-star run in the second source literal. In `/a /b/`, 0.2 pairs the inner slashes. | The tool writes `{*{/*/}*}` or `{/a /b/}` for the checked shapes. Review other pairings; report |
| U-146 | Under C2-B-133 and C2-I-044, `[ %%]` writes `<p>[]</p>` in 0.1. The `[a %% c] d` form writes `<p>[a] d</p>`. In a quote, `>   %% note` followed by `>   more` leaves `more` outside the description term. **SILENT** | The same 0.2 sources write `<p>[</p>` and `<p>[a</p>`, respectively, and can fold `more` into the term. | Review the comment boundary; report |
| U-147 | Under C2-B-175,C2-B-184, \|\| ⏎ +\|\| writes &lt;table&gt; ⏎   &lt;tbody&gt; ⏎     &lt;tr&gt;&lt;td&gt;&lt;/td&gt;&lt;/tr&gt; ⏎   &lt;/tbody&gt; ⏎ &lt;/table&gt; in 0.1. **SILENT** | The same source writes &lt;table&gt; ⏎   &lt;tbody&gt; ⏎     &lt;tr&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;/tr&gt; ⏎   &lt;/tbody&gt; ⏎ &lt;/table&gt; in 0.2. | Review; report |
| U-148 | Under C2-I-081,C2-I-084, # 	%%h writes &lt;section id="h"&gt; ⏎   &lt;h1&gt;	%%h&lt;/h1&gt; ⏎ &lt;/section&gt; in 0.1. **SILENT** | The same source writes &lt;section id="s"&gt; ⏎   &lt;h1&gt;&lt;/h1&gt; ⏎ &lt;/section&gt; in 0.2. | Review; report |
| U-149 | Under C2-I-044,C2-I-090, :f[%%] writes &lt;p&gt;&lt;span class="ext-f"&gt;&lt;/span&gt;&lt;/p&gt; in 0.1. **SILENT** | The same source writes &lt;p&gt;&lt;span class="ext-f"&gt;%%&lt;/span&gt;&lt;/p&gt; in 0.2. | Review; report |
| U-150 | Under C2-B-180,C2-B-185, {widths=5} ⏎ \|\|\| writes &lt;table&gt; ⏎   &lt;colgroup&gt; ⏎     &lt;col style="width: 5%;"&gt; ⏎   &lt;/colgroup&gt; ⏎   &lt;tbody&gt; ⏎     &lt;tr&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;/tr&gt; ⏎   &lt;/tbody&gt; ⏎ &lt;/table&gt; in 0.1. **SILENT** | The same source writes &lt;table&gt; ⏎   &lt;colgroup&gt; ⏎     &lt;col style="width: 5%;"&gt; ⏎     &lt;col&gt; ⏎   &lt;/colgroup&gt; ⏎   &lt;tbody&gt; ⏎     &lt;tr&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;/tr&gt; ⏎   &lt;/tbody&gt; ⏎ &lt;/table&gt; in 0.2. | Review; report |
| U-151 | Under C2-I-050,C2-I-052, _{_ writes &lt;p&gt;&lt;u&gt;{&lt;/u&gt;&lt;/p&gt; in 0.1. **SILENT** | The same source writes &lt;p&gt;{_{_}&lt;/p&gt; in 0.2. | Review; report |
| U-152 | Under C2-B-169,C2-B-177, \|\|	&lt;\| writes &lt;table&gt; ⏎   &lt;tbody&gt; ⏎     &lt;tr&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;	&amp;lt;&lt;/td&gt;&lt;/tr&gt; ⏎   &lt;/tbody&gt; ⏎ &lt;/table&gt; in 0.1. **SILENT** | The same source writes &lt;table&gt; ⏎   &lt;tbody&gt; ⏎     &lt;tr&gt;&lt;td colspan="2"&gt;&lt;/td&gt;&lt;/tr&gt; ⏎   &lt;/tbody&gt; ⏎ &lt;/table&gt; in 0.2. | Review; report |
| U-153 | Under C2-B-027,C2-B-033, - 	e writes &lt;ul&gt; ⏎   &lt;li&gt;	e&lt;/li&gt; ⏎ &lt;/ul&gt; in 0.1. **SILENT** | The same source writes &lt;ul&gt; ⏎   &lt;li&gt;e&lt;/li&gt; ⏎ &lt;/ul&gt; in 0.2. | The tool checks removal of the marker-padding tab against the complete HTML; report |
| U-154 | Under C2-H-088, ^[ [^1]] ⏎ [^1]: n writes &lt;p&gt;&lt;a id="fnref1" href="#fn1" role="doc-noteref"&gt;&lt;sup&gt;1&lt;/sup&gt;&lt;/a&gt;&lt;/p&gt; ⏎ &lt;section role="doc-endnotes" aria-label="Footnotes"&gt; ⏎   &lt;hr&gt; ⏎   &lt;ol&gt; ⏎     &lt;li id="fn1"&gt; ⏎       &lt;p&gt; [^1]&lt;a href="#fnref1" role="doc-backlink" aria-label="Back to reference"&gt;↩&lt;/a&gt;&lt;/p&gt; ⏎     &lt;/li&gt; ⏎   &lt;/ol&gt; ⏎ &lt;/section&gt; in 0.1. **SILENT** | The same source writes &lt;p&gt;&lt;a id="fnref1" href="#fn1" role="doc-noteref"&gt;&lt;sup&gt;1&lt;/sup&gt;&lt;/a&gt;&lt;/p&gt; ⏎ &lt;section role="doc-endnotes" aria-label="Footnotes"&gt; ⏎   &lt;hr&gt; ⏎   &lt;ol&gt; ⏎     &lt;li id="fn1"&gt; ⏎       &lt;p&gt; &lt;a id="fnref2" href="#fn2" role="doc-noteref"&gt;&lt;sup&gt;2&lt;/sup&gt;&lt;/a&gt;&lt;a href="#fnref1" role="doc-backlink" aria-label="Back to reference"&gt;↩&lt;/a&gt;&lt;/p&gt; ⏎     &lt;/li&gt; ⏎     &lt;li id="fn2"&gt; ⏎       &lt;p&gt;n&lt;a href="#fnref2" role="doc-backlink" aria-label="Back to reference"&gt;↩&lt;/a&gt;&lt;/p&gt; ⏎     &lt;/li&gt; ⏎   &lt;/ol&gt; ⏎ &lt;/section&gt; in 0.2. | Review; report |
| U-155 | Under C2-I-034,C2-I-039, a	%% writes &lt;p&gt;a	%%&lt;/p&gt; in 0.1. **SILENT** | The same source writes &lt;p&gt;a&lt;/p&gt; in 0.2. | Review; report |
| U-157 | Under C2-B-108,C2-B-110,C2-B-122, &#96;&#96;&#96;s ""u writes &lt;pre&gt;&lt;code class="language-s"&gt;&lt;/code&gt;&lt;/pre&gt; in 0.1. **SILENT** | The same source writes &lt;pre title=""&gt;&lt;code class="language-s"&gt;&lt;/code&gt;&lt;/pre&gt; in 0.2. | Review; report |
| U-158 | Under C2-I-079 and C2-I-085, `[a][a]{.c}{#i}` writes the unresolved reference and the literal `{.c}{#i}` in 0.1. **SILENT** | The same source writes the reordered literal `{#i .c}` in 0.2. | Review the unresolved reference; report |
| U-159 | Under C2-B-046,C2-H-032, - [x] a  h writes &lt;ul class="task-list"&gt; ⏎   &lt;li data-task-state="x"&gt;&lt;input type="checkbox" checked disabled aria-label="a h"&gt; a  h&lt;/li&gt; ⏎ &lt;/ul&gt; in 0.1. **SILENT** | The same source writes &lt;ul class="task-list"&gt; ⏎   &lt;li data-task-state="x" class="task" style="list-style: none"&gt;&lt;input type="checkbox" checked disabled aria-label="a  h"&gt; a  h&lt;/li&gt; ⏎ &lt;/ul&gt; in 0.2. | Review; report |
| U-160 | Under C2-I-087,C2-B-082, x[^f ⏎ g] ⏎ [^f g]: n writes &lt;p&gt;x[^f ⏎ g]&lt;/p&gt; in 0.1. **SILENT** | The same source writes &lt;p&gt;x&lt;a id="fnref1" href="#fn1" role="doc-noteref"&gt;&lt;sup&gt;1&lt;/sup&gt;&lt;/a&gt;&lt;/p&gt; ⏎ &lt;section role="doc-endnotes" aria-label="Footnotes"&gt; ⏎   &lt;hr&gt; ⏎   &lt;ol&gt; ⏎     &lt;li id="fn1"&gt; ⏎       &lt;p&gt;n&lt;a href="#fnref1" role="doc-backlink" aria-label="Back to reference"&gt;↩&lt;/a&gt;&lt;/p&gt; ⏎     &lt;/li&gt; ⏎   &lt;/ol&gt; ⏎ &lt;/section&gt; in 0.2. A tab inside the reference label has the same lookup effect. | Review; report |
| U-161 | Under C2-I-067,C2-B-083, ![][a ⏎ b] writes &lt;p&gt;![][a ⏎ b]&lt;/p&gt; in 0.1. **SILENT** | The same source writes &lt;p&gt;![][a b]&lt;/p&gt; in 0.2. | Review; report |
| U-162 | Under C2-B-171,C2-B-180, \|?v \| writes &lt;table&gt; ⏎   &lt;tbody&gt; ⏎     &lt;tr&gt;&lt;td style="vertical-align: bottom;"&gt;&lt;/td&gt;&lt;/tr&gt; ⏎   &lt;/tbody&gt; ⏎ &lt;/table&gt; in 0.1. **SILENT** | The same source writes &lt;table&gt; ⏎   &lt;tbody&gt; ⏎     &lt;tr&gt;&lt;td&gt;?v&lt;/td&gt;&lt;/tr&gt; ⏎   &lt;/tbody&gt; ⏎ &lt;/table&gt; in 0.2. | Review; report |
| U-163 | Under C2-B-046,C2-B-047, -  [ ] q writes &lt;ul class="task-list"&gt; ⏎   &lt;li&gt;&lt;input type="checkbox" disabled aria-label="q"&gt; q&lt;/li&gt; ⏎ &lt;/ul&gt; in 0.1. **SILENT** | The same source writes &lt;ul&gt; ⏎   &lt;li&gt;[ ] q&lt;/li&gt; ⏎ &lt;/ul&gt; in 0.2. | Review; report |
| U-164 | Under C2-H-101, [](‮javascript:) writes &lt;p&gt;&lt;a href="‮javascript:"&gt;&lt;/a&gt;&lt;/p&gt; in 0.1. **SILENT** | The same source writes &lt;p&gt;&lt;a href=""&gt;&lt;/a&gt;&lt;/p&gt; in 0.2. | Review; report |
| U-165 | Under C2-B-171,C2-B-167, \|{#x}\| writes &lt;table&gt; ⏎   &lt;tbody&gt; ⏎     &lt;tr&gt;&lt;td&gt;{&lt;span class="tag"&gt;&lt;strong&gt;#x&lt;/strong&gt;&lt;/span&gt;}&lt;/td&gt;&lt;/tr&gt; ⏎   &lt;/tbody&gt; ⏎ &lt;/table&gt; in 0.1. **SILENT** | The same source writes &lt;table&gt; ⏎   &lt;tbody&gt; ⏎     &lt;tr&gt;&lt;td id="x"&gt;&lt;/td&gt;&lt;/tr&gt; ⏎   &lt;/tbody&gt; ⏎ &lt;/table&gt; in 0.2. Under C2-H-013, a structural row span also replaces an authored `rowspan` on that cell. | Review; report |
| U-166 | Under C2-I-078, [][@a] writes &lt;p&gt;[][@a]&lt;/p&gt; in 0.1. **SILENT** | The same source writes &lt;p&gt;[][&lt;span class="mention"&gt;&lt;strong&gt;@a&lt;/strong&gt;&lt;/span&gt;]&lt;/p&gt; in 0.2. | Review; report |
| U-167 | Under C2-B-182,C2-B-185, \|=\| ⏎ \|:-\| writes &lt;table&gt; ⏎   &lt;thead&gt; ⏎     &lt;tr&gt;&lt;th scope="col" style="text-align: left;"&gt;=&lt;/th&gt;&lt;/tr&gt; ⏎   &lt;/thead&gt; ⏎ &lt;/table&gt; in 0.1. **SILENT** | The same source writes &lt;table&gt; ⏎   &lt;thead&gt; ⏎     &lt;tr&gt;&lt;th scope="col"&gt;&lt;/th&gt;&lt;/tr&gt; ⏎   &lt;/thead&gt; ⏎ &lt;/table&gt; in 0.2. | Review; report |
| U-168 | Under C2-B-179,C2-B-182, \|=\|\| writes &lt;table&gt; ⏎   &lt;tbody&gt; ⏎     &lt;tr&gt;&lt;td&gt;=&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;/tr&gt; ⏎   &lt;/tbody&gt; ⏎ &lt;/table&gt; in 0.1. **SILENT** | The same source writes &lt;table&gt; ⏎   &lt;tbody&gt; ⏎     &lt;tr&gt;&lt;th scope="row"&gt;&lt;/th&gt;&lt;td&gt;&lt;/td&gt;&lt;/tr&gt; ⏎   &lt;/tbody&gt; ⏎ &lt;/table&gt; in 0.2. | Review; report |
| U-169 | Under C2-B-100,C2-B-101, -{k} {#h} writes &lt;ul&gt; ⏎   &lt;li k=""&gt;&lt;/li&gt; ⏎ &lt;/ul&gt; in 0.1. **SILENT** | The same source writes &lt;ul&gt; ⏎   &lt;li k=""&gt;{#h}&lt;/li&gt; ⏎ &lt;/ul&gt; in 0.2. | Review; report |
| U-170 | Under C2-I-092, @a- writes &lt;p&gt;&lt;span class="mention"&gt;&lt;strong&gt;@a-&lt;/strong&gt;&lt;/span&gt;&lt;/p&gt; in 0.1. **SILENT** | The same source writes &lt;p&gt;&lt;span class="mention"&gt;&lt;strong&gt;@a&lt;/strong&gt;&lt;/span&gt;-&lt;/p&gt; in 0.2. | Review; report |
| U-171 | Under C2-B-157,C2-B-197, ![ ⏎ ]() writes &lt;img src="" alt=" ⏎ "&gt; in 0.1. **SILENT** | The same source writes &lt;p&gt;&lt;img src="" alt=" ⏎ "&gt;&lt;/p&gt; in 0.2. | Review; report |
| U-172 | Under C2-B-066,C2-H-040, {loose} ⏎ :: T writes &lt;dl&gt; ⏎   &lt;dt&gt;T&lt;/dt&gt; ⏎ &lt;/dl&gt; in 0.1. **SILENT** | The same source writes &lt;dl loose=""&gt; ⏎   &lt;dt&gt;T&lt;/dt&gt; ⏎ &lt;/dl&gt; in 0.2. | Review; report |
| U-174 | Under C2-B-027,C2-B-014, # 	x writes &lt;section id="x"&gt; ⏎   &lt;h1&gt;	x&lt;/h1&gt; ⏎ &lt;/section&gt; in 0.1. **SILENT** | The same source writes &lt;section id="x"&gt; ⏎   &lt;h1&gt;x&lt;/h1&gt; ⏎ &lt;/section&gt; in 0.2. | Review; report |
| U-175 | Under C2-I-067,C2-I-068, []( ) writes &lt;p&gt;&lt;a href=""&gt;&lt;/a&gt;&lt;/p&gt; in 0.1. **SILENT** | The same source writes &lt;p&gt;[]( )&lt;/p&gt; in 0.2. | Review; report |
| U-176 | Under C2-B-001,C2-I-084, # T ␍ b writes &lt;section id="T"&gt; ⏎   &lt;h1&gt;T&lt;/h1&gt; ⏎   &lt;p&gt;b&lt;/p&gt; ⏎ &lt;/section&gt; in 0.1. **SILENT** | The same source writes &lt;section id="T-b"&gt; ⏎   &lt;h1&gt;T ␍ b&lt;/h1&gt; ⏎ &lt;/section&gt; in 0.2. | Review; report |

#### Further measured rewrites

Each spelling in this table is applied only when the complete 0.1 HTML equals the rewritten 0.2 HTML.

| ID | Rule | Before in 0.1 | Write in 0.2 / tool |
| --- | --- | --- | --- |
| U-177 | A footnote definition body owns only its indented continuation under C2-B-081,C2-B-087 **SILENT** | [^a]: o ⏎ + ⏎  e ⏎  ⏎ s | [^a]: o ⏎  ⏎ {% %} ⏎  e ⏎  ⏎ s; rewrite |
| U-178 | A div label or title is recognized only in its metadata slot under C2-B-119,C2-B-121 **SILENT** | :::[+] | ::: [+]; rewrite |
| U-179 | A fence after a description mark ends at the description boundary under C2-B-072,C2-B-078,C2-B-109 **SILENT** | :: t ⏎ : &#96;&#96;&#96; ⏎  y | :: t ⏎ : &#96;&#96;&#96; ⏎ y; rewrite |
| U-180 | An indented description mark below a term is term text under C2-B-067,C2-B-069 **SILENT** | :: t ⏎  : b |  :: t ⏎  : b; rewrite |
| U-181 | A tag sigil in escaped angle text still parses under C2-I-090,C2-I-092 **SILENT** | \&lt;/#x&gt; | \&lt;/\#x&gt;; escape |
| U-182 | Under C2-I-044 and C2-I-050, `[{*a]*}` writes literal text in 0.1. **SILENT** | The same 0.2 source writes a strong span that crosses the bracket boundary. | Escape the star after the opening brace to retain the literal text; escape |
| U-184 | A nested list opener or pending attribute changes item ownership under C2-B-056,C2-B-091 **SILENT** | - {{ e }} | - \{{ e }}; escape |
| U-185 | An equals marker alone in a table row starts a header section under C2-B-179,C2-B-182 **SILENT** | \|=\| | \|\=\|; escape |
| U-186 | An empty div label needs a space after the colon fence under C2-B-119 **SILENT** | :::[] | ::: []; rewrite |
| U-187 | An at-sign bracket definition is a definition under 0.2 under C2-B-083,C2-I-091 **SILENT** | [@]: y |  [@]: y; rewrite |
| U-188 | A plus-minus shorthand is recognized inside a colon pair under C2-I-041 **SILENT** | :+-: | :\+-:; escape |
| U-189 | An empty footnote label followed by braces changes inline ownership under C2-I-087,C2-I-089 **SILENT** | d[^]{} | d[\^]{}; escape |

#### Remaining measured source changes

The tool checks each rewrite against the complete 0.1 HTML. The report rows name differences for which a preserving 0.2 spelling has not been verified.

| ID | Before in 0.1 | After in 0.2 | Tool |
| --- | --- | --- | --- |
| U-190 | Under C2-I-035, `-"` before a hard break writes a closing smart quote, and <code>x{.k title="&#96;"} y</code> can read its backtick as code in 0.1. **SILENT** | The quote closes, as in 0.1 (C2-I-104), and the quoted attribute is one opaque atom in 0.2. | Write the rendered Unicode quote, replacing multiple attribute openers together when the complete HTML check passes; rewrite |
| U-191 | Under C2-B-117, a code fence with `s` and an empty quoted title has no title attribute. **SILENT** | The same fence writes `title=""`. | Remove the empty quoted title; rewrite |
| U-192 | Under C2-B-103, `[]{:r lang}` writes an empty `lang` attribute. **SILENT** | The language shorthand wins and writes `lang="r"`. | Remove the shorthand, including when a later separate `lang` attribute supplies the old value; rewrite |
| U-193 | Under C2-B-027 and C2-B-067, `:: ` followed by a tab and `x` writes the tab in the term. **SILENT** | The tab is marker padding and the term is `x`. | Review the term; report |
| U-194 | Under C2-B-171, a table cell beginning with a tab and `---` writes the tab and a smart dash. **SILENT** | The tab is cell padding and only the smart dash remains. | Review the cell; report |
| U-195 | Under C2-B-119 and C2-B-121, `:::[`x`]` writes a div label containing a code span. **SILENT** | With a space after the fence, the label contains literal backticks. | Review the div label; report |
| U-197 | Under C2-B-090, C2-B-095, and C2-B-101, `- a` then `  {.k}` then `# H` consumes the attribute without attaching it. **SILENT** | The same source prints the attribute in the item. | Remove the attribute and put a blank line before the following heading or paragraph; rewrite |
| U-198 | Under C2-I-062, `{~a~>~}` writes `&lt;del&gt;a&lt;/del&gt;&lt;ins&gt;&lt;/ins&gt;` in 0.1. **SILENT** | The source writes `&lt;s&gt;a~&amp;gt;&lt;/s&gt;` in 0.2, and C2-W-116 gives the empty insertion no spelling. | Review the replacement; report |
| U-199 | Under C2-B-076 and C2-B-078, `:: t` then `:  d` then `   {.k}` then `tail` consumes the attribute and leaves `tail` outside the description in 0.1. After `:  %% c`, an indented `flush` also stands outside. **SILENT** | The same lines keep the attribute text or `flush` in the description body in 0.2. | Remove the consumed attribute and put a blank line before `tail`. For `:: term`, `: first`, a blank line, and ` second`, move `second` to column zero. Move an outside `flush` to column zero; rewrite |
| U-200 | Under C2-I-062 and C2-I-043, `{~a~>b~}{.k} c` writes a deletion, an insertion, and literal `{.k}` in 0.1. **SILENT** | After the arrow is expanded in 0.2, `{.k}` attaches to the insertion. | Write `{-a-}{+b+}\{.k} c`; rewrite |
| U-201 | Under C2-I-060, C2-I-062, and C2-I-119, `{_a %% b_} y` writes `&lt;u&gt;a&lt;/u&gt; y` in 0.1. **SILENT** | The line comment closes the braced span at its own boundary in 0.2, so the source writes literal `{_a` and drops the rest of the line. | Review the braced span; report |
| U-202 | Under C2-I-089, `x ^[a ^[b] c]` writes one footnote whose body contains literal `^[b]` in 0.1. **SILENT** | The inner opener starts a second footnote in 0.2. | Write `x ^[a \^[b] c]`; escape |
| U-204 | Under C2-B-059 and C2-B-113, `:: t` then `:  d` then `+` then an open code fence with `a`, a blank line, and `b` keeps only `a` and the blank line inside the description fence in 0.1. **SILENT** | The unchanged source keeps `b` inside the code fence in 0.2. At end of input without a final line feed, C2-B-222 adds one to the code value. | Remove `+`, indent the fence under the description, and close it before `b`. The tool checks the final line feed difference before explaining it; rewrite |
| U-206 | Under C2-H-095 and C2-H-096, `# *Setup*` then `See </#Setup>.` writes a link with a bold `Setup` label in 0.1. **SILENT** | The same cross-reference writes a plain `Setup` label in 0.2. | Review the cross-reference display; report |
| U-207 | Under C2-I-043 and C2-I-088, `Text[^a]{.ref}.` writes the unresolved footnote marker and literal `{.ref}` in 0.1. **SILENT** | The attribute disappears from the text in 0.2. | Write `Text[^a]\{.ref}.`; escape |
| U-209 | Under C2-B-059, `> quoted` then `+` then `- item` then `> more` writes `more` as a paragraph beside the quoted list in 0.1. **SILENT** | After the available continuation rewrite, 0.2 keeps `more` inside the quoted list item. | Review the container boundary; no preserving rewrite was verified for this source; report |
| U-210 | Under C2-B-069, C2-B-076, and C2-B-081, `:: term` then `:  [r]: /u` leaves an empty description body and defines `r` for a later link in 0.1. **SILENT** | The same 0.2 source prints the definition as description text and leaves the link unresolved. | Put `[r]: /u` at document scope and write `: {% %}`; rewrite |
| U-211 | Under C2-B-090 and C2-B-095, `{.a` then `.b}` then a blank line and `paragraph` attaches both classes to the paragraph in 0.1. **SILENT** | The same 0.2 source prints the multiline attribute as text and leaves the paragraph unstyled. | Join the attribute as `{.a .b}` and remove the separating blank line; rewrite |
| U-212 | Under C2-B-147 and C2-B-149, `> a` then an indented `^ cap` line keeps `^ cap` as quote text in 0.1. **SILENT** | The same 0.2 source attaches `cap` as a figure caption. | Escape the caret as `\^ cap`; escape |
| U-213 | Under C2-B-081 and C2-B-083, `See [^a].` then `- [^a]: note body` writes an empty item and resolves the footnote in 0.1. **SILENT** | The same 0.2 source prints the definition as item text and leaves the footnote unresolved. | Put `[^a]: note body` at document scope and write `- {% %}`; rewrite |
| U-214 | Under C2-B-169, \| a &#96;b \| c d \| keeps the middle pipe inside one code cell in 0.1. **SILENT** | The same 0.2 source splits the unclosed code span into two cells. | Close the code run before the final pipe, as in \| a &#96;b \| c d&#96; \|; rewrite |
| U-215 | Under C2-B-108, C2-B-110, and C2-B-114, `:: t` then `%%%` then `a` then `%%%` then `: body` writes one description list whose body is `body` in 0.1. **SILENT** | The same 0.2 source ends the description list before `: body`. | Remove the invisible percent fence span; rewrite |
| U-216 | Under C2-I-036 and C2-B-147, `{%%}![alt](x.png)` writes a block image in 0.1, and `![a](/i) %% c` followed by `^ cap` writes a captioned figure. **SILENT** | The same 0.2 sources can write a paragraph containing the image or a separate caret line. | Remove the invisible comment before or after the image; rewrite |
| U-218 | Under C2-B-082 and C2-I-036, `See[^f]` then `[^f]: {empty}` resolves an empty footnote in 0.1. **SILENT** | The same 0.2 source prints `{empty}` inside the footnote body. | Write `[^f]: {% %}` to keep the body empty; rewrite |
| U-219 | Under C2-B-109, `:::` followed by `::::` opens a nested div in 0.1, including when both lines have a quote prefix. **SILENT** | The longer run closes the shorter div in 0.2, including inside that quote. | Review the div structure; no preserving spelling has been verified for this shape; report |
| U-220 | Under C2-B-095, C2-B-197, and C2-I-039, `{.outer k=one}` before `![a](b){.inner k=two}` writes a block image with classes `outer inner` and key `k=two` in 0.1. **SILENT** | The same 0.2 source loses the outer class. | Write `![a](b){.outer k=one}{.inner k=two}` so the attributes merge in source order; rewrite |
| U-221 | Under C2-I-068, a link with a quoted title crossing a line break writes a link whose HTML title contains that line break in 0.1. **SILENT** | The current 0.2 parser writes the source as paragraph text. | Review the title; no preserving 0.2 spelling has been verified, and the clause does not decide whether the wrap is valid; report |
| U-222 | Under C2-B-056 and C2-B-076, `- one` then an indented `::: note` leaves the div outside the item in 0.1. A single-space line after a closed div in a description can likewise stand outside the description. **SILENT** | The same 0.2 lines keep the div or following text inside the preceding container. | Move the div opener or following text to column zero when the complete HTML check passes; rewrite |
| U-223 | Under C2-B-087 and C2-B-076, `[^f]: :: t` then a two-space `: | a |` keeps the table in the note's description body in 0.1. A one-space caret line stays outside the note. **SILENT** | The same 0.2 lines can fold into the term and lose the outside caret paragraph. | Indent the description mark to the note content column, and move the outside caret to column zero; rewrite |
| U-224 | Under C2-B-108, C2-B-110, and C2-B-114, a percent fence in `> %%%` then `> secret` then an unmarked closer hides the secret and leaves `after` outside the quote in 0.1. A percent fence in a note definition can likewise hide a later indented line. **SILENT** | The same 0.2 sources can retain `after` in the quote or reveal the indented line because the fence ends at a different container boundary. | Review the fence boundary; no preserving spelling has been verified for these shapes; report |
| U-225 | Under C2-B-147 and C2-B-197, `![alt](u)` followed by `^ %% hidden` keeps the caret as literal paragraph text in 0.1. **SILENT** | The same 0.2 source can take the caret as a caption mark. | Escape the caret so the image and caret remain in one paragraph; escape |
| U-226 | Under C2-B-147 and C2-B-198, `$$` followed by an unclosed backtick span and then `^ p` writes a math figure with caption `p` in 0.1. **SILENT** | The same 0.2 source keeps the caret line in the paragraph, as text behind the unclosed run (C2-I-017). | Close the code span on its math line, or remove a trailing invisible comment after a closed span, so the caption attaches; rewrite |
| U-227 | Under C2-I-036 and C2-B-108, a line containing `%%%` inside a multiline `{% ... %}` comment remains comment text in 0.1. **SILENT** | The same 0.2 source can read that line as a percent fence and change the following list boundary. | Escape the percent run inside the brace comment when the complete HTML check passes; escape |
| U-228 | Under C2-B-069 and C2-B-076, `:: term` then `: - a` then a blank line and a three-space `> c` writes the quote as a sibling of the list inside the description body in 0.1. **SILENT** | The same 0.2 source keeps the quote inside the item. | Move the quote or following list item to the description content column; rewrite |
| U-229 | Under C2-B-076 and C2-B-081, `[^f]: - :::::` then a seven-space `:::::` writes the second div outside the item but inside the note in 0.1. A seven-space caret line after a note-hosted item is likewise outside that item. **SILENT** | The same 0.2 lines keep the div or caret inside the item. | Move the follower to the note content column when the complete HTML check passes; rewrite |
| U-230 | Under C2-B-041 and C2-B-045, `{start=9}` before `3. x` writes `<ol start="3">` in 0.1. **SILENT** | The same 0.2 source writes `<ol start="9">` because the attribute decides. | Remove the conflicting attribute to keep the marker's start value; rewrite |
| U-232 | Under C2-B-069 and C2-B-076, `:: t` then `: para` then a one-space `| a |` writes a description followed by a table in 0.1. **SILENT** | The same 0.2 source writes the table inside the description body. | Move the table row to column zero to keep the 0.1 HTML; rewrite |
| U-233 | Under C2-I-035 and C2-I-104, `:a:"q"` then `:long-name:'q'` writes `:a:“q”` and `:long-name:‘q’` in 0.1. **SILENT** | The same 0.2 source can write closing quotes at both openings. | Write literal curly opening quotes where the complete HTML check confirms the old result; rewrite |
| U-234 | Under C2-I-079 and C2-I-085, `[\\^][]` writes a literal backslash and caret in 0.1. **SILENT** | The same 0.2 source drops the backslash while folding the unresolved label. | Add two backslashes to the run when the complete HTML check confirms the old result; rewrite |
| U-235 | Under C2-B-081 and C2-B-083, `* * [d]: u` then a two-space `:` writes an empty nested item and a colon outside it in 0.1. **SILENT** | The same 0.2 source keeps the definition and colon as item text. | Write an empty comment in the nested item and a blank line before the colon when the complete HTML check passes; rewrite |
| U-236 | Under C2-B-067, C2-B-069, and C2-B-076, `:: t` then ` :: u` then `: d` then ` : e` writes two terms and two descriptions in 0.1. A quote after a note-hosted description can likewise stand beside the description. **SILENT** | The same 0.2 source folds the indented marks or quote into the preceding description content. | Move the sibling marks or quote to their owning column when the complete HTML check passes; rewrite |
| U-237 | Under C2-B-056 and C2-B-076, `- a` then `  * w` then `  1. v` then a four-space `- u` writes the last list beside the ordered list inside the outer item in 0.1. Text after a nested div can also stand at that outer item level. **SILENT** | The same 0.2 source keeps the follower in the inner item. | Move the follower to the outer item content column when the complete HTML check passes; rewrite |
| U-238 | Under C2-B-057 and C2-B-111, <code>- &#96;&#96;&#96;</code>, `  x`, a blank line, `+`, and `tail` write one list item whose code holds the blank line and whose text is `tail` in 0.1. **SILENT** | The same 0.2 source ends the item before `+` and leaves `tail` outside. | Write a matching fence closer and indent `tail` under the item; rewrite |
| U-239 | Under C2-B-072 and C2-B-078, `:: t`, `: a`, a tab-indented code fence, and a one-space code fence write two code blocks in 0.1. **SILENT** | The same 0.2 source reads the second fence as a closer and writes only the first block. | Put the second fence at column zero when the complete HTML check passes; rewrite |
| U-240 | Under C2-I-030, `[a]{:abcdefgh} [b]{:abcdefghi}` writes a language span for `a` and literal `[b]{:abcdefghi}` in 0.1. **SILENT** | The same 0.2 source writes language spans for both `a` and `b`. | Review the new language span; report |
| U-241 | Under C2-B-129, `::: \\` then `[a` then `b][missing]` writes an unresolved reference fallback with a line feed in 0.1. **SILENT** | The same 0.2 source writes a hard break between `a` and `b`. | Review the fallback in the hardbreak div; report |
| U-242 | Under C2-B-108 and C2-B-110, a three-backtick fence containing an indented three-backtick line can keep that line as code content in 0.1. **SILENT** | The same 0.2 source can close the fence at the indented line. | Lengthen the opening fence to four backticks when the complete HTML check passes; rewrite |
| U-243 | Under C2-I-036 and C2-B-108, a line containing three backticks inside a multiline `{% ... %}` comment remains comment text in 0.1. **SILENT** | The same 0.2 source can read that line as a code fence and change the following list boundary. | Escape the first backtick inside the brace comment when the complete HTML check passes; escape |
| U-244 | Under C2-B-082, C2-B-091, and C2-B-095, `{.a}` followed by `[^f]: note`, a blank line, and `Visible` writes class `a` on the visible paragraph in 0.1. **SILENT** | The same 0.2 source leaves the visible paragraph without that class. | Move the floating attribute below the footnote definition when the complete HTML check passes; rewrite |
| U-245 | Under C2-B-108 and C2-B-110, a quoted ordered item can open a code fence whose blank line is written as a bare `>` before the next quoted paragraph. In 0.1, that line remains a blank code line. **SILENT** | The same 0.2 source omits that blank code line. | Add an indented closing fence after the bare quote line when the complete HTML check passes; rewrite |
| U-246 | Under C2-I-087, C2-I-044, and C2-B-091, `x[^n]{#i}` followed by `## {#i}` writes the unresolved footnote attribute literally and gives the heading id `i` in 0.1. **SILENT** | The same 0.2 source drops the inline attribute and changes the generated heading id. | Escape the attribute's hash, move the authored id above the heading, and escape the heading's opening brace when the complete HTML check passes; rewrite |
| U-247 | Under C2-B-025 and C2-B-026, an ordered item followed by an indented table row inside an admonition writes the table outside the item in 0.1. **SILENT** | The same 0.2 source keeps the table inside the item. | Move the row to the admonition column when the complete HTML check passes; rewrite |
| U-248 | Under C2-H-176, `c` followed by U+000B and `d` writes the control character itself between `c` and `d` in 0.1 HTML. **SILENT** | The same 0.2 source writes U+FFFD there; U+0085 and U+007F change in the same way. | Review the replacement character; report |
| U-249 | Under C2-H-009 and C2-H-013, inline math with `{CLASS=c}` writes the attribute name `CLASS` in 0.1 HTML. **SILENT** | The same 0.2 source writes `class`, keeping the `math inline c` value. | Review the canonical attribute name; report |
| U-250 | Under C2-B-082, C2-B-108, and C2-B-110, a note definition inside an item with an open code fence writes an empty list item and a resolved note with a trailing blank code line in 0.1. **SILENT** | The same 0.2 source can leave the note unresolved and show its definition as item text. | Move the definition to document scope, retain the empty item with a brace comment, and close the note fence when the complete HTML check passes; rewrite |
| U-251 | Under C2-B-046, C2-B-082, and C2-H-032, `[^n]: - [ ]  [^f]: x` followed by `r[^n] [^f]` writes the inner note definition separately and writes the task item without 0.2 task HTML in 0.1. **SILENT** | The same 0.2 source lets the task item consume that definition and writes task item HTML. | Review the changed note ownership and task HTML; report |
| U-252 | Under C2-B-046, C2-B-067, and C2-H-032, `- [x]   - :: term` followed by indented description lines writes the description at the older list boundary and writes the task item without 0.2 task HTML in 0.1. **SILENT** | The same 0.2 source changes nested description ownership and writes task item HTML. | Review the changed description and task HTML; report |
| U-253 | Under C2-B-082 and C2-B-109, `:::` followed by `b[^1]` and a later `[^1]: c` resolves the note after an implicitly closed div in 0.1. **SILENT** | The same 0.2 source keeps the definition inside the open div and leaves the reference unresolved. | Add an explicit div closer before the definition when the complete HTML check passes; rewrite |
| U-254 | Under C2-I-023, C2-I-043, and C2-I-047, `/{+a/{k=b+}` writes a literal slash and an insertion, while `/x /*a %% b*/{.c} y` writes nested emphasis and strong text in 0.1. **SILENT** | The same 0.2 sources give the slash an emphasis opener or let `%%` consume the rest of its line. | Review delimiter and comment ownership; report |
| U-255 | Under C2-I-047, two escaped HTML tags containing `http://` and `fetch("//evil/?")` pair slash delimiters around the text from `iframe` to `fetch` in 0.1. **SILENT** | The same 0.2 source closes that emphasis after `evil`. | Review the escaped text emphasis boundary; report |
| U-256 | Under C2-I-044 and C2-I-090, `# H {#id .cls}` and `{%~{#i}` expose a tag inside a failed brace attribute in 0.1. **SILENT** | The intact brace form hides the tag in 0.2. | Escape the closing brace in the heading or the opening brace before `#i` after checking the complete HTML; rewrite |
| U-257 | Under C2-I-044 and C2-I-047, `^[/[^[g]/] b/]` gives an inline note whose body is emphasis containing a literal bracket run. A related braced insert keeps `+}]` in its text. **SILENT** | The inner bracket closes the note earlier in 0.2. | Escape the inner bracket run inside a braced span when the complete HTML check passes; rewrite |

U-156, U-173 and U-208 are withdrawn: `::: e[`, `c--------` and `-{+a+} text` give the same HTML in 0.1 and 0.2 (C2-B-119 and C2-B-225, C2-I-111, C2-B-101). U-183, U-196 and U-231 are withdrawn for the same reason: `![][]` above `^ a` stays paragraph text, since its brackets are text (C2-I-072, C2-B-197), and `{k='x}y'}` and `{id='a"b&c'}` are attribute lines, since a single-quoted value may hold a closing brace and a double quote (C2-I-033).

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
| `htmlToAst`, `htmlToCarve` | The HTML importer is part of 0.2.0 and reads the roundtrip carriers (C2-H-120, C2-H-182 to C2-H-190). The `v2/` engine has no importer yet. |
| `markdownToCarve`, `djotToCarve`, `bbcodeToCarve`, every `migrate*` helper | No 0.2 importer. |
| `expandIncludes`, `findDirectiveSites`, `parseDirective`, include helpers | No include expansion in the 0.2 engine yet; `includes.md` specifies it. Until then an `include` node remains unexpanded in the tree. |
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
| Tasks | 0.1 split a task item next to a plain item into two lists. 0.2 uses one list with `class="task-list"` on `<ul>` or `<ol>` and `class="task"` on the boxed `<li>`. Checkbox inputs and `data-task-state` remain. | Add a `li.task` rule for bullet items and review list grouping. Ordered task items keep their visible number. |
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
| Source lines and carriers | `sourceLine` becomes `sourceLines`. `roundtrip` carriers and their names changed. The `<template data-carve-abbreviations>` now holds the Carve source of one run of definitions, attribute lines and blank lines included, and stands at the place of that run (C2-H-178, C2-H-179). | Update `data-source-line` readers and do not parse old carrier names as a 2.0 contract. Read an abbreviation template with the Carve block reader, not line by line. |
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
| T-005 | move | `rawRef` | dropped; 0.1 references become `collapsed` when `rawRef` ends in `[]` and `full` otherwise; 0.1 has no `shortcut` form; `key` is folded | C2-A-178 |
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
| T-038 | rename | figure.target and shortCaption | caption.short; the figure itself is unwrapped (T-051, T-052) | C2-A-050 |
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
| T-049 | add | include directive | include with path, section, typed valid options and the invalid options as written; no expansion in core tree | C2-A-181 |
| T-050 | add | no extension source record; block extension deferred in an earlier draft | qualified `block_extension` and `inline_extension` may carry a typed `source` record; a block extension has a required core fallback | C2-A-122 C2-A-125 C2-X-024 |
| T-051 | merge | a `figure` that holds one image paragraph, code block, quote or math paragraph, and comments after it | that block, with the `caption` and the `attrs` of the figure in its own fields; the comments go where C2-A-082 places them; `kind` is dropped | C2-A-082 C2-A-178 |
| T-052 | move | any other `figure` | a `figure_group` with the same children, `caption` and `attrs`; `kind` is dropped | C2-A-084 C2-A-178 |

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
