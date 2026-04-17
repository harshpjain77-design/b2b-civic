enum IssueStatus { pending, inProgress, resolved }

class Issue {
  final String id;
  final String title;
  final String description;
  final String category;
  final String imageUrl;
  final double latitude;
  final double longitude;
  final DateTime timestamp;
  final IssueStatus status;

  Issue({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.imageUrl,
    required this.latitude,
    required this.longitude,
    required this.timestamp,
    this.status = IssueStatus.pending,
  });

  Issue copyWith({
    IssueStatus? status,
  }) {
    return Issue(
      id: id,
      title: title,
      description: description,
      category: category,
      imageUrl: imageUrl,
      latitude: latitude,
      longitude: longitude,
      timestamp: timestamp,
      status: status ?? this.status,
    );
  }
}
