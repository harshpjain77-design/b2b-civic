import 'package:cloud_firestore/cloud_firestore.dart';

class MediaAttachment {
  final String type;
  final String downloadUrl;
  final String storagePath;
  final String contentType;
  final DateTime? createdAt;
  final String? fileName;

  const MediaAttachment({
    required this.type,
    required this.downloadUrl,
    required this.storagePath,
    required this.contentType,
    this.createdAt,
    this.fileName,
  });

  bool get isImage => type == 'image';
  bool get isAudio => type == 'audio';
  bool get isVideo => type == 'video';

  factory MediaAttachment.fromJson(Map<String, dynamic> json) {
    final created = json['createdAt'];
    return MediaAttachment(
      type: (json['type'] as String? ?? 'image').toLowerCase(),
      downloadUrl: json['downloadUrl'] as String? ?? '',
      storagePath: json['storagePath'] as String? ?? '',
      contentType: json['contentType'] as String? ?? '',
      createdAt: created is Timestamp
          ? created.toDate()
          : created is String
          ? DateTime.tryParse(created)
          : null,
      fileName: json['fileName'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'type': type,
    'downloadUrl': downloadUrl,
    'storagePath': storagePath,
    'contentType': contentType,
    'createdAt': createdAt?.toUtc().toIso8601String(),
    if (fileName?.isNotEmpty == true) 'fileName': fileName,
  };
}

List<MediaAttachment> mediaFromIssueData(Map<String, dynamic>? data) {
  if (data == null) return const [];

  final parsed = <MediaAttachment>[];
  final rawMedia = data['media'];
  if (rawMedia is List) {
    for (final item in rawMedia) {
      if (item is Map<String, dynamic>) {
        final attachment = MediaAttachment.fromJson(item);
        if (attachment.downloadUrl.isNotEmpty) parsed.add(attachment);
      } else if (item is Map) {
        final attachment = MediaAttachment.fromJson(
          Map<String, dynamic>.from(item),
        );
        if (attachment.downloadUrl.isNotEmpty) parsed.add(attachment);
      }
    }
  }

  if (parsed.isEmpty) {
    final imageUrl = data['imageUrl'] as String?;
    if (imageUrl != null && imageUrl.isNotEmpty) {
      parsed.add(
        MediaAttachment(
          type: 'image',
          downloadUrl: imageUrl,
          storagePath: '',
          contentType: 'image/jpeg',
        ),
      );
    }
  }

  return parsed;
}

String? firstImageUrlFromIssueData(Map<String, dynamic>? data) {
  final media = mediaFromIssueData(data);
  for (final item in media) {
    if (item.isImage && item.downloadUrl.isNotEmpty) return item.downloadUrl;
  }
  return null;
}
