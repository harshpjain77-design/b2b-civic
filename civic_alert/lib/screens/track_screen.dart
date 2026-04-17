import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import '../services/theme_service.dart';

class TrackScreen extends StatefulWidget {
  const TrackScreen({super.key});

  @override
  State<TrackScreen> createState() => _TrackScreenState();
}

class _TrackScreenState extends State<TrackScreen> {
  final _controller = TextEditingController();
  bool _isLoading = false;
  Map<String, dynamic>? _issue;
  String? _error;

  // ── Search Firestore by trackId ──────────────────────────────────
  Future<void> _track() async {
    final id = _controller.text.trim().toUpperCase();
    if (id.isEmpty) return;

    setState(() { _isLoading = true; _issue = null; _error = null; });

    try {
      final snap = await FirebaseFirestore.instance
          .collection('issues')
          .where('trackId', isEqualTo: id)
          .limit(1)
          .get();

      if (snap.docs.isEmpty) {
        setState(() {
          _isLoading = false;
          _error = "No issue found with Track ID: $id\nPlease check and try again.";
        });
      } else {
        setState(() {
          _isLoading = false;
          _issue = snap.docs.first.data();
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = "Something went wrong. Please try again.";
      });
      print("Track error: $e");
    }
  }

  Color _statusColor(String s) {
    final colorScheme = Theme.of(context).colorScheme;
    switch (s) {
      case 'resolved':    return colorScheme.tertiary; // Use tertiary for green success
      case 'in_progress': return Colors.orange;
      default:            return colorScheme.secondary;
    }
  }

  IconData _statusIcon(String s) {
    switch (s) {
      case 'resolved':    return Icons.check_circle_rounded;
      case 'in_progress': return Icons.timelapse_rounded;
      default:            return Icons.pending_rounded;
    }
  }

  String _statusLabel(String s) {
    switch (s) {
      case 'resolved':    return 'Resolved';
      case 'in_progress': return 'In Progress';
      default:            return 'Open';
    }
  }

  String _formatDate(dynamic ts) {
    if (ts == null) return '-';
    try {
      final dt = ts is Timestamp
          ? ts.toDate().toLocal()
          : DateTime.parse(ts.toString()).toLocal();
      return "${dt.day}/${dt.month}/${dt.year}  "
          "${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}";
    } catch (_) { return '-'; }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor:Theme.of(context).colorScheme.background,
      appBar: AppBar(
        title: const Text("Track Complaint"),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

          // ── Header ───────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFF97316), Color(0xFFEA580C)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(28),
              boxShadow: [BoxShadow(
                color: const Color(0xFFF97316).withOpacity(0.3),
                blurRadius: 20, offset: const Offset(0, 8))],
            ),
            child: Row(children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(16)),
                child: const Icon(Icons.manage_search_rounded,
                    color: Colors.white, size: 36),
              ),
              const SizedBox(width: 18),
              const Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Track Complaint",
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 20, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                  SizedBox(height: 4),
                  Text("Monitor the status of your reported civic issues in real-time.",
                      style: TextStyle(
                          color: Colors.white70, fontSize: 13, height: 1.4, fontWeight: FontWeight.w500)),
                ],
              )),
            ]),
          ),
          const SizedBox(height: 32),

          // ── Search ───────────────────────────────────────────────
          Text("Track ID",
              style: TextStyle(fontWeight: FontWeight.w700,
                  fontSize: 14, color: Theme.of(context).colorScheme.onBackground)),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 10, offset: const Offset(0, 3))],
                ),
                child: TextField(
                  controller: _controller,
                  textCapitalization: TextCapitalization.characters,
                  onSubmitted: (_) => _track(),
                  style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                  decoration: InputDecoration(
                    hintText: "e.g. BMC20250319143022",
                    hintStyle: TextStyle(
                        color: Theme.of(context).colorScheme.outline, fontSize: 13),
                    prefixIcon: Icon(Icons.tag,
                        color: Theme.of(context).colorScheme.primary),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none),
                    enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: Theme.of(context).colorScheme.outlineVariant)),
                    focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(
                            color: Theme.of(context).colorScheme.primary, width: 2)),
                    filled: true,
                    fillColor: Theme.of(context).colorScheme.surface,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                ),
                onPressed: _isLoading ? null : _track,
                child: _isLoading
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2.5))
                    : const Icon(Icons.search_rounded, size: 24),
              ),
            ),
          ]),
          const SizedBox(height: 24),

          // ── Error ────────────────────────────────────────────────
          if (_error != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Row(children: [
                Icon(Icons.error_outline,
                    color: Colors.red.shade400, size: 22),
                const SizedBox(width: 10),
                Expanded(child: Text(_error!,
                    style: TextStyle(
                        color: Colors.red.shade700, fontSize: 13))),
              ]),
            ),

          // ── Result ───────────────────────────────────────────────
          if (_issue != null) ...[
            const Text("Complaint Details",
                style: TextStyle(fontWeight: FontWeight.w700,
                    fontSize: 15, color: Color(0xFF1A1A2E))),
            const SizedBox(height: 12),

            // Main card
            Container(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(18),
                boxShadow: [BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 12, offset: const Offset(0, 4))],
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                  children: [

                // Image
                if (_issue!['imageUrl'] != null)
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(18)),
                    child: Image.network(
                      _issue!['imageUrl'],
                      height: 160, width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),

                Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [

                    // Status row
                    Row(children: [
                      Icon(
                        _statusIcon(_issue!['status'] ?? 'open'),
                        color: _statusColor(_issue!['status'] ?? 'open'),
                        size: 22,
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                          color: _statusColor(_issue!['status'] ?? 'open')
                              .withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          _statusLabel(_issue!['status'] ?? 'open'),
                          style: TextStyle(
                              color: _statusColor(
                                  _issue!['status'] ?? 'open'),
                              fontWeight: FontWeight.w700,
                              fontSize: 13),
                        ),
                      ),
                    ]),

                    const Divider(height: 20),

                    Text(_issue!['title'] ?? '-',
                        style: TextStyle(
                            fontSize: 17, fontWeight: FontWeight.w800,
                            color: Theme.of(context).colorScheme.onSurface)),
                    const SizedBox(height: 4),
                    Text(_issue!['category'] ?? '-',
                        style: TextStyle(
                            color: Colors.grey.shade500, fontSize: 13)),
                    const SizedBox(height: 12),
                    Text(_issue!['description'] ?? '-',
                        style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 13, height: 1.5)),

                    const Divider(height: 20),

                    _infoRow(Icons.tag, "Track ID",
                        _issue!['trackId'] ?? '-'),
                    _infoRow(Icons.location_city_outlined, "Ward",
                        "Ward ${_issue!['wardNo'] ?? '-'}"),
                    _infoRow(Icons.person_outline, "Reported By",
                        _issue!['userName'] ?? '-'),
                    _infoRow(Icons.calendar_today_outlined, "Filed On",
                        _formatDate(_issue!['createdAt'])),
                    if (_issue!['latitude'] != null)
                      _infoRow(Icons.location_on_outlined, "GPS",
                          "Lat: ${(_issue!['latitude'] as num).toStringAsFixed(4)}, "
                          "Lng: ${(_issue!['longitude'] as num).toStringAsFixed(4)}"),

                    const Divider(height: 20),

                    // Timeline
                    Text("Status Timeline",
                        style: TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 14,
                            color: Theme.of(context).colorScheme.onSurface)),
                    const SizedBox(height: 14),
                    _timelineStep(
                        Icons.send_rounded, "Submitted",
                        _formatDate(_issue!['createdAt']),
                        Colors.blue, true, false),
                    _timelineStep(
                        Icons.timelapse_rounded, "In Progress",
                        "BMC team assigned",
                        Colors.orange,
                        _issue!['status'] == 'in_progress' ||
                            _issue!['status'] == 'resolved',
                        false),
                    _timelineStep(
                        Icons.check_circle_rounded, "Resolved",
                        _issue!['status'] == 'resolved'
                            ? _formatDate(_issue!['updatedAt'])
                            : "Pending resolution",
                        Colors.green,
                        _issue!['status'] == 'resolved',
                        true),
                  ]),
                ),
              ]),
            ),
          ],

          // ── Empty state hint ─────────────────────────────────────
          if (_issue == null && _error == null)
            Center(
              child: Padding(
                padding: const EdgeInsets.only(top: 60),
                child: Column(children: [
                  Icon(Icons.search_rounded,
                      size: 72, color: Colors.grey.shade300),
                  const SizedBox(height: 12),
                  Text("Enter your Track ID above",
                      style: TextStyle(
                          color: Colors.grey.shade500, fontSize: 15)),
                  const SizedBox(height: 6),
                  Text("e.g. BMC20250319143022",
                      style: TextStyle(
                          color: Colors.grey.shade400, fontSize: 12,
                          fontFamily: 'monospace')),
                ]),
              ),
            ),

          const SizedBox(height: 40),
        ]),
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 16, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 8),
        SizedBox(width: 80,
            child: Text(label,
                style: TextStyle(
                    fontSize: 12, color: Theme.of(context).colorScheme.outline))),
        Expanded(child: Text(value,
            style: TextStyle(
                fontSize: 13, fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface))),
      ]),
    );
  }

  Widget _timelineStep(IconData icon, String label, String sub,
      Color color, bool done, bool isLast) {
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Column(children: [
        Container(
          width: 34, height: 34,
          decoration: BoxDecoration(
            color: done ? color.withOpacity(0.12) : Colors.grey.shade100,
            shape: BoxShape.circle,
            border: Border.all(
                color: done ? color : Colors.grey.shade300, width: 2),
          ),
          child: Icon(icon,
              color: done ? color : Colors.grey.shade400, size: 16),
        ),
        if (!isLast)
          Container(width: 2, height: 34,
              color: done ? color.withOpacity(0.3) : Colors.grey.shade200),
      ]),
      const SizedBox(width: 12),
      Padding(
        padding: const EdgeInsets.only(top: 4, bottom: 4),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label,
              style: TextStyle(
                  fontWeight: FontWeight.w700, fontSize: 13,
                  color: done
                      ? const Color(0xFF1A1A2E)
                      : Colors.grey.shade400)),
          Text(sub,
              style: TextStyle(fontSize: 11,
                  color: done
                      ? Colors.grey.shade500
                      : Colors.grey.shade300)),
        ]),
      ),
    ]);
  }
}