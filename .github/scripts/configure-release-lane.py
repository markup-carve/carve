#!/usr/bin/env python3
"""Apply approval settings only after the release lane is installed."""
import argparse
import base64
import json
import subprocess
from pathlib import Path


def api(path, payload=None):
    args = ['gh', 'api', path]
    if payload is not None:
        args += ['--method', 'PUT', '--input', '-']
    result = subprocess.run(args, input=json.dumps(payload) if payload is not None else None, text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    config = json.loads(Path('.github/release-lane.json').read_text())
    repository = api('repos/' + args.repo)
    default = repository['default_branch']
    workflow = api(f'repos/{args.repo}/contents/{config["workflow"]}?ref={default}')
    text = base64.b64decode(workflow['content']).decode()
    assert 'environment: release-approval' in text and config['publisher'] in text, 'New lane is not installed on the default branch'
    approval = api(f'repos/{args.repo}/environments/release-approval')
    assert any(rule['type'] == 'required_reviewers' and rule['reviewers'] for rule in approval['protection_rules']), 'Approval environment has no reviewer'
    assert not approval.get('can_admins_bypass', True), 'Approval can bypass review'
    for name in ['release-approval'] + config['publisher_environments']:
        environment_path = f'repos/{args.repo}/environments/{name}'
        try:
            env = api(environment_path)
        except subprocess.CalledProcessError as error:
            assert name != 'release-approval' and '404' in error.stderr, error.stderr
            env = {'protection_rules': [], 'can_admins_bypass': False}
        print('Restrict credentials to the default branch:', args.repo, name)
        if args.apply:
            reviewers = [reviewer for rule in env['protection_rules'] if rule['type'] == 'required_reviewers' for reviewer in rule['reviewers']]
            payload = {'reviewers': [{'type': r['type'], 'id': r['reviewer']['id']} for r in reviewers],
                       'deployment_branch_policy': {'protected_branches': False, 'custom_branch_policies': True},
                       'can_admins_bypass': False}
            timers = [rule for rule in env['protection_rules'] if rule['type'] == 'wait_timer']
            if timers: payload['wait_timer'] = timers[0]['wait_timer']
            api(environment_path, payload)
            policies = api(environment_path + '/deployment-branch-policies')['branch_policies']
            if not any(p['name'] == default and p.get('type', 'branch') == 'branch' for p in policies):
                subprocess.run(['gh', 'api', environment_path + '/deployment-branch-policies', '--method', 'POST', '--input', '-'], input=json.dumps({'name': default, 'type': 'branch'}), text=True, check=True, capture_output=True)
            for policy in policies:
                if policy['name'] != default or policy.get('type', 'branch') != 'branch':
                    subprocess.run(['gh', 'api', environment_path + '/deployment-branch-policies/' + str(policy['id']), '--method', 'DELETE'], check=True, capture_output=True)
            fresh = api(environment_path + '/deployment-branch-policies')['branch_policies']
            assert fresh and all(p['name'] == default and p.get('type', 'branch') == 'branch' for p in fresh)
    for name in config['publisher_environments']:
        env = api(f'repos/{args.repo}/environments/{name}')
        if not any(rule['type'] == 'required_reviewers' for rule in env['protection_rules']):
            continue
        print('Remove the second review from', args.repo, name)
        if args.apply:
            payload = {'reviewers': [], 'deployment_branch_policy': env.get('deployment_branch_policy'),
                       'can_admins_bypass': env.get('can_admins_bypass', False)}
            timers = [rule for rule in env['protection_rules'] if rule['type'] == 'wait_timer']
            if timers:
                payload['wait_timer'] = timers[0]['wait_timer']
            api(f'repos/{args.repo}/environments/{name}', payload)
            fresh = api(f'repos/{args.repo}/environments/{name}')
            assert not any(rule['type'] == 'required_reviewers' for rule in fresh['protection_rules'])
    print('Approval settings checked' + (' and applied' if args.apply else '; use --apply to change them'))


if __name__ == '__main__':
    main()
