import 'package:flutter_test/flutter_test.dart';
import 'package:civic_alert/models/issue.dart';
import 'package:civic_alert/providers/issue_provider.dart';

void main() {
  group('Issue Model Tests', () {
    test('should create an Issue with default pending status', () {
      final issue = Issue(
        id: '1',
        title: 'Test',
        description: 'Desc',
        category: 'Roads',
        imageUrl: '',
        latitude: 0,
        longitude: 0,
        timestamp: DateTime.now(),
      );

      expect(issue.status, IssueStatus.pending);
    });

    test('copyWith should update status correctly', () {
      final issue = Issue(
        id: '1',
        title: 'Test',
        description: 'Desc',
        category: 'Roads',
        imageUrl: '',
        latitude: 0,
        longitude: 0,
        timestamp: DateTime.now(),
      );

      final updatedIssue = issue.copyWith(status: IssueStatus.resolved);
      expect(updatedIssue.status, IssueStatus.resolved);
      expect(updatedIssue.title, 'Test'); // Ensure other fields are preserved
    });
  });

  group('IssueProvider Tests', () {
    test('should add a new issue and notify listeners', () {
      final provider = IssueProvider();
      final initialCount = provider.issues.length;

      final newIssue = Issue(
        id: '3',
        title: 'New Issue',
        description: 'New Desc',
        category: 'Waste',
        imageUrl: '',
        latitude: 0,
        longitude: 0,
        timestamp: DateTime.now(),
      );

      provider.addIssue(newIssue);

      expect(provider.issues.length, initialCount + 1);
      expect(provider.issues.first.title, 'New Issue');
    });

    test('should update issue status correctly', () {
      final provider = IssueProvider();
      final targetId = provider.issues.first.id;

      provider.updateIssueStatus(targetId, IssueStatus.resolved);

      expect(provider.issues.first.status, IssueStatus.resolved);
    });
  });
}
