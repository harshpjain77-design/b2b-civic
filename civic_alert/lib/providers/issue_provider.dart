import 'package:flutter/material.dart';
import '../models/issue.dart';

class IssueProvider with ChangeNotifier {
  final List<Issue> _issues = [
    Issue(
      id: '1',
      title: 'Pothole on Main St',
      description: 'Large pothole causing traffic slowdowns.',
      category: 'Roads',
      imageUrl: 'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?q=80&w=200',
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: DateTime.now().subtract(const Duration(days: 2)),
      status: IssueStatus.inProgress,
    ),
    Issue(
      id: '2',
      title: 'Broken Streetlight',
      description: 'Streetlight is out, making the area dark at night.',
      category: 'Lighting',
      imageUrl: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=200',
      latitude: 40.7306,
      longitude: -73.9352,
      timestamp: DateTime.now().subtract(const Duration(hours: 5)),
      status: IssueStatus.pending,
    ),
  ];

  List<Issue> get issues => [..._issues];

  void addIssue(Issue issue) {
    _issues.insert(0, issue);
    notifyListeners();
  }

  void updateIssueStatus(String id, IssueStatus status) {
    final index = _issues.indexWhere((issue) => issue.id == id);
    if (index != -1) {
      _issues[index] = _issues[index].copyWith(status: status);
      notifyListeners();
    }
  }
}
