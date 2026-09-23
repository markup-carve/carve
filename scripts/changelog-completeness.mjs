#!/usr/bin/env node
/*
 * Every pull request that moved shipped source in this release is cited in the
 * release's changelog section.
 *
 * WHY THIS EXISTS. A `chore: cut X.Y.Z` commit writes the `## [X.Y.Z]` section
 * and then development simply carries on over it. Nobody reopens the section,
 * and weeks later the tag ships notes describing only the handful of changes
 * that existed on cut day. The engines measured it across one night: carve-rs
 * 0.1.7 documented 3 of 24 merges, carve-php 0.1.10 documented 1 of 22,
 * carve-js 0.1.8 documented 1 of 18. This repository was worse, and is the one
 * whose notes matter most: 0.1.6 shipped on 2026-09-19 and `[Unreleased]`
 * stayed EMPTY through the 33 merges that followed, so every ruling in that
 * range was recorded nowhere until somebody asked why there was no draft
 * release. The guard already in the release checklist asks whether a section
 * EXISTS and carries notes; that passes happily on a section covering 3 of 24
 * changes. Existence is not completeness, so this asks the other question.
 *
 * Ported from carve-js `scripts/changelog-completeness.mjs`, with the shipped
 * set and the citation reader adapted (see the two notes below).
 *
 * WHAT COUNTS AS SHIPPED SOURCE HERE. An engine's answer is `src/`, the code
 * its tarball is built from. This repository publishes no package - what it
 * ships is the language: the clauses, the grammar they are written in, and the
 * fixtures that decide whether an engine obeys them. So shipped source is the
 * AUTHORED half of those:
 *
 *   resources/spec/*.ebnf    the normative clauses
 *   resources/grammar.ebnf, resources/carve-core.ohm
 *                            the formal and executable grammar
 *   resources/examples/      the corpus source every fixture is generated from
 *   resources/*.json         the AST schema, the binding and import contracts,
 *                            the shared fixtures an implementer builds against
 *   tests/<fixture dir>/     the convert, escape, optional and round-trip
 *                            corpora, the HTML-import and importer-fidelity
 *                            fixtures, the include-security vectors
 *
 * The cut is drawn at the path rather than at the commit prefix on purpose: a
 * `fix:` prefix is a convention people drift from, and a `chore:`-prefixed
 * merge can still move a corpus row.
 *
 * WHAT IS DELIBERATELY NOT SHIPPED, and why each exclusion is not a hole:
 *
 *   scripts/, tools/, tests/*.mjs   This repository's own machinery: the
 *     comparison harness, the dependency map, the corpus generator, this gate.
 *     Nothing downstream reads them.
 *
 *   generated views   `tests/corpus` and `tests/spec` are generated from
 *     `resources/examples`, `tests/include-conformance` from the include
 *     generator, `docs/rules` from `resources/spec`. They move when their
 *     source moves, so counting them adds no coverage - and does add a finding
 *     every time a regeneration is committed on its own.
 *
 *   measurement ledgers   `resources/*.txt`, the corpus sidecar lock and the
 *     round-trip baseline record what the pinned engines currently do. A pin
 *     bump rewrites them and owes a reader nothing: six of the 67 merges in
 *     0.1.6 were exactly that, and they are the noise that gets a gate turned
 *     off.
 *
 *   docs/   The pages are prose ABOUT the language; the rule pages under
 *     docs/rules are generated from the clause source. Measured over 0.1.6,
 *     every merge the section documented had moved `resources/`, and nine
 *     docs-only merges (a README trim, an American-spelling sweep, an
 *     AI-writing pass) had no entry and needed none. The one page this
 *     repository declares normative, `docs/includes.md`, is audited against
 *     the clause source by scripts/normative-page-audit.mjs, so an obligation
 *     cannot move there while `resources/spec` stands still.
 *
 * That last one is the exclusion to revisit first: if an obligation ever does
 * land in a docs page alone, this gate will not see it.
 *
 * WHY IT ASKS GITHUB WHAT A PULL REQUEST CLOSES. The entries here cite the
 * ISSUE a ruling answers, not the pull request that carried it. A gate that
 * demanded the pull request number would have failed correctly documented
 * releases (it produced 41 false findings on a carve-js section), and a check
 * that cries wolf is one somebody deletes. So a pull request counts as cited
 * under its own number, under any issue GitHub records it as closing, or
 * under an issue its own SUBJECT names - this repository writes the issue
 * into the squash subject (`spec: ... (carve#1946) (#1972)`), and that is the
 * number the entry then uses.
 *
 * WHAT IT WILL NOT READ IS THE PULL REQUEST BODY. A body names the tickets
 * around the work for context, so accepting any number in it would pass a
 * section that merely mentioned the neighborhood: measured over the 0.1.4
 * range, body-wide acceptance silenced 26 of 46 findings. A body reference is
 * reported as a HINT instead, because when the section already cites the
 * ruling a follow-up belongs to, adding this number to that entry is the fix.
 *
 * WHY THE CITATION READER KNOWS THIS REPOSITORY'S NAME. The changelog here
 * writes a local reference as `carve#2094` - the bare repository name, not the
 * `owner/name` form - and a cross-repository one as `markup-carve/carve-js#N`
 * or, once, `carve-js#1910`. A reader that only understood `owner/name` would
 * count that last one as a local citation. So a qualifier is accepted only
 * when it is this repository's name or its full slug.
 *
 * Run:  node scripts/changelog-completeness.mjs [version] [options]
 *
 *   version        the release to check; defaults to package.json's version
 *   --at <rev>     read history and CHANGELOG.md as of this revision; defaults
 *                  to the tag when it exists, otherwise HEAD
 *   --previous <t> measure from this tag instead of the highest version tag
 *                  below `version`
 *   --section <h>  the heading to read; defaults to `version`
 *   --repo <o/n>   this repository's slug; defaults to GITHUB_REPOSITORY, then
 *                  the origin remote
 *   --root <dir>   the checkout to read; defaults to the working directory
 *
 * IT READS CHANGELOG.md FROM THE REVISION, NOT FROM YOUR WORKING TREE. That is
 * what makes it meaningful at tag time, and it means a local run answers about
 * the last COMMIT: changelog lines you have only saved are invisible to it.
 * Commit them (or point `--at` at a commit that has them) before reading a
 * failure as real.
 *
 * Needs `gh` authenticated (CI passes GITHUB_TOKEN). It refuses to run without
 * it rather than degrading to an answer it cannot back.
 *
 * Exit 0  every shipped-source pull request in range is cited or exempt.
 * Exit 1  at least one is not, and every one of them is named below.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const SHIPPED = [
    // The clause source and the formal grammar, plus the interchange schemas
    // and shared fixtures an implementer builds against.
    /^resources\//,
    // The fixture and vector sets an engine vendors and runs: the convert,
    // escape, optional and round-trip corpora, the HTML-import and
    // importer-fidelity fixtures, the include-security vectors, the profile
    // fixtures. Authored here; see NOT_SHIPPED for the generated siblings.
    /^tests\/[^/]+\//,
    /^tests\/profile-fixtures\.json$/,
];
const NOT_SHIPPED = [
    // GENERATED VIEWS of the sources above. They move whenever their source
    // moves, so counting them adds no coverage and does add a finding every
    // time someone commits a regeneration on its own.
    //   tests/corpus, tests/spec  <- resources/examples, via generate-corpus
    //   tests/include-conformance <- gen-include-conformance
    //   docs/rules                <- resources/spec, via spec-rule-index
    /^tests\/corpus\//,
    /^tests\/spec\//,
    /^tests\/include-conformance\//,
    /^tests\/examples\//,
    // MEASUREMENT LEDGERS. Every `.txt` in resources/ is a declaration list or
    // an inventory - engine pin drift, fmt drift, AST divergence, the oracle
    // and converter ledgers, the page and clause inventories - and these two
    // JSON files are the same thing in another format: a corpus sidecar lock
    // and a round-trip snapshot stamped with the engine commit it measured.
    // A pin bump rewrites them all and owes the reader nothing; six of the 67
    // merges in 0.1.6 were exactly that.
    /^resources\/.*\.txt$/,
    /^resources\/corpus-sidecars\.lock\.json$/,
    /^resources\/import-roundtrip-baseline\.json$/,
];

const EXEMPT_FILE = '.changelog-exempt';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
    const at = args.indexOf(name);
    return at < 0 ? fallback : args[at + 1];
};
const positional = (() => {
    const out = [];
    for (let i = 0; i < args.length; i += 1) {
        if (args[i].startsWith('--')) { i += 1; continue; }
        out.push(args[i]);
    }
    return out;
})();

const root = resolve(flag('--root', process.cwd()));
const run = (cmd, rest, input) =>
    execFileSync(cmd, rest, { cwd: root, encoding: 'utf8', input, maxBuffer: 256 * 1024 * 1024 }).trim();
const git = (...rest) => run('git', rest);

const version = (positional[0] ?? JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version)
    .replace(/^v/, '');
const section = flag('--section', version);

const revExists = (rev) => {
    try { git('rev-parse', '--verify', '--quiet', `${rev}^{commit}`); return true; } catch { return false; }
};
const at = flag('--at', revExists(version) ? version : 'HEAD');

const slug = (() => {
    const given = flag('--repo', process.env.GITHUB_REPOSITORY);
    if (given) return given;
    const url = git('remote', 'get-url', 'origin');
    return (url.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/) ?? [])[1];
})();
const [owner, name] = slug.split('/');
// A reference belongs to THIS repository when it carries no qualifier, the
// bare repository name, or the full slug.
const local = new Set([name.toLowerCase(), slug.toLowerCase()]);

// ---------------------------------------------------------------------------
// The range: from the highest version tag strictly below this release.

const VERSION_TAG = /^v?(\d+)\.(\d+)\.(\d+)$/;
const order = (a, b) => {
    const x = a.match(VERSION_TAG).slice(1).map(Number);
    const y = b.match(VERSION_TAG).slice(1).map(Number);
    for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
};

const previous = (() => {
    const given = flag('--previous');
    if (given) return given;
    const below = git('tag', '--merged', at)
        .split('\n').map((t) => t.trim())
        .filter((t) => VERSION_TAG.test(t) && order(t, version) < 0);
    return below.length ? below.sort(order).pop() : undefined;
})();

const range = previous ? `${previous}..${at}` : at;

// ---------------------------------------------------------------------------
// What merged, and what of it touched shipped source.

const RECORD = '\u001f';
const commits = git('log', `--format=%H${RECORD}%s`, range).split('\n').filter(Boolean)
    .map((l) => { const [sha, subject] = l.split(RECORD); return { sha, subject }; });

const touchesShipped = (sha) =>
    git('diff-tree', '--no-commit-id', '--name-only', '-r', '-m', '--first-parent', '--root', sha)
        .split('\n').filter(Boolean)
        .some((f) => SHIPPED.some((re) => re.test(f)) && !NOT_SHIPPED.some((re) => re.test(f)));

// A squash merge carries its pull request as a trailing `(#N)`, the only
// number on the commit that can lead anywhere.
const pullRequest = (subject) => (subject.match(/\(#(\d+)\)\s*$/) ?? [])[1];

// A reference is to THIS repository when it carries no qualifier, the bare
// repository name (`carve#2094`, how the changelog here writes it), or the
// full slug. `carve-js#1910` is another repository and is not a citation of
// anything here.
const localReferences = (text) => {
    const out = [];
    for (const [, qualifier, number] of String(text)
        .matchAll(/([A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)?)?#(\d+)\b/g)) {
        if (qualifier && !local.has(qualifier.toLowerCase())) continue;
        out.push(number);
    }
    return out;
};

const shipping = new Map(); // number -> title
const named = new Map(); // number -> [issue numbers its subject names]
const unattributed = [];
for (const { sha, subject } of commits) {
    if (!touchesShipped(sha)) continue;
    const number = pullRequest(subject);
    if (!number) { unattributed.push({ sha: sha.slice(0, 9), subject }); continue; }
    if (!shipping.has(number)) shipping.set(number, subject.replace(/\s*\(#\d+\)\s*$/, ''));
    // Only a QUALIFIED reference counts here: the trailing `(#1972)` is the
    // pull request's own number, so a bare one says nothing.
    named.set(number, [...String(subject).matchAll(/([A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)?)#(\d+)\b/g)]
        .filter(([, qualifier]) => local.has(qualifier.toLowerCase()))
        .map(([, , n]) => n)
        .filter((n) => n !== number));
}

// ---------------------------------------------------------------------------
// What each pull request closes, batched by alias so this is a few requests
// rather than one per pull request.

const closes = new Map(); // pull request number -> [issue numbers]
const bodies = new Map(); // pull request number -> body, read for the hint only
const numbers = [...shipping.keys()];
for (let i = 0; i < numbers.length; i += 50) {
    const chunk = numbers.slice(i, i + 50);
    const fields = chunk
        .map((n) => `p${n}: pullRequest(number:${n}){number title body closingIssuesReferences(first:30){nodes{number}}}`)
        .join('\n');
    const query = `query($owner:String!,$name:String!){repository(owner:$owner,name:$name){${fields}}}`;
    let answer;
    try {
        answer = run('gh', ['api', 'graphql', '-F', `owner=${owner}`, '-F', `name=${name}`, '-F', 'query=@-'], query);
    } catch (e) {
        console.log('::error::could not ask GitHub what these pull requests close, so completeness cannot be judged.');
        console.log(`::error::${String(e.stderr ?? e.message).trim().split('\n')[0]}`);
        process.exit(1);
    }
    const repo = JSON.parse(answer).data?.repository ?? {};
    for (const node of Object.values(repo)) {
        if (!node) continue;
        closes.set(String(node.number), node.closingIssuesReferences.nodes.map((n) => String(n.number)));
        bodies.set(String(node.number), node.body ?? '');
        if (node.title) shipping.set(String(node.number), node.title);
    }
}

// ---------------------------------------------------------------------------
// What the section cites. A reference to ANOTHER repository is not a citation
// of this one, so the qualifier is checked rather than grepping `#N`.

const changelog = (() => {
    try { return git('show', `${at}:CHANGELOG.md`); }
    catch { return readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8'); }
})();

const sectionText = (() => {
    const lines = changelog.split('\n');
    const head = new RegExp(`^## \\[?${section.replace(/\./g, '\\.')}\\]?(\\s|\\]|$)`);
    const start = lines.findIndex((l) => head.test(l));
    if (start < 0) return undefined;
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((l) => /^## /.test(l));
    return (end < 0 ? rest : rest.slice(0, end)).join('\n');
})();

if (sectionText === undefined) {
    console.log(`::error::CHANGELOG.md has no '## [${section}]' section to check`);
    process.exit(1);
}

const cited = new Set(localReferences(sectionText));

// ---------------------------------------------------------------------------
// Deliberate exclusions stay VISIBLE. An exemption with no reason is refused,
// so the escape hatch cannot decay into a list of bare numbers nobody can
// audit, and every one that applies is printed on a passing run too.

const exemptions = new Map();
const malformed = [];
const exemptPath = resolve(root, EXEMPT_FILE);
if (existsSync(exemptPath)) {
    readFileSync(exemptPath, 'utf8').split('\n').forEach((raw, i) => {
        const line = raw.trim();
        if (!line || line.startsWith('#')) return;
        const m = line.match(/^#?(\d+)\s*[:\s]\s*(\S.*)$/);
        if (!m) { malformed.push(`${EXEMPT_FILE}:${i + 1}: expected '<number>: <reason>', got '${line}'`); return; }
        exemptions.set(m[1], m[2].trim());
    });
}

const missing = [];
const skipped = [];
for (const [number, title] of [...shipping].sort((a, b) => Number(a[0]) - Number(b[0]))) {
    if (cited.has(number)) continue;
    if ((closes.get(number) ?? []).some((issue) => cited.has(issue))) continue;
    if ((named.get(number) ?? []).some((issue) => cited.has(issue))) continue;
    if (exemptions.has(number)) { skipped.push([number, title, exemptions.get(number)]); continue; }
    missing.push([number, title]);
}

for (const [number, title, reason] of skipped) {
    console.log(`exempt: #${number} ${title}\n        (${EXEMPT_FILE}: ${reason})`);
}
for (const { sha, subject } of unattributed) {
    console.log(`::notice::${sha} touched shipped source with no pull request to cite: ${subject}`);
}

const from = previous ? `since ${previous}` : 'so far';
if (malformed.length || missing.length) {
    for (const e of malformed) console.log(`::error::${e}`);
    for (const [number, title] of missing) {
        const also = closes.get(number)?.length ? ` (closes ${closes.get(number).map((n) => `#${n}`).join(', ')})` : '';
        console.log(`::error::#${number}${also} is not cited in the ${section} section: ${title}`);
        // A follow-up usually names the ruling it belongs to in its body, and
        // that ruling is usually already written up. Saying so turns the
        // finding into a one-word edit of an entry that exists.
        const neighbors = [...new Set(localReferences(bodies.get(number) ?? ''))]
            .filter((n) => n !== number && cited.has(n))
            .slice(0, 3);
        if (neighbors.length) {
            console.log(
                `::error::  #${number} names ${neighbors.map((n) => `#${n}`).join(', ')}, which the ` +
                `section does cite - add this number to that entry, or exempt it`,
            );
        }
    }
    if (missing.length) {
        console.log(
            `changelog-completeness: ${missing.length} of ${shipping.size} pull request(s) ${from} moved ` +
            `shipped source and are cited nowhere in the ${section} section. Write them up, or exempt ` +
            `one with a reason in ${EXEMPT_FILE}.`,
        );
    }
    process.exit(1);
}

console.log(
    `changelog-completeness: the ${section} section accounts for all ${shipping.size - skipped.length} ` +
    `shipped-source pull request(s) ${from}` +
    (skipped.length ? `, ${skipped.length} exempt` : '') +
    (unattributed.length ? `, ${unattributed.length} commit(s) carrying no pull request` : ''),
);
