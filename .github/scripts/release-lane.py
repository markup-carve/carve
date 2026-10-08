#!/usr/bin/env python3
"""Validate, tag and finalize a release at the workflow's exact commit."""
import argparse
import fnmatch
import hashlib
import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.request
import urllib.parse
from pathlib import Path


def api(path, payload=None):
    command = ['gh', 'api', path]
    if payload is not None:
        command += ['--method', 'POST' if path.endswith('/git/refs') else 'PATCH', '--input', '-']
    result = subprocess.run(command, input=json.dumps(payload) if payload is not None else None,
                            text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()


def draft(repo, tag, sha, allow_published=False):
    releases = json.loads(subprocess.check_output(
        ['gh', 'api', f'repos/{repo}/releases', '--paginate', '--slurp'], text=True))
    matches = [r for page in releases for r in page if r['tag_name'] == tag]
    assert len(matches) == 1, f'Expected one prepared release for {tag}'
    release = matches[0]
    assert allow_published or release['draft'], 'Release is already public'
    assert release['body'].strip(), 'Release notes are empty'
    target = release['target_commitish']
    assert target == sha, 'Prepare release notes with an exact commit SHA as target'
    assert target == sha, 'Release notes target a different commit'
    return release


def check_ci(repo, sha):
    runs = api(f'repos/{repo}/actions/runs?head_sha={sha}&per_page=100')['workflow_runs']
    relevant = [r for r in runs if r['head_sha'] == sha
                and r['event'] in ('push', 'pull_request')
                and Path(r['path']).name not in {'release.yml', 'release-publish.yml', 'deploy.yml', 'recover-release.yml', 'release-gate.yml', 'rehearse-release-notes.yml'}]
    assert relevant, 'No CI run exists for the release commit'
    latest = {}
    for run in relevant:
        key = (run['workflow_id'], run['event'])
        if key not in latest or run['run_number'] > latest[key]['run_number']:
            latest[key] = run
    failed = [r['html_url'] for r in latest.values()
              if r['status'] != 'completed' or r['conclusion'] != 'success']
    assert not failed, 'CI is incomplete or failed: ' + ', '.join(failed)


def check_tag(repo, tag, sha, absent=False):
    try:
        ref = api(f'repos/{repo}/git/ref/tags/{tag}')
    except subprocess.CalledProcessError as error:
        assert absent and '404' in error.stderr, error.stderr
        return
    assert not absent, 'Tag already exists; do not move a released version'
    obj = ref['object']
    while obj['type'] == 'tag':
        obj = api(f'repos/{repo}/git/tags/{obj["sha"]}')['object']
    assert obj['type'] == 'commit' and obj['sha'] == sha, 'Tag points to a different commit'


def output(name, value):
    delimiter = 'release_' + hashlib.sha256(os.urandom(32)).hexdigest()
    with open(os.environ['GITHUB_OUTPUT'], 'a') as stream:
        stream.write(f'{name}<<{delimiter}\n{value}\n{delimiter}\n')


def check_versions(config, version):
    for declaration in config.get('versions', []):
        path = Path(declaration['path'])
        text = path.read_text()
        if 'pattern' in declaration:
            match = re.search(declaration['pattern'], text, re.M)
            assert match, f'No version found in {path}'
            declared = match[1]
        else:
            import tomllib
            declared = json.loads(text) if path.suffix == '.json' else tomllib.loads(text)
            for key in declaration['field']:
                declared = declared[key]
        assert declared == version, f'{path} declares {declared}, expected {version}'


def check_branch_policy(repo, name, environment, default):
    policy = environment.get('deployment_branch_policy') or {}
    assert policy.get('custom_branch_policies') and not policy.get('protected_branches'), f'{name} has no default-branch restriction'
    policies = api(f'repos/{repo}/environments/{name}/deployment-branch-policies')['branch_policies']
    assert policies and all(rule['name'] == default and rule.get('type', 'branch') == 'branch' for rule in policies), f'{name} permits other branches or tags'


def check_approval_settings(repo, config):
    approval = api(f'repos/{repo}/environments/release-approval')
    assert any(rule['type'] == 'required_reviewers' and rule['reviewers']
               for rule in approval['protection_rules']), 'Release approval has no required reviewer'
    assert not approval.get('can_admins_bypass', True), 'Release approval allows bypassing review'
    default = api(f'repos/{repo}')['default_branch']
    check_branch_policy(repo, 'release-approval', approval, default)
    for name in config.get('publisher_environments', []):
        try:
            environment = api(f'repos/{repo}/environments/{name}')
        except subprocess.CalledProcessError as error:
            assert '404' in error.stderr, error.stderr
            raise AssertionError(f'{name} needs a default-branch publishing policy; apply configure-release-lane.py') from error
        check_branch_policy(repo, name, environment, default)
        assert not any(rule['type'] == 'required_reviewers' for rule in environment['protection_rules']), (
            f'{name} still requires a second review; apply configure-release-lane.py after merging')


def metadata(repo, tag, sha, publish):
    assert re.fullmatch(r'v?[0-9]+\.[0-9]+\.[0-9]+', tag), 'Use a stable X.Y.Z release version'
    assert re.fullmatch(r'[a-f0-9]{40}', sha), 'Release source must be an exact commit'
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
    assert head == sha, 'Checkout differs from the workflow commit'
    config = json.loads(Path('.github/release-lane.json').read_text())
    check_versions(config, tag.removeprefix('v'))
    check_approval_settings(repo, config)
    changelog = Path('CHANGELOG.md')
    if changelog.exists():
        version = re.escape(tag.removeprefix('v'))
        assert re.search(r'^## \[?v?' + version + r'\]?(?:\s|$)', changelog.read_text(), re.M), 'Changelog has no section for this version'
    default = api(f'repos/{repo}')['default_branch']
    if True:
        assert os.environ['GITHUB_REF'] == f'refs/heads/{default}', 'Publish from the default branch'
    check_tag(repo, tag, sha, absent=True)
    release = draft(repo, tag, sha)
    check_ci(repo, sha)
    for key, value in [('sha', sha), ('tag', tag), ('version', tag.removeprefix('v')),
                       ('release_id', str(release['id'])), ('body', release['body']),
                       ('notes_digest', digest(release['body']))]:
        output(key, value)
    print(f'Checked {tag} at {sha}; no tag or release was published')


def approve(repo, tag, sha, notes_digest):
    require_approval(repo)
    check_ci(repo, sha)
    release = draft(repo, tag, sha)
    assert digest(release['body']) == notes_digest, 'Notes changed after the checks'
    check_tag(repo, tag, sha, absent=True)
    api(f'repos/{repo}/git/refs', {'ref': f'refs/tags/{tag}', 'sha': sha})
    check_tag(repo, tag, sha)
    print(f'Tagged the checked commit: {tag} at {sha}')


def require_approval(repo):
    approvals = api(f'repos/{repo}/actions/runs/{os.environ["GITHUB_RUN_ID"]}/approvals')
    relevant = [review for review in approvals if any(
        environment['name'] == 'release-approval' for environment in review['environments'])]
    assert relevant and all(review['state'] == 'approved' for review in relevant), 'This run has no release approval'


def permit(repo, tag, sha, notes_digest):
    require_approval(repo)
    check_tag(repo, tag, sha)
    release = draft(repo, tag, sha)
    assert digest(release['body']) == notes_digest, 'Notes differ from the approved candidate'


def registry_version(url, version, timeout=600, package=None, sha=None):
    deadline = time.monotonic() + timeout
    while True:
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'carve-release-lane'})
            with urllib.request.urlopen(request, timeout=30) as response:
                data = json.load(response)
            found = None
            reference = None
            if isinstance(data, list):
                found = next((entry['version'] for entry in data if entry['version'] == version and entry.get('approve') and entry.get('listed') and not entry.get('hidden')), None)
            elif isinstance(data, dict) and 'server' in data:
                found = data['server']['version']
            elif package and 'packages' in data:
                found = next((entry for entry in data['packages'].get(package, [])
                              if entry['version'].removeprefix('v') == version), None)
                if found:
                    reference = found.get('source', {}).get('reference')
            elif isinstance(data, dict):
                found = data.get('version', data.get('info', {}).get('version', data.get('number', data.get('Version'))))
                if isinstance(found, dict):
                    found = found.get('num')
                reference = data.get('gitHead')
            if (found and package) or found == version or found == 'v' + version:
                if sha and reference:
                    assert reference == sha, 'Registry source differs from the checked commit'
                return
        except (urllib.error.URLError, TimeoutError, ValueError):
            pass
        if time.monotonic() >= deadline:
            raise AssertionError(f'Registry does not serve {version}: {url}')
        time.sleep(20)


def verify_assets(release, config, version):
    names = [asset['name'] for asset in release['assets']]
    for pattern in config.get('assets', []):
        expected = pattern.replace('{version}', version)
        assert any(fnmatch.fnmatchcase(name, expected) for name in names), f'Missing release asset: {expected}'


def registry_checks(config, tag, sha):
    version = tag.removeprefix('v')
    checks = []
    for kind, package in config.get('registries', {}).items():
        urls = {
            'npm': 'https://registry.npmjs.org/' + urllib.parse.quote(package, safe='') + '/' + version,
            'pypi': f'https://pypi.org/pypi/{package}/{version}/json',
            'crates': f'https://crates.io/api/v1/crates/{package}/{version}',
            'rubygems': f'https://rubygems.org/api/v2/rubygems/{package}/versions/{version}.json',
            'packagist': f'https://repo.packagist.org/p2/{package}.json',
            'go': f'https://proxy.golang.org/{package}/@v/{tag}.info',
            'mcp': 'https://registry.modelcontextprotocol.io/v0.1/servers/' + urllib.parse.quote(package, safe='') + '/versions/' + version,
            'jetbrains': f'https://plugins.jetbrains.com/api/plugins/{package}/updates?size=100',
        }
        options = {'sha': sha} if kind in ['npm', 'packagist'] else {}
        if kind == 'packagist': options['package'] = package
        checks.append((kind, urls[kind], options))
    return checks


def report(repo, tag, sha, notes_digest):
    config = json.loads(Path('.github/release-lane.json').read_text())
    lines = [f'Release publication status for {tag} at {sha}', '']
    try:
        release = draft(repo, tag, sha, allow_published=True)
        verify_assets(release, config, tag.removeprefix('v'))
        lines.append('Expected GitHub assets: available')
        lines.append('GitHub notes: ' + ('draft' if release['draft'] else 'public'))
    except (AssertionError, subprocess.CalledProcessError) as error:
        lines.append('GitHub assets or notes: ' + str(error))
    for kind, url, options in registry_checks(config, tag, sha):
        try:
            registry_version(url, tag.removeprefix('v'), timeout=0, **options)
            lines.append(kind + ': available')
        except (AssertionError, subprocess.CalledProcessError) as error:
            lines.append(kind + ': ' + str(error))
    text = '\n'.join(lines) + '\n'
    print(text)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as stream: stream.write(text)


def finalize(repo, tag, sha, notes_digest):
    check_tag(repo, tag, sha)
    release = draft(repo, tag, sha)
    assert digest(release['body']) == notes_digest, 'Notes changed during publication'
    version = tag.removeprefix('v')
    config = json.loads(Path('.github/release-lane.json').read_text())
    verify_assets(release, config, version)
    for kind, url, options in registry_checks(config, tag, sha):
        registry_version(url, version, **options)
    updated = api(f'repos/{repo}/releases/{release["id"]}',
                  {'tag_name': tag, 'target_commitish': sha, 'draft': False})
    fresh = api(f'repos/{repo}/releases/{updated["id"]}')
    assert fresh['tag_name'] == tag and not fresh['draft'] and fresh['target_commitish'] == sha
    assert digest(fresh['body']) == notes_digest
    print(f'Published and verified {fresh["html_url"]}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('stage', choices=['metadata', 'approve', 'permit', 'finalize', 'report'])
    args = parser.parse_args()
    repo, tag, sha = (os.environ[k] for k in ['GITHUB_REPOSITORY', 'RELEASE_TAG', 'RELEASE_SHA'])
    if args.stage == 'metadata':
        metadata(repo, tag, sha, os.environ.get('RELEASE_PUBLISH') == 'true')
    else:
        globals()[args.stage](repo, tag, sha, os.environ['RELEASE_NOTES_DIGEST'])


if __name__ == '__main__':
    main()
