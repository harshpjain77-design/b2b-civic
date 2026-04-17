import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:animations/animations.dart';
import '../services/auth_service.dart';

class ReportIssueScreen extends StatefulWidget {
  const ReportIssueScreen({super.key});
  @override
  State<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends State<ReportIssueScreen> {
  final _titleCtrl = TextEditingController();
  final _descCtrl  = TextEditingController();
  final _formKey   = GlobalKey<FormState>();
  final _picker    = ImagePicker();

  String    _category        = 'Road Damage';
  File?     _image;
  Position? _position;
  bool      _submitting      = false;
  bool      _gettingLoc      = false;
  bool      _uploading       = false;
  double    _uploadPct       = 0;
  String?   _wardNo;
  String?   _userName;

  static const _cats = [
    {'label':'Road Damage',    'icon':Icons.construction_rounded,   'color':Color(0xFFF97316)},
    {'label':'Street Light',   'icon':Icons.lightbulb_outline,      'color':Color(0xFFFACC15)},
    {'label':'Garbage',        'icon':Icons.delete_outline_rounded, 'color':Color(0xFF22C55E)},
    {'label':'Water Leakage',  'icon':Icons.water_drop_outlined,    'color':Color(0xFF3B82F6)},
    {'label':'Traffic Signal', 'icon':Icons.traffic_rounded,        'color':Color(0xFF8B5CF6)},
    {'label':'Encroachment',   'icon':Icons.warning_amber_rounded,  'color':Color(0xFFEF4444)},
    {'label':'Tree Fallen',    'icon':Icons.park_outlined,          'color':Color(0xFF10B981)},
    {'label':'Other Issue',    'icon':Icons.more_horiz_rounded,     'color':Color(0xFF64748B)},
  ];

  @override
  void initState() { super.initState(); _loadUser(); }

  @override
  void dispose() { _titleCtrl.dispose(); _descCtrl.dispose(); super.dispose(); }

  Future<void> _loadUser() async {
    final a = AuthService();
    final ward = await a.getSavedWard();
    final name = await a.getSavedName();
    if (mounted) setState(() { _wardNo = ward; _userName = name; });
  }

  Future<void> _pick(ImageSource src) async {
    try {
      final x = await _picker.pickImage(
          source:src, imageQuality:75, maxWidth:1280, maxHeight:1280);
      if (x != null && mounted) setState(() => _image = File(x.path));
    } catch (_) {
      _snack('Could not access ${src==ImageSource.camera?"camera":"gallery"}', err:true);
    }
  }

  void _pickerSheet() {
    final colorScheme = Theme.of(context).colorScheme;
    showModalBottomSheet(
      context:context, backgroundColor:Colors.transparent,
      builder:(_) => Container(
        decoration:BoxDecoration(color:colorScheme.surface,
            borderRadius:const BorderRadius.vertical(top:Radius.circular(24))),
        padding:const EdgeInsets.fromLTRB(24,12,24,36),
        child:Column(mainAxisSize:MainAxisSize.min, children:[
          Container(width:40,height:4,margin:const EdgeInsets.only(bottom:20),
            decoration:BoxDecoration(color:colorScheme.outlineVariant,
                borderRadius:BorderRadius.circular(2))),
          Align(alignment:Alignment.centerLeft,
            child:Text('Add Photo',style:TextStyle(fontSize:17,fontWeight:FontWeight.w700, color:colorScheme.onSurface))),
          const SizedBox(height:16),
          Row(children:[
            Expanded(child:_PickTile(icon:Icons.camera_alt_rounded,label:'Camera',
              color:colorScheme.primary,
              onTap:(){ Navigator.pop(context); _pick(ImageSource.camera); })),
            const SizedBox(width:12),
            Expanded(child:_PickTile(icon:Icons.photo_library_rounded,label:'Gallery',
              color:colorScheme.secondary,
              onTap:(){ Navigator.pop(context); _pick(ImageSource.gallery); })),
          ]),
        ]),
      ),
    );
  }

  Future<void> _getLocation() async {
    setState(() => _gettingLoc = true);
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        _snack('Location permission denied.', err:true);
        setState(() => _gettingLoc = false);
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
          desiredAccuracy:LocationAccuracy.high,
          timeLimit:const Duration(seconds:15));
      if (mounted) setState(() { _position = pos; _gettingLoc = false; });
      _snack('Location captured');
    } catch (e) {
      if (mounted) setState(() => _gettingLoc = false);
      _snack('Location failed: $e', err:true);
    }
  }

  // FIXED: upload BEFORE writing Firestore doc
  Future<String?> _uploadImage(String docId) async {
    if (_image == null) return null;

    setState(() {
      _uploading = true;
      _uploadPct = 0;
    });

    try {
      if (_image == null) return null;
      
      final exists = await _image!.exists();
      if (!exists) {
        debugPrint('DEBUG: File NOT FOUND at ${_image!.path}');
        _snack('Image file not found on device', err: true);
        return null;
      }
      
      final bytes = await _image!.readAsBytes();
      debugPrint('DEBUG: File size: ${bytes.length} bytes');

      final fileName = '${DateTime.now().millisecondsSinceEpoch}.jpg';
      final path = 'issues/$docId/$fileName';
      
      final storage = FirebaseStorage.instance;
      debugPrint('DEBUG: Storage Bucket: ${storage.app.options.storageBucket}');
      debugPrint('DEBUG: Starting upload to $path');
      
      // Use refFromURL as a more robust way to target the bucket directly
      final ref = storage.ref().child(path);
      final task = ref.putData(bytes, SettableMetadata(contentType: 'image/jpeg'));

      task.snapshotEvents.listen((s) {
        if (!mounted) return;
        setState(() {
          _uploadPct = s.bytesTransferred / (s.totalBytes > 0 ? s.totalBytes : 1);
        });
      });

      final snap = await task;
      final url = await snap.ref.getDownloadURL();

      debugPrint('DEBUG: Upload successful. URL: $url');

      if (mounted) {
        setState(() {
          _uploading = false;
          _uploadPct = 0;
        });
      }

      return url;
    } on FirebaseException catch (e) {
      debugPrint('DEBUG: FirebaseException [${e.code}]: ${e.message}');
      debugPrint('DEBUG: Object Path: ${e.plugin}/${e.code}');
      
      if (mounted) {
        setState(() {
          _uploading = false;
          _uploadPct = 0;
        });
      }

      _snack('Upload Error: ${e.code}. ${e.message}', err: true);
      return null;
    } catch (e) {
      debugPrint('DEBUG: General Upload FAILED: $e');
      if (mounted) {
        setState(() {
          _uploading = false;
          _uploadPct = 0;
        });
      }
      _snack('Image upload failed: $e', err: true);
      return null;
    }
  }

  String _trackId() {
    final n = DateTime.now();
    return 'BMC${n.year}${n.month.toString().padLeft(2,'0')}'
        '${n.day.toString().padLeft(2,'0')}'
        '${n.hour.toString().padLeft(2,'0')}'
        '${n.minute.toString().padLeft(2,'0')}';
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) { _snack('Please log in again', err:true); return; }
    setState(() => _submitting = true);
    try {
      final trackId = _trackId();
      final docRef  = FirebaseFirestore.instance.collection('issues').doc();
      final imageUrl = await _uploadImage(docRef.id); // upload FIRST
      await docRef.set({
        'trackId':     trackId,
        'title':       _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'category':    _category,
        'wardNo':      _wardNo ?? 'Unknown',
        'status':      'open',
        'userId':      user.uid,
        'userName':    _userName ?? '',
        'userEmail':   user.email ?? '',
        'latitude':    _position?.latitude,
        'longitude':   _position?.longitude,
        'imageUrl':    imageUrl,
        'timeline':    [{
          'step': 'Reported',
          'time': DateTime.now().toUtc().toIso8601String(),
          'by': 'citizen'
        }],
        'createdAt':   FieldValue.serverTimestamp(),
        'updatedAt':   FieldValue.serverTimestamp(),
      });
      if (!mounted) return;
      setState(() => _submitting = false);
      _showSuccess(trackId);
    } catch (e) {
      if (mounted) { setState(() => _submitting = false); _snack('Submission failed: $e', err:true); }
    }
  }

  void _showSuccess(String trackId) {
    final colorScheme = Theme.of(context).colorScheme;
    showDialog(context:context, barrierDismissible:false, builder:(_) => AlertDialog(
      backgroundColor: colorScheme.surface,
      shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(24)),
      contentPadding:const EdgeInsets.all(28),
      content:Column(mainAxisSize:MainAxisSize.min,children:[
        Container(width:80,height:80,
          decoration:BoxDecoration(color:colorScheme.tertiary.withOpacity(0.1),shape:BoxShape.circle),
          child:Icon(Icons.check_circle_rounded,color:colorScheme.tertiary,size:50)),
        const SizedBox(height:16),
        Text('Submitted!',style:TextStyle(fontSize:20,fontWeight:FontWeight.w800, color:colorScheme.onSurface)),
        const SizedBox(height:8),
        Text('Complaint registered with BMC.\nTrack it in My Issues.',
            textAlign:TextAlign.center,
            style:TextStyle(color:colorScheme.onSurfaceVariant,fontSize:13,height:1.5)),
        const SizedBox(height:20),
        Container(
          width:double.infinity, padding:const EdgeInsets.all(14),
          decoration:BoxDecoration(color:colorScheme.primary.withOpacity(0.08),
            borderRadius:BorderRadius.circular(12),
            border:Border.all(color:colorScheme.primary.withOpacity(0.3))),
          child:Column(children:[
            Text('Track ID',style:TextStyle(fontSize:11,color:colorScheme.onSurfaceVariant)),
            const SizedBox(height:6),
            Text(trackId,style:TextStyle(fontWeight:FontWeight.w800,
                color:colorScheme.primary,fontSize:17,letterSpacing:1)),
            const SizedBox(height:4),
            Text('Save this to track your complaint',
                style:TextStyle(color:colorScheme.onSurfaceVariant.withOpacity(0.7),fontSize:11)),
          ]),
        ),
      ]),
      actions:[
        Padding(padding:const EdgeInsets.fromLTRB(16,0,16,8),
          child:Row(children:[
            Expanded(child:OutlinedButton(
              style:OutlinedButton.styleFrom(
                side:BorderSide(color:colorScheme.primary),
                foregroundColor:colorScheme.primary,
                shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(10)),
                padding:const EdgeInsets.symmetric(vertical:12)),
              onPressed:(){ Navigator.pop(context); Navigator.pushReplacementNamed(context,'/myIssues'); },
              child:const Text('My Issues'))),
            const SizedBox(width:10),
            Expanded(child:ElevatedButton(
              style:ElevatedButton.styleFrom(
                backgroundColor:colorScheme.primary, foregroundColor:Colors.white,
                elevation:0,
                shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(10)),
                padding:const EdgeInsets.symmetric(vertical:12)),
              onPressed:(){ Navigator.pop(context); Navigator.pop(context); },
              child:const Text('Done',style:TextStyle(fontWeight:FontWeight.w700)))),
          ])),
      ],
    ));
  }

  void _snack(String msg, {bool err=false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content:Text(msg),
      backgroundColor:err ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
      behavior:SnackBarBehavior.floating,
      shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(10))));
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        title: const Text('Report an Issue'),
        backgroundColor: cs.primary,
        foregroundColor: Colors.white,
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (_wardNo != null && _wardNo!.isNotEmpty)
              Container(
                  margin: const EdgeInsets.only(bottom: 24),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: cs.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: cs.primary.withOpacity(0.2)),
                  ),
                  child: Row(children: [
                    Icon(Icons.location_city_rounded, color: cs.primary, size: 20),
                    const SizedBox(width: 10),
                    Text('Reporting for Ward $_wardNo',
                        style: TextStyle(
                            fontWeight: FontWeight.w800,
                            color: cs.primary,
                            fontSize: 14)),
                  ])),

            const _Lbl(label: 'Select Category', icon: Icons.grid_view_rounded),
            const SizedBox(height: 14),
            SizedBox(
              height: 105,
              child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  itemCount: _cats.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (ctx, i) {
                    final cat = _cats[i];
                    final sel = _category == cat['label'];
                    final col = cat['color'] as Color;
                    return GestureDetector(
                        onTap: () {
                          // Removed haptics to rule out Oppo-specific feedback issues
                          setState(() => _category = cat['label'] as String);
                        },
                        child: Container(
                            width: 88,
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                                color: sel ? col : Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                    color: sel ? col : Colors.grey.shade200,
                                    width: 1.5),
                                boxShadow: [
                                  BoxShadow(
                                    color: sel ? col.withOpacity(0.15) : Colors.black.withOpacity(0.04),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  )
                                ]),
                            child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: sel ? Colors.white.withOpacity(0.2) : col.withOpacity(0.1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(cat['icon'] as IconData,
                                        color: sel ? Colors.white : col,
                                        size: 26),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(cat['label'] as String,
                                      textAlign: TextAlign.center,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: sel
                                              ? FontWeight.w900
                                              : FontWeight.w600,
                                          color: sel
                                              ? Colors.white
                                              : Colors.grey.shade700)),
                                ])));
                  }),
            ),
            const SizedBox(height: 28),

            const _Lbl(label: 'Issue Details', icon: Icons.description_rounded),
            const SizedBox(height: 12),
            TextFormField(
              controller: _titleCtrl,
              textCapitalization: TextCapitalization.sentences,
              decoration: _dec('Issue Title (e.g. Water Leakage on 5th Rd)'),
              style: const TextStyle(fontWeight: FontWeight.w700),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter a title' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descCtrl,
              maxLines: 3,
              textCapitalization: TextCapitalization.sentences,
              decoration: _dec('Describe the problem in detail...'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Please add a description' : null,
            ),
            const SizedBox(height: 28),

            const _Lbl(label: 'Photo Evidence', icon: Icons.camera_enhance_rounded),
            const SizedBox(height: 12),
            if (_uploading)
              Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Colors.grey.shade100, width: 2)),
                  child: Column(children: [
                    Row(children: [
                      Icon(Icons.cloud_upload_rounded, color: cs.primary, size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Text('Uploading photo...',
                                style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: cs.onSurface)),
                            const SizedBox(height: 8),
                            ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: LinearProgressIndicator(
                                    value: _uploadPct,
                                    backgroundColor: Colors.grey.shade100,
                                    valueColor: AlwaysStoppedAnimation(cs.primary),
                                    minHeight: 6)),
                          ])),
                      const SizedBox(width: 12),
                      Text('${(_uploadPct * 100).round()}%',
                          style: TextStyle(
                              fontWeight: FontWeight.w900,
                              color: cs.primary,
                              fontSize: 14)),
                    ]),
                  ]))
            else if (_image == null)
              GestureDetector(
                  onTap: _pickerSheet,
                  child: Container(
                      height: 160,
                      width: double.infinity,
                      decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Colors.grey.shade200, width: 2, style: BorderStyle.solid)),
                      child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(color: cs.primary.withOpacity(0.1), shape: BoxShape.circle),
                              child: Icon(Icons.add_a_photo_rounded, size: 32, color: cs.primary),
                            ),
                            const SizedBox(height: 12),
                            Text('Add clear photo of the issue',
                                style: TextStyle(
                                    color: cs.onSurface,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700)),
                            Text('Camera or Gallery',
                                style: TextStyle(
                                    color: Colors.grey.shade500, fontSize: 12)),
                          ])))
            else
              Stack(children: [
                ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: Image.file(_image!,
                        width: double.infinity, height: 200, fit: BoxFit.cover)),
                Positioned(
                    top: 12,
                    right: 12,
                    child: GestureDetector(
                        onTap: () => setState(() => _image = null),
                        child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(
                                color: Colors.black54, shape: BoxShape.circle),
                            child: const Icon(Icons.close_rounded,
                                color: Colors.white, size: 20)))),
                Positioned(
                    bottom: 12,
                    right: 12,
                    child: GestureDetector(
                        onTap: _pickerSheet,
                        child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                                color: Colors.black87,
                                borderRadius: BorderRadius.circular(20)),
                            child: const Row(mainAxisSize: MainAxisSize.min, children: [
                              Icon(Icons.edit_rounded, color: Colors.white, size: 16),
                              SizedBox(width: 6),
                              Text('Change Photo',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700)),
                            ])))),
              ]),
            const SizedBox(height: 28),

            const _Lbl(label: 'Location Details', icon: Icons.location_on_rounded),
            const SizedBox(height: 12),
            Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.grey.shade100, width: 2)),
                child: Row(children: [
                  Expanded(
                      child: _position != null
                          ? Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                  Row(children: [
                                    const Icon(Icons.check_circle_rounded,
                                        color: Colors.green, size: 18),
                                    const SizedBox(width: 8),
                                    Text('Location Captured',
                                        style: TextStyle(
                                            fontWeight: FontWeight.w800,
                                            fontSize: 14,
                                            color: Colors.green.shade700)),
                                  ]),
                                  const SizedBox(height: 6),
                                  Text(
                                      'Lat: ${_position!.latitude.toStringAsFixed(6)}\n'
                                      'Lng: ${_position!.longitude.toStringAsFixed(6)}',
                                      style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey.shade600,
                                          fontWeight: FontWeight.w500,
                                          height: 1.4)),
                                ])
                          : Text('Capture GPS to pin context',
                              style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey.shade500,
                                  fontWeight: FontWeight.w600))),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                          backgroundColor: _position != null ? Colors.green : cs.primary,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14)),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 12)),
                      onPressed: _gettingLoc ? null : _getLocation,
                      icon: _gettingLoc
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2.5))
                          : Icon(
                              _position != null
                                  ? Icons.refresh_rounded
                                  : Icons.my_location_rounded,
                              size: 20),
                      label: Text(_position != null ? 'Redo' : 'Locate',
                          style: const TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w800))),
                ])),
            const SizedBox(height: 40),

            SizedBox(
                width: double.infinity,
                height: 60,
                child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                        backgroundColor: cs.primary,
                        foregroundColor: Colors.white,
                        elevation: 8,
                        shadowColor: cs.primary.withOpacity(0.4),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20))),
                    onPressed: (_submitting || _uploading) ? null : _submit,
                    child: _submitting
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                                SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(
                                        color: Colors.white, strokeWidth: 3)),
                                SizedBox(width: 16),
                                Text('Sending to BMC...',
                                    style: TextStyle(
                                        fontSize: 17, fontWeight: FontWeight.w800))
                              ])
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                                Icon(Icons.send_rounded, size: 22),
                                SizedBox(width: 12),
                                Text('Submit Complaint',
                                    style: TextStyle(
                                        fontSize: 17,
                                        fontWeight: FontWeight.w900))
                              ]))),
            const SizedBox(height: 12),
            Center(
                child: Text('Official BMC Smart Civic System',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade400, fontWeight: FontWeight.w600))),
            const SizedBox(height: 40),
          ]),
        ),
      ),
    );
  }

  InputDecoration _dec(String h) {
    final colorScheme = Theme.of(context).colorScheme;
    return InputDecoration(
      hintText:h, hintStyle:TextStyle(color:colorScheme.outline,fontSize:13),
      filled:true, fillColor:colorScheme.surface,
      border:OutlineInputBorder(borderRadius:BorderRadius.circular(12),
          borderSide:BorderSide(color:colorScheme.outlineVariant)),
      enabledBorder:OutlineInputBorder(borderRadius:BorderRadius.circular(12),
          borderSide:BorderSide(color:colorScheme.outlineVariant)),
      focusedBorder:OutlineInputBorder(borderRadius:BorderRadius.circular(12),
          borderSide:BorderSide(color:colorScheme.primary,width:2)),
      contentPadding:const EdgeInsets.symmetric(horizontal:14,vertical:12));
  }
}

class _Lbl extends StatelessWidget {
  final String label; final IconData icon;
  const _Lbl({required this.label,required this.icon});
  @override Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(children:[
      Icon(icon,size:17,color:colorScheme.primary),
      const SizedBox(width:6),
      Text(label,style:TextStyle(fontWeight:FontWeight.w700,
          fontSize:14,color:colorScheme.onSurface)),
    ]);
  }
}

class _PickTile extends StatelessWidget {
  final IconData icon; final String label;
  final Color color; final VoidCallback onTap;
  const _PickTile({required this.icon,required this.label,
    required this.color,required this.onTap});
  @override Widget build(BuildContext context) => GestureDetector(onTap:onTap,
    child:Container(
      padding:const EdgeInsets.symmetric(vertical:20),
      decoration:BoxDecoration(color:color.withOpacity(0.08),
        borderRadius:BorderRadius.circular(14),
        border:Border.all(color:color.withOpacity(0.25))),
      child:Column(children:[
        Icon(icon,color:color,size:32), const SizedBox(height:8),
        Text(label,style:TextStyle(fontWeight:FontWeight.w600,color:color,fontSize:14)),
      ])));
}