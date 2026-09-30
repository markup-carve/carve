---
description: "Coverage and provenance from the markup-carve review comment audit."
---

# Review comment audit

The 2026-09-30 sweep read every page of `GET /repos/{owner}/{repo}/pulls/comments` in all 64 public `markup-carve` repositories. It found 61 comments: 47 in `carve`, two in `carve-rs`, and 12 in `carve-grammars`. [Coverage counts](../resources/review-comment-audit.json) include repositories with no comments.

The two Rust comments belong to [PR #1448](https://github.com/markup-carve/carve-rs/pull/1448#discussion_r3869646843). They discuss a boolean, enum design and comment length. No fetched review comment names `carve-rs#2212`. The premise in [#2661](https://github.com/markup-carve/carve/issues/2661) therefore does not identify a recoverable review-thread ruling. The ruling appears in the body of [carve-rs PR #2218](https://github.com/markup-carve/carve-rs/pull/2218), then in [#2645](https://github.com/markup-carve/carve/issues/2645) and implemented by [#2656](https://github.com/markup-carve/carve/pull/2656).

The review comments on [PR #1256](https://github.com/markup-carve/carve/pull/1256#discussion_r3791999218) leave heading and table marker choices undecided, with [#1092](https://github.com/markup-carve/carve/issues/1092) already tracking that discussion. Earlier implementation comments identify their fixes and corpus rows. The grammar comments concern JavaScript compatibility and integration examples. No additional settled language rule was found only in these review threads.

Issue and PR bodies, and review summary bodies from `pulls/{number}/reviews`, are separate channels. Neither comment endpoint includes them.

To repeat the missing review-comment channel alongside an issue-comment sweep:

```sh
node scripts/review-comment-audit.mjs markup-carve /tmp/carve-review-comments.json
node scripts/review-comment-audit.mjs markup-carve resources/review-comment-audit.json --summary
```

The report preserves each comment's URL, author, timestamps, body and explicit ticket references. Bare issue numbers resolve within their repository; cross-repository references retain their repository. Fetch failures stop the audit. The script reads GitHub and writes a local report; it posts no comments.
