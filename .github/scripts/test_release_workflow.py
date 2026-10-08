import json
import re
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]


class UniqueLoader(yaml.BaseLoader):
    pass


def mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ValueError('Duplicate YAML key: ' + key)
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)


class WorkflowPolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = json.loads((ROOT / '.github/release-lane.json').read_text())
        cls.lane = yaml.load((ROOT / cls.config['workflow']).read_text(), Loader=UniqueLoader)
        cls.publisher = yaml.load((ROOT / cls.config['publisher']).read_text(), Loader=UniqueLoader)

    def test_new_releases_have_only_a_manual_trigger(self):
        self.assertEqual(set(self.lane['on']), {'workflow_dispatch'})
        self.assertEqual(set(self.publisher['on']), {'workflow_call'})
        self.assertEqual(self.lane['on']['workflow_dispatch']['inputs']['publish']['default'], 'false')

    def test_approval_follows_all_preflight_checks(self):
        job = self.lane['jobs']['approve']
        self.assertEqual(set(job['needs']), {'candidate', 'preflight'})
        self.assertEqual(job['environment'], 'release-approval')
        self.assertIn('inputs.publish', job['if'])
        self.assertTrue(any('release-lane.py approve' in step.get('run', '') for step in job['steps']))

    def test_publication_cannot_run_before_approval(self):
        job = self.lane['jobs']['publish']
        self.assertEqual(set(job['needs']), {'candidate', 'approve'})
        self.assertEqual(job['with']['publish'], 'true')
        self.assertEqual(self.lane['jobs']['preflight']['with']['publish'], 'false')

    def test_rehearsal_and_publication_use_the_same_commit(self):
        for name in ['preflight', 'publish']:
            job = self.lane['jobs'][name]
            self.assertEqual(job['with']['source_sha'], '${{ needs.candidate.outputs.sha }}')
            self.assertEqual(job['with']['notes_digest'], '${{ needs.candidate.outputs.notes_digest }}')
        for job in self.publisher['jobs'].values():
            for step in job.get('steps', []):
                if 'checkout@' in step.get('uses', '') and not step.get('with', {}).get('repository'):
                    self.assertEqual(step['with']['ref'], '${{ inputs.source_sha }}')

    def test_release_notes_follow_all_publishers(self):
        needs = set(self.lane['jobs']['finalize']['needs'])
        self.assertIn('publish', needs)
        if 'publish-pypi' in self.lane['jobs']:
            self.assertIn('publish-pypi', needs)

    def test_pypi_trusted_publishing_stays_in_the_original_top_level_workflow(self):
        if 'pypi' not in self.config['registries']:
            return
        self.assertEqual(self.config['workflow'], '.github/workflows/release.yml')
        self.assertFalse(any('gh-action-pypi-publish' in step.get('uses', '')
                             for job in self.publisher['jobs'].values() for step in job.get('steps', [])))
        job = self.lane['jobs']['publish-pypi']
        self.assertIn('publish', job['needs'])
        self.assertTrue(any('gh-action-pypi-publish' in step.get('uses', '') for step in job['steps']))

    def test_package_publishing_has_a_nonpublishing_branch(self):
        for job in self.publisher['jobs'].values():
            for step in job.get('steps', []):
                run = step.get('run', '')
                if any(text in run for text in ['npm publish', 'cargo publish', 'gem push']):
                    self.assertIn('if [ "$LANE_PUBLISH" = true ]; then', run)
                    self.assertIn('else', run)
                    self.assertTrue('--dry-run' in run or 'ls -l ./*.gem' in run)

    def test_remote_mutations_and_remote_asset_checks_are_publish_only(self):
        actions = ['action-gh-release', 'release-action', 'action-wordpress-plugin-deploy', 'configure-rubygems-credentials', 'crates-io-auth-action']
        commands = r'\b(gh release (upload|download)|git push|vsce publish|ovsx publish|publishPlugin|extension upload)\b|scripts/(publish-registry|release-checksums|verify-published-install)\.sh|uploads\.github\.com/'
        for job in self.publisher['jobs'].values():
            for step in job.get('steps', []):
                if any(action in step.get('uses', '') for action in actions) or re.search(commands, step.get('run', '')):
                    self.assertIn('inputs.publish', step.get('if', ''), step.get('name', step))
                    self.assertTrue(any('release-lane.py permit' in item.get('run', '') for item in job['steps']))

    def test_downloads_are_scoped_to_the_current_build_phase(self):
        for job in self.publisher['jobs'].values():
            for step in job.get('steps', []):
                if 'download-artifact@' in step.get('uses', ''):
                    self.assertTrue(any('inputs.publish' in step.get('with', {}).get(key, '') for key in ['name', 'pattern']), step)
                    self.assertNotEqual(step.get('if'), '${{ inputs.publish }}')

    def test_failure_reporting_runs_after_a_publish_failure(self):
        self.assertIn('always()', self.lane['jobs']['report']['if'])
        self.assertIn('approve', self.lane['jobs']['report']['needs'])

    def test_crates_trusted_publishing_preserves_the_caller_filename(self):
        if 'crates' in self.config['registries']:
            self.assertEqual(self.config['workflow'], '.github/workflows/release.yml')

    def test_asset_uploads_preserve_draft_notes(self):
        for job in self.publisher['jobs'].values():
            for step in job.get('steps', []):
                if any(name in step.get('uses', '') for name in ['action-gh-release', 'release-action']):
                    self.assertEqual(step['with']['draft'], 'true')
                    self.assertNotIn('body', step['with'])
                    self.assertEqual(step['with']['tag_name'], '${{ inputs.tag }}')


if __name__ == '__main__':
    unittest.main()
