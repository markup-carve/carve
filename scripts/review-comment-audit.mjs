import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function readPages(endpoint, run = execFileSync) {
  const output = run('gh', ['api', endpoint, '--paginate', '--jq', '.[]|@json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return output.split('\n').filter(Boolean).map(line => JSON.parse(line))
}

export function ticketReferences(body, repository, repositories) {
  const refs = new Set()
  const claimed = []
  const add = (pattern, format) => {
    for (const match of body.matchAll(pattern)) {
      if (claimed.some(([start, end]) => start <= match.index && match.index < end)) continue
      const reference = format(match)
      if (reference) refs.add(reference)
      claimed.push([match.index, match.index + match[0].length])
    }
  }
  add(/https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/(?:issues|pull)\/(\d+)/g, match => `${match[1]}#${match[2]}`)
  add(/(?<![\w./-])([\w.-]+\/[\w.-]+)#(\d+)/g, match => `${match[1]}#${match[2]}`)
  const owner = repository.split('/')[0]
  add(/(?<![\w./-])([\w.-]+)#(\d+)/g, match => !repositories || repositories.has(`${owner}/${match[1]}`) ? `${owner}/${match[1]}#${match[2]}` : undefined)
  for (const match of body.matchAll(/(?<![\w/&])#(\d+)\b/g)) {
    if (!claimed.some(([start, end]) => start <= match.index && match.index < end)) refs.add(`${repository}#${match[1]}`)
  }
  return [...refs].sort()
}

export function audit(organization, read = readPages) {
  const repositories = read(`orgs/${organization}/repos?type=public&per_page=100`).map(repo => repo.full_name).sort()
  const coverage = []
  const comments = []
  for (const repository of repositories) {
    const endpoint = `repos/${repository}/pulls/comments?per_page=100`
    const rows = read(endpoint)
    coverage.push({ repository, endpoint, comments: rows.length })
    for (const row of rows) comments.push({
      repository, id: row.id, url: row.html_url, pullRequest: row.pull_request_url,
      author: row.user?.login ?? null, createdAt: row.created_at, updatedAt: row.updated_at,
      tickets: ticketReferences(row.body, repository, new Set(repositories)), body: row.body,
    })
  }
  return { organization, channel: 'pull-request-review-comments', coverage, comments }
}

export function summarize(report, auditedAt) {
  return {
    organization: report.organization, auditedAt, channel: report.channel,
    endpoint: 'GET /repos/{owner}/{repo}/pulls/comments',
    repositories: report.coverage.map(({ repository, comments }) => ({ repository, comments })),
    totalComments: report.comments.length,
    referencesToCarveRs2212: report.comments.filter(comment => comment.tickets.includes('markup-carve/carve-rs#2212')).map(comment => comment.url),
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const summary = process.argv.includes('--summary')
  const [organization = 'markup-carve', output] = process.argv.slice(2).filter(value => value !== '--summary')
  if (!/^[\w-]+$/.test(organization)) throw new Error('Expected a GitHub organization name')
  const full = audit(organization)
  const report = JSON.stringify(summary ? summarize(full, new Date().toISOString().slice(0, 10)) : full, null, 2) + '\n'
  if (output) writeFileSync(output, report)
  else process.stdout.write(report)
}
