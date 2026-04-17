import 'media_attachment.dart';

class IssueModel {
  final String trackId;
  final String category;
  final String title;
  final String description;
  final String status; // "Pending", "In Progress", "Resolved", "Rejected"
  final DateTime date;
  final double? latitude;
  final double? longitude;
  final String? photoUrl;
  final String? wardNo;
  final String? assignedTo;
  final DateTime? resolvedDate;
  final List<MediaAttachment> media;

  IssueModel({
    required this.trackId,
    required this.category,
    required this.title,
    required this.description,
    required this.status,
    required this.date,
    this.latitude,
    this.longitude,
    this.photoUrl,
    this.wardNo,
    this.assignedTo,
    this.resolvedDate,
    this.media = const [],
  });

  factory IssueModel.fromJson(Map<String, dynamic> json) {
    final media = mediaFromIssueData(json);
    MediaAttachment? leadImage;
    for (final item in media) {
      if (item.isImage) {
        leadImage = item;
        break;
      }
    }
    return IssueModel(
      trackId: json['trackId'] ?? json['_id'] ?? '',
      category: json['category'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      status: json['status'] ?? 'Pending',
      date: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : json['date'] != null
          ? DateTime.tryParse(json['date']) ?? DateTime.now()
          : DateTime.now(),
      latitude:
          (json['latitude'] as num?)?.toDouble() ??
          (json['location']?['latitude'] as num?)?.toDouble(),
      longitude:
          (json['longitude'] as num?)?.toDouble() ??
          (json['location']?['longitude'] as num?)?.toDouble(),
      photoUrl: leadImage?.downloadUrl ?? json['imageUrl'] ?? json['photoUrl'],
      wardNo: json['wardNo'],
      assignedTo: json['assignedTo'],
      resolvedDate: json['resolvedDate'] != null
          ? DateTime.tryParse(json['resolvedDate'])
          : null,
      media: media,
    );
  }

  Map<String, dynamic> toJson() => {
    'trackId': trackId,
    'category': category,
    'title': title,
    'description': description,
    'status': status,
    'date': date.toIso8601String(),
    if (latitude != null && longitude != null)
      'location': {'latitude': latitude, 'longitude': longitude},
    if (photoUrl != null) 'photoUrl': photoUrl,
    if (media.isNotEmpty) 'media': media.map((item) => item.toJson()).toList(),
    if (wardNo != null) 'wardNo': wardNo,
  };
}
