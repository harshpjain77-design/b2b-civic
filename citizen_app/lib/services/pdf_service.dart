import 'dart:io';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

class PdfService {
  /// Generates a professional complaint confirmation PDF using real-time Firestore data
  static Future<File> generateProfessionalPdf(Map<String, dynamic> complaint) async {
    final pdf = pw.Document();

    // Load image from URL if available
    pw.ImageProvider? networkImage;
    if (complaint['imageUrl'] != null && complaint['imageUrl'].toString().isNotEmpty) {
      try {
        final response = await http.get(Uri.parse(complaint['imageUrl']));
        if (response.statusCode == 200) {
          networkImage = pw.MemoryImage(response.bodyBytes);
        }
      } catch (e) {
        print("Error loading image for PDF: $e");
      }
    }

    // Capture timeline details
    final timeline = complaint['timeline'] != null && (complaint['timeline'] as List).isNotEmpty
        ? (complaint['timeline'] as List)[0]
        : {'by': 'citizen', 'time': DateTime.now().toIso8601String()};

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (context) => pw.Padding(
          padding: const pw.EdgeInsets.all(32),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // HEADER
              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text("BMC CIVIC COMPLAINT SYSTEM",
                        style: pw.TextStyle(
                            fontSize: 22, fontWeight: pw.FontWeight.bold, color: PdfColors.orange900)),
                    pw.SizedBox(height: 4),
                    pw.Text("Complaint Confirmation Report",
                        style: pw.TextStyle(fontSize: 14, color: PdfColors.grey700)),
                  ],
                ),
              ),

              pw.SizedBox(height: 20),
              pw.Divider(thickness: 1, color: PdfColors.grey300),
              pw.SizedBox(height: 20),

              // TRACKING ID (highlighted)
              pw.Container(
                width: double.infinity,
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  color: PdfColors.grey100,
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
                  border: pw.Border.all(color: PdfColors.grey300),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      "Tracking ID:",
                      style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold),
                    ),
                    pw.Text(
                      complaint['trackId'] ?? 'N/A',
                      style: pw.TextStyle(
                          fontSize: 16, fontWeight: pw.FontWeight.bold, color: PdfColors.orange800),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 30),

              // TWO-COLUMN DETAILS
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        _sectionTitle("User Details"),
                        _detailRow("Name", complaint['userName'] ?? 'Unknown'),
                        _detailRow("Email", complaint['userEmail'] ?? 'N/A'),
                        
                        pw.SizedBox(height: 20),
                        
                        _sectionTitle("Location Details"),
                        _detailRow("Latitude", complaint['latitude']?.toString() ?? 'N/A'),
                        _detailRow("Longitude", complaint['longitude']?.toString() ?? 'N/A'),
                        _detailRow("Ward No", complaint['wardNo']?.toString() ?? 'N/A'),
                        _detailRow("Region", "asia-south1"),
                      ],
                    ),
                  ),
                  pw.SizedBox(width: 40),
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        _sectionTitle("Complaint Information"),
                        _detailRow("Title", complaint['title'] ?? 'Untitled'),
                        _detailRow("Category", complaint['category'] ?? 'General'),
                        _detailRow("Status", (complaint['status'] ?? 'OPEN').toUpperCase()),
                      ],
                    ),
                  ),
                ],
              ),

              pw.SizedBox(height: 20),
              _sectionTitle("Description"),
              pw.Text(complaint['description'] ?? 'No description provided.',
                  style: const pw.TextStyle(fontSize: 12, color: PdfColors.grey900)),

              pw.SizedBox(height: 30),

              // IMAGE
              if (networkImage != null) ...[
                _sectionTitle("Attached Photo Evidence"),
                pw.SizedBox(height: 10),
                pw.Center(
                  child: pw.Container(
                    height: 200,
                    width: 300,
                    decoration: pw.BoxDecoration(
                      border: pw.Border.all(color: PdfColors.grey400),
                      borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
                    ),
                    child: pw.ClipRRect(
                      horizontalRadius: 4,
                      verticalRadius: 4,
                      child: pw.Image(networkImage, fit: pw.BoxFit.cover),
                    ),
                  ),
                ),
                pw.SizedBox(height: 30),
              ],

              // TIMELINE
              _sectionTitle("History & Timeline"),
              pw.Bullet(
                text: "Reported by ${timeline['by']} at ${timeline['time'].split('T')[0]}",
                style: const pw.TextStyle(fontSize: 11),
              ),

              pw.Spacer(),
              pw.Divider(thickness: 1, color: PdfColors.grey300),
              pw.SizedBox(height: 10),

              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text(
                      "This is a system-generated document from the Smart Civic BMC Portal.",
                      style: pw.TextStyle(fontSize: 10, color: PdfColors.grey600),
                    ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      "Generated Automatically | Do not reply",
                      style: pw.TextStyle(fontSize: 10, color: PdfColors.grey600, fontStyle: pw.FontStyle.italic),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );

    // Save the PDF to a temporary file
    final dir = await getTemporaryDirectory();
    final file = File("${dir.path}/complaint_${complaint['trackId']}.pdf");
    await file.writeAsBytes(await pdf.save());
    return file;
  }

  static pw.Widget _sectionTitle(String title) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 8),
      child: pw.Text(
        title.toUpperCase(),
        style: pw.TextStyle(
          fontSize: 10,
          fontWeight: pw.FontWeight.bold,
          color: PdfColors.orange900,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  static pw.Widget _detailRow(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 4),
      child: pw.RichText(
        text: pw.TextSpan(
          children: [
            pw.TextSpan(
              text: "$label: ",
              style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: PdfColors.grey700),
            ),
            pw.TextSpan(
              text: value,
              style: const pw.TextStyle(fontSize: 11, color: PdfColors.black),
            ),
          ],
        ),
      ),
    );
  }
}
