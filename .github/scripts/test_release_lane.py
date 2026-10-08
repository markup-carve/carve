import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('lane', Path(__file__).with_name('release-lane.py'))
lane = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lane)
SHA = 'a' * 40
RELEASE = {'id': 1, 'tag_name': '0.1.4', 'draft': True, 'body': 'Prepared notes', 'target_commitish': SHA}


class ReleaseLaneTests(unittest.TestCase):
    def test_existing_tag_is_not_moved(self):
        with patch.object(lane, 'api', return_value={'object': {'type': 'commit', 'sha': SHA}}):
            with self.assertRaisesRegex(AssertionError, 'already exists'):
                lane.check_tag('owner/repo', '0.1.4', SHA, absent=True)

    def test_absence_requires_a_404(self):
        for status in ['403', '500']:
            error = subprocess.CalledProcessError(1, 'gh', stderr=status)
            with patch.object(lane, 'api', side_effect=error):
                with self.assertRaises(AssertionError):
                    lane.check_tag('owner/repo', '0.1.4', SHA, absent=True)

    def test_missing_tag_is_allowed_only_before_tagging(self):
        error = subprocess.CalledProcessError(1, 'gh', stderr='HTTP 404')
        with patch.object(lane, 'api', side_effect=error):
            lane.check_tag('owner/repo', '0.1.4', SHA, absent=True)
            with self.assertRaises(AssertionError):
                lane.check_tag('owner/repo', '0.1.4', SHA)

    def test_annotated_tag_is_resolved(self):
        with patch.object(lane, 'api', side_effect=[{'object': {'type': 'tag', 'sha': 'b' * 40}}, {'object': {'type': 'commit', 'sha': SHA}}]):
            lane.check_tag('owner/repo', '0.1.4', SHA)

    def test_wrong_tag_commit_fails(self):
        with patch.object(lane, 'api', return_value={'object': {'type': 'commit', 'sha': 'b' * 40}}):
            with self.assertRaisesRegex(AssertionError, 'different commit'):
                lane.check_tag('owner/repo', '0.1.4', SHA)

    def test_draft_targets_the_checked_commit(self):
        with patch.object(lane.subprocess, 'check_output', return_value=json.dumps([[dict(RELEASE, target_commitish='b' * 40)]])), patch.object(lane, 'api', return_value={'sha': 'b' * 40}):
            with self.assertRaisesRegex(AssertionError, 'exact commit'):
                lane.draft('owner/repo', '0.1.4', SHA)

    def test_public_release_is_not_a_draft(self):
        with patch.object(lane.subprocess, 'check_output', return_value=json.dumps([[dict(RELEASE, draft=False)]])):
            with self.assertRaisesRegex(AssertionError, 'already public'):
                lane.draft('owner/repo', '0.1.4', SHA)

    def test_missing_duplicate_and_empty_notes_fail(self):
        for releases in [[], [RELEASE, RELEASE], [dict(RELEASE, body=' ')]]:
            with patch.object(lane.subprocess, 'check_output', return_value=json.dumps([releases])):
                with self.assertRaises(AssertionError):
                    lane.draft('owner/repo', '0.1.4', SHA)

    def test_no_ci_fails(self):
        with patch.object(lane, 'api', return_value={'workflow_runs': []}):
            with self.assertRaisesRegex(AssertionError, 'No CI'):
                lane.check_ci('owner/repo', SHA)

    def test_incomplete_and_failed_ci_fail(self):
        base = {'head_sha': SHA, 'event': 'push', 'path': '.github/workflows/ci.yml', 'workflow_id': 1, 'run_number': 1, 'html_url': 'CI'}
        for status, conclusion in [('queued', None), ('completed', 'failure'), ('completed', 'cancelled')]:
            with patch.object(lane, 'api', return_value={'workflow_runs': [dict(base, status=status, conclusion=conclusion)]}):
                with self.assertRaisesRegex(AssertionError, 'incomplete or failed'):
                    lane.check_ci('owner/repo', SHA)

    def test_passing_ci_does_not_include_the_current_release_run(self):
        base = {'head_sha': SHA, 'event': 'push', 'path': '.github/workflows/ci.yml', 'workflow_id': 1, 'run_number': 1, 'html_url': 'CI', 'status': 'completed', 'conclusion': 'success'}
        with patch.object(lane, 'api', return_value={'workflow_runs': [base, dict(base, path='.github/workflows/release.yml', status='in_progress', conclusion=None)]}):
            lane.check_ci('owner/repo', SHA)

    def test_notes_drift_stops_before_tag_mutation(self):
        with patch.object(lane, 'require_approval'), patch.object(lane, 'check_ci'), patch.object(lane, 'draft', return_value=RELEASE), patch.object(lane, 'api') as mutation:
            with self.assertRaisesRegex(AssertionError, 'Notes changed'):
                lane.approve('owner/repo', '0.1.4', SHA, 'wrong')
            mutation.assert_not_called()

    def test_publish_cannot_bypass_approval(self):
        with patch.dict(os.environ, {'GITHUB_RUN_ID': '1'}), patch.object(lane, 'api', return_value=[]):
            with self.assertRaisesRegex(AssertionError, 'no release approval'):
                lane.permit('owner/repo', '0.1.4', SHA, lane.digest(RELEASE['body']))

    def test_approval_for_another_environment_is_not_a_release_approval(self):
        with patch.dict(os.environ, {'GITHUB_RUN_ID': '1'}), patch.object(lane, 'api', return_value=[{'state': 'approved', 'environments': [{'name': 'staging'}]}]):
            with self.assertRaisesRegex(AssertionError, 'no release approval'):
                lane.permit('owner/repo', '0.1.4', SHA, lane.digest(RELEASE['body']))

    def test_approved_run_still_checks_tag_and_notes(self):
        with patch.dict(os.environ, {'GITHUB_RUN_ID': '1'}), patch.object(lane, 'api', return_value=[{'state': 'approved', 'environments': [{'name': 'release-approval'}]}]), patch.object(lane, 'check_tag') as tag, patch.object(lane, 'draft', return_value=RELEASE):
            lane.permit('owner/repo', '0.1.4', SHA, lane.digest(RELEASE['body']))
            tag.assert_called_once_with('owner/repo', '0.1.4', SHA)

    def test_finalize_does_not_publish_changed_notes(self):
        with patch.object(lane, 'check_tag'), patch.object(lane, 'draft', return_value=RELEASE), patch.object(lane, 'api') as mutation:
            with self.assertRaisesRegex(AssertionError, 'Notes changed'):
                lane.finalize('owner/repo', '0.1.4', SHA, 'wrong')
            mutation.assert_not_called()

    def test_tag_cannot_be_created_without_approval(self):
        with patch.dict(os.environ, {'GITHUB_RUN_ID': '1'}), patch.object(lane, 'api', return_value=[]), patch.object(lane, 'check_tag') as tag:
            with self.assertRaisesRegex(AssertionError, 'no release approval'):
                lane.approve('owner/repo', '0.1.4', SHA, lane.digest(RELEASE['body']))
            tag.assert_not_called()

    def test_missing_assets_block_release_publication(self):
        with self.assertRaisesRegex(AssertionError, 'Missing release asset'):
            lane.verify_assets({'assets': []}, {'assets': ['main.js']}, '0.1.4')
        lane.verify_assets({'assets': [{'name': 'plugin-0.1.4.zip'}]}, {'assets': ['*.zip']}, '0.1.4')

    def test_approval_does_not_allow_notes_drift(self):
        with patch.object(lane, 'require_approval'), patch.object(lane, 'check_tag'), patch.object(lane, 'draft', return_value=RELEASE):
            with self.assertRaisesRegex(AssertionError, 'Notes differ'):
                lane.permit('owner/repo', '0.1.4', SHA, 'wrong')

    def test_manifest_version_mismatch_stops_release(self):
        with tempfile.TemporaryDirectory() as tmp:
            manifest = Path(tmp) / 'package.json'
            manifest.write_text('{"version":"0.1.3"}')
            config = {'versions': [{'path': str(manifest), 'field': ['version']}]}
            with self.assertRaisesRegex(AssertionError, 'expected 0.1.4'):
                lane.check_versions(config, '0.1.4')
            lane.check_versions(config, '0.1.3')

    def test_source_header_version_is_checked(self):
        with tempfile.TemporaryDirectory() as tmp:
            manifest = Path(tmp) / 'mode.el'
            manifest.write_text(';; Version: 0.1.4\n')
            lane.check_versions({'versions': [{'path': str(manifest), 'pattern': r'^;; Version: ([^\s]+)'}]}, '0.1.4')

    def test_missing_reviewer_and_review_bypass_fail(self):
        for environment in [{'protection_rules': [], 'can_admins_bypass': False}, {'protection_rules': [{'type': 'required_reviewers', 'reviewers': [{}]}], 'can_admins_bypass': True}]:
            with patch.object(lane, 'api', return_value=environment), self.assertRaises(AssertionError):
                lane.check_approval_settings('owner/repo', {})

    def test_second_approval_is_rejected_before_preflight(self):
        approved = {'protection_rules': [{'type': 'required_reviewers', 'reviewers': [{}]}], 'can_admins_bypass': False}
        with patch.object(lane, 'check_branch_policy'), patch.object(lane, 'api', side_effect=[approved, {'default_branch': 'main'}, approved]), self.assertRaisesRegex(AssertionError, 'second review'):
            lane.check_approval_settings('owner/repo', {'publisher_environments': ['pypi']})
        with patch.object(lane, 'check_branch_policy'), patch.object(lane, 'api', side_effect=[approved, {'default_branch': 'main'}, {'protection_rules': []}]):
            lane.check_approval_settings('owner/repo', {'publisher_environments': ['pypi']})

    def test_branch_targets_are_rejected_even_when_they_resolve_to_the_commit(self):
        with patch.object(lane.subprocess, 'check_output', return_value=json.dumps([[dict(RELEASE, target_commitish='main')]])), patch.object(lane, 'api', return_value={'sha': SHA}):
            with self.assertRaisesRegex(AssertionError, 'exact commit'):
                lane.draft('owner/repo', '0.1.4', SHA)

    def test_publish_environments_reject_unrestricted_and_other_branches(self):
        with self.assertRaisesRegex(AssertionError, 'restriction'):
            lane.check_branch_policy('owner/repo', 'release', {}, 'main')
        environment = {'deployment_branch_policy': {'custom_branch_policies': True, 'protected_branches': False}}
        for name in ['*', 'feature', 'main']:
            with patch.object(lane, 'api', return_value={'branch_policies': [{'name': name, 'type': 'tag'}]}), self.assertRaises(AssertionError):
                lane.check_branch_policy('owner/repo', 'release', environment, 'main')
        with patch.object(lane, 'api', return_value={'branch_policies': [{'name': 'main', 'type': 'branch'}]}):
            lane.check_branch_policy('owner/repo', 'release', environment, 'main')

    def test_rejected_review_never_depends_on_api_order(self):
        reviews = [{'state': state, 'environments': [{'name': 'release-approval'}]} for state in ['approved', 'rejected']]
        for ordered in [reviews, list(reversed(reviews))]:
            with patch.dict(os.environ, {'GITHUB_RUN_ID': '1'}), patch.object(lane, 'api', return_value=ordered), self.assertRaises(AssertionError):
                lane.require_approval('owner/repo')

    def test_outputs_preserve_multiline_notes(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {'GITHUB_OUTPUT': str(Path(tmp) / 'out')}):
            lane.output('body', 'first\nsecond')
            self.assertIn('first\nsecond\n', (Path(tmp) / 'out').read_text())


if __name__ == '__main__':
    unittest.main()
