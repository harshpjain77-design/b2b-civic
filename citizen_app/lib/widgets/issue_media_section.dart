import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../models/media_attachment.dart';

class IssueMediaSection extends StatelessWidget {
  final List<MediaAttachment> media;
  final bool showTitle;

  const IssueMediaSection({
    super.key,
    required this.media,
    this.showTitle = true,
  });

  @override
  Widget build(BuildContext context) {
    if (media.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showTitle) ...[
          Text(
            'Attachments',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 14,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 12),
        ],
        ...media.map((item) {
          if (item.isImage) return _ImageAttachment(attachment: item);
          if (item.isVideo) return _VideoAttachment(attachment: item);
          if (item.isAudio) return _AudioAttachment(attachment: item);
          return _UnknownAttachment(attachment: item);
        }),
      ],
    );
  }
}

class _ImageAttachment extends StatelessWidget {
  final MediaAttachment attachment;

  const _ImageAttachment({required this.attachment});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Image.network(
          attachment.downloadUrl,
          width: double.infinity,
          height: 220,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _FallbackCard(
            icon: Icons.broken_image_outlined,
            label: 'Image unavailable',
          ),
          loadingBuilder: (_, child, progress) {
            if (progress == null) return child;
            return Container(
              height: 220,
              color: Colors.grey.shade100,
              alignment: Alignment.center,
              child: const CircularProgressIndicator(strokeWidth: 2.4),
            );
          },
        ),
      ),
    );
  }
}

class _AudioAttachment extends StatefulWidget {
  final MediaAttachment attachment;

  const _AudioAttachment({required this.attachment});

  @override
  State<_AudioAttachment> createState() => _AudioAttachmentState();
}

class _AudioAttachmentState extends State<_AudioAttachment> {
  late final AudioPlayer _player;
  PlayerState _state = PlayerState.stopped;

  @override
  void initState() {
    super.initState();
    _player = AudioPlayer();
    _player.onPlayerStateChanged.listen((state) {
      if (mounted) setState(() => _state = state);
    });
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _toggle() async {
    if (_state == PlayerState.playing) {
      await _player.pause();
      return;
    }
    await _player.play(UrlSource(widget.attachment.downloadUrl));
  }

  @override
  Widget build(BuildContext context) {
    final isPlaying = _state == PlayerState.playing;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Theme.of(context).colorScheme.outlineVariant,
          ),
        ),
        child: Row(
          children: [
            IconButton.filled(
              onPressed: _toggle,
              icon: Icon(
                isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.attachment.fileName ?? 'Audio attachment',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isPlaying ? 'Playing' : 'Tap to play',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.outline,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VideoAttachment extends StatefulWidget {
  final MediaAttachment attachment;

  const _VideoAttachment({required this.attachment});

  @override
  State<_VideoAttachment> createState() => _VideoAttachmentState();
}

class _VideoAttachmentState extends State<_VideoAttachment> {
  VideoPlayerController? _controller;
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    try {
      final controller = VideoPlayerController.networkUrl(
        Uri.parse(widget.attachment.downloadUrl),
      );
      await controller.initialize();
      controller.setLooping(false);
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _controller = controller;
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _failed = true;
          _loading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.only(bottom: 12),
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: Center(child: CircularProgressIndicator(strokeWidth: 2.4)),
        ),
      );
    }

    if (_failed || _controller == null) {
      return const Padding(
        padding: EdgeInsets.only(bottom: 12),
        child: _FallbackCard(
          icon: Icons.videocam_off_rounded,
          label: 'Video unavailable',
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: _controller!.value.aspectRatio,
              child: VideoPlayer(_controller!),
            ),
            Container(
              color: Colors.black87,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () {
                      if (_controller!.value.isPlaying) {
                        _controller!.pause();
                      } else {
                        _controller!.play();
                      }
                      setState(() {});
                    },
                    color: Colors.white,
                    icon: Icon(
                      _controller!.value.isPlaying
                          ? Icons.pause_rounded
                          : Icons.play_arrow_rounded,
                    ),
                  ),
                  Expanded(
                    child: Text(
                      widget.attachment.fileName ?? 'Video attachment',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UnknownAttachment extends StatelessWidget {
  final MediaAttachment attachment;

  const _UnknownAttachment({required this.attachment});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: _FallbackCard(
        icon: Icons.attach_file_rounded,
        label: attachment.fileName ?? attachment.type,
      ),
    );
  }
}

class _FallbackCard extends StatelessWidget {
  final IconData icon;
  final String label;

  const _FallbackCard({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 120,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
      ),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 30, color: Theme.of(context).colorScheme.outline),
          const SizedBox(height: 8),
          Text(label),
        ],
      ),
    );
  }
}
