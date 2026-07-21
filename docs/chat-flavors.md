# Chat flavors

Tables describing how a Carve document is rendered into the markup a chat
client actually accepts.

::: info Non-normative and separately versioned
These tables are **not part of the Carve specification**. They describe other
people's formats, which vendors change on their own schedule - Discord added
headings and lists in 2023, Telegram added expandable blockquote in Bot API 7.3.
Binding them to the spec version would let Discord's roadmap force a Carve
revision, so they carry their own version in
[`resources/chat-flavors/manifest.json`](https://github.com/markup-carve/carve/blob/main/resources/chat-flavors/manifest.json)
and implementations opt in.
:::

## Why this exists

WhatsApp, Slack, Telegram, Discord and Signal each accept a small, mutually
incompatible subset of Markdown-like markup, with different link syntax,
different escaping rules and different length caps. Pandoc ships no writer for
any of them, so this gap is not reachable through the pandoc bridge.

Every platform here is a JSON file rather than code. Adding one costs a file,
in every implementation at once.

## Two families of target

A flavor declares which family it belongs to with `output`:

- **`markup`** (default) - formatting lives inside the message string as
  delimiters. WhatsApp, Slack, Telegram `parse_mode`, Discord.
- **`ranges`** - the body is plain text and the formatting travels beside it as
  style offsets. Signal, Telegram's `entities` field, Slack Block Kit.

Signal is the clearest case of the second: its documentation states that
Markdown "is not supported at this time and is not planned". Formatting is
applied by selecting text in the UI, so a typed `*bold*` stays literally
`*bold*` - yet the message still *displays* as bold, because the style rides
alongside the text.

## Schema

Node entries are keyed by the
[normative node-type vocabulary](./profiles#node-type-vocabulary-normative).
Every flavor must carry an entry for every type in it, so a type added to the
spec cannot silently degrade in every chat target at once.

| Field | Values |
|-------|--------|
| `support` | `native`, `none` |
| `fallback` | `unwrap`, `carve`, `inline`, `codeblock`, `appendix`, `drop` |
| `link.style` | `none`, `markdown`, `slackPipe`, `html` |
| `escape.mechanism` | `backslash`, `entities`, `none` |
| `output` | `markup` (default), `ranges` |
| `offsets` | `utf16` (default), `utf8`, `codepoints` - range-based only |
| `style` | the target's own style name, range-based only |
| `limits.message` | maximum message length |
| `verified` | when the syntax was last checked against the vendor |

Template placeholders: `{content}`, `{url}`, `{alt}`, `{title}`, `{hashes}`.

### Fallbacks

Chat formats cannot express most of Carve, so a target says what to do instead:

- **`unwrap`** - emit the children, drop the markup
- **`carve`** - keep Carve's own delimiters, so an inexpressible mark stays
  visible as `{=highlighted=}` or `{^sup^}` rather than flattening into
  ordinary text
- **`inline`** - emit via `template`, e.g. `{alt} ({url})`
- **`codeblock`** - flatten to a column-aligned monospace block (tables)
- **`appendix`** - collect and emit at the end, numbered (footnotes)
- **`drop`** - omit entirely

An implementation is expected to report what it degraded rather than mangling
silently: the reader of a WhatsApp message needs to know a link's address was
inlined because WhatsApp has no link syntax at all.

### Offsets are counted in a declared unit

This is not a detail to guess at. Telegram documents its entity offsets in
**UTF-16 code units**, so a character outside the BMP counts as two:

| unit | `start` of the bold span in `👍 *bold*` |
|------|------|
| `utf16` | 3 |
| `utf8` | 5 |
| `codepoints` | 2 |

Measuring in the wrong unit shifts every range after the first such character.

### Styles that carry more than a name

Once the delimiters are gone, the body has no room for a URL or a language, so
the range carries them - Telegram's `text_link` and `pre` both need this.
Ranges are not limited to inline marks: `blockquote` and `pre` cover whole
blocks, so a range-based body needs no `> ` prefix and no fence.

### Deriving a flavor

`extends` merges a parent. A declared node entry **replaces** the inherited one
outright, so state it fully - otherwise a key you did not restate (a parent's
`template`, say) would stay in charge.

### Extensions

An extension is addressed by a qualified key, so a flavor maps that one
extension rather than claiming every extension at once:

```json
"inline_extension:spoiler": { "support": "native", "open": "||", "close": "||" }
```

Note that `highlight` (`{=mark=}`) is **not** a spoiler. Highlight emphasizes,
a spoiler conceals; mapping one onto the other inverts what the author meant.

## Bundled flavors

| id | notes |
|----|-------|
| `whatsapp` | `*bold*`, `_italic_`, `~strike~`. No link markup at all, so links degrade to `text (url)`. |
| `slack` | mrkdwn. Links are `<url\|text>`. No heading syntax and no list syntax. |
| `telegram-html` | HTML parse mode: `<b> <i> <u> <s> <code> <pre> <a> <blockquote> <tg-spoiler>`. |
| `telegram-entities` | Range-based, for the Bot API `entities` field. |
| `discord` | Headings and lists are native. Masked links are **not**, in user-typed messages. |
| `discord-bot` | `extends: discord`, with masked links enabled. |
| `signal` | Range-based: plain text plus style offsets. |

### Why Discord appears twice

`[text](url)` does not render in a message a human types into Discord. It
renders in bot API messages, webhook content, embeds, and DMs from a bot.
Discord made that trade-off deliberately, to stop malicious URLs hiding behind
innocent-looking text. The two files differ by one key.

## Sourcing

Only the Slack table is sourced directly from vendor documentation. Telegram,
Discord, WhatsApp and Signal were corroborated across secondary sources -
Discord's and Signal's official pages both refuse automated fetch. Each flavor
records a `verified` date; treat it as when the table was last reviewed, not as
a guarantee the vendor has not changed since.

## Corpus

`tests/corpus-chat/` pairs each `NN-slug.crv` with the expected output per
flavor (`NN-slug.whatsapp`, `NN-slug.slack`, …). Implementations run it the way
they run the main corpus. The tables are opt-in, so an implementation without a
chat renderer simply does not run it.

`tests/chat-flavors.test.mjs` validates the tables themselves - vocabulary,
completeness against the normative node types, and the `verified` dates - and
needs no renderer, so the data stays checkable in this repo.
