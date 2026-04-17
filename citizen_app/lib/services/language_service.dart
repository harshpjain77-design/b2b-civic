import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LanguageService extends ChangeNotifier {
  Locale _currentLocale = const Locale('en');
  
  Locale get currentLocale => _currentLocale;
  String get currentLanguageCode => _currentLocale.languageCode;

  LanguageService() {
    _loadLocale();
  }

  static const Map<String, Map<String, String>> _translations = {
    'en': {
      'app_title': 'Smart Civic Mumbai',
      'welcome_back': 'Welcome Back!',
      'greeting_morning': 'Good morning',
      'greeting_afternoon': 'Good afternoon',
      'greeting_evening': 'Good evening',
      'sign_in_desc': 'Sign in to report & track civic issues',
      'login': 'Login',
      'email': 'Email Address',
      'password': 'Password',
      'forgot_password': 'Forgot Password?',
      'new_citizen': 'New Citizen? Register here →',
      'mumbai_today': 'Mumbai Today',
      'quick_actions': 'Quick Actions',
      'mumbai_services': 'Mumbai Services',
      'report_issue': 'Report Issue',
      'file_complaint': 'File a complaint',
      'track_complaint': 'Track Complaint',
      'check_status': 'Check status',
      'hotspot_map': 'Hotspot Map',
      'view_areas': 'View issue areas',
      'my_issues': 'My Issues',
      'all_complaints': 'All your complaints',
      'helplines': 'Helplines & Contacts',
      'recent_activity': 'Recent Activity',
      'view_all': 'View all',
      'ward': 'Ward',
      'open': 'Open',
      'resolved': 'Resolved',
      'sign_out': 'Sign out',
      'sign_out_confirm': 'Are you sure you want to sign out?',
      'cancel': 'Cancel',
      'report_new_issue': 'Report New Issue',
      'issue_category': 'Issue Category',
      'title_hint': 'Problem title (e.g. Potholes in lane 4)',
      'desc_hint': 'Provide more details about the issue...',
      'location': 'Location',
      'getting_location': 'Getting location...',
      'submit_report': 'Submit Report',
      'uploading': 'Uploading...',
      'success_msg': 'Report submitted successfully!',
    },
    'hi': {
      'app_title': 'स्मार्ट सिविक मुंबई',
      'welcome_back': 'आपका स्वागत है!',
      'greeting_morning': 'शुभ प्रभात',
      'greeting_afternoon': 'शुभ दोपहर',
      'greeting_evening': 'शुभ संध्या',
      'sign_in_desc': 'समस्याओं की रिपोर्ट करने और ट्रैक करने के लिए लॉगिन करें',
      'login': 'लॉगिन करें',
      'email': 'ईमेल पता',
      'password': 'पासवर्ड',
      'forgot_password': 'पासवर्ड भूल गए?',
      'new_citizen': 'नए नागरिक? यहाँ रजिस्टर करें →',
      'mumbai_today': 'मुंबई आज',
      'quick_actions': 'त्वरित कार्रवाई',
      'mumbai_services': 'मुंबई सेवाएँ',
      'report_issue': 'समस्या रिपोर्ट करें',
      'file_complaint': 'शिकायत दर्ज करें',
      'track_complaint': 'शिकायत ट्रैक करें',
      'check_status': 'स्थिति जांचें',
      'hotspot_map': 'हॉटस्पॉट मैप',
      'view_areas': 'समस्या वाले क्षेत्र देखें',
      'my_issues': 'मेरी शिकायतें',
      'all_complaints': 'आपकी सभी शिकायतें',
      'helplines': 'हेल्पलाइन और संपर्क',
      'recent_activity': 'हाल की गतिविधि',
      'view_all': 'सभी देखें',
      'ward': 'वार्ड',
      'open': 'खुला',
      'resolved': 'समाधान',
      'sign_out': 'साइन आउट',
      'sign_out_confirm': 'क्या आप वाकई साइन आउट करना चाहते हैं?',
      'cancel': 'रद्द करें',
      'report_new_issue': 'नई समस्या की रिपोर्ट करें',
      'issue_category': 'समस्या की श्रेणी',
      'title_hint': 'समस्या का शीर्षक (जैसे: गली 4 में गड्ढे)',
      'desc_hint': 'समस्या के बारे में अधिक विवरण प्रदान करें...',
      'location': 'स्थान',
      'getting_location': 'स्थान प्राप्त किया जा रहा है...',
      'submit_report': 'रिपोर्ट सबमिट करें',
      'uploading': 'अपलोड हो रहा है...',
      'success_msg': 'रिपोर्ट सफलतापूर्वक सबमिट की गई!',
    },
    'mr': {
      'app_title': 'स्मार्ट सिविक मुंबई',
      'welcome_back': 'तुमचे स्वागत आहे!',
      'greeting_morning': 'शुभ प्रभात',
      'greeting_afternoon': 'शुभ दुपार',
      'greeting_evening': 'शुभ संध्याकाळ',
      'sign_in_desc': 'समस्या नोंदवण्यासाठी आणि ट्रॅक करण्यासाठी लॉगिन करा',
      'login': 'लॉगिन करा',
      'email': 'ईमेल पत्ता',
      'password': 'पासवर्ड',
      'forgot_password': 'पासवर्ड विसरलात?',
      'new_citizen': 'नवीन नागरिक? येथे नोंदणी करा →',
      'mumbai_today': 'मुंबई आज',
      'quick_actions': 'त्वरीत क्रिया',
      'mumbai_services': 'मुंबई सेवा',
      'report_issue': 'तक्रार नोंदवा',
      'file_complaint': 'तक्रार दाखल करा',
      'track_complaint': 'तक्रार ट्रॅक करा',
      'check_status': 'स्थिती तपासा',
      'hotspot_map': 'हॉटस्पॉट नकाशा',
      'view_areas': 'समस्या क्षेत्रे पहा',
      'my_issues': 'माझ्या तक्रारी',
      'all_complaints': 'तुमच्या सर्व तक्रारी',
      'helplines': 'हेल्पलाईन आणि संपर्क',
      'recent_activity': 'अलीकडील क्रियाकलाप',
      'view_all': 'सर्व पहा',
      'ward': 'वार्ड',
      'open': 'खुले',
      'resolved': 'निकाली',
      'sign_out': 'साइन आउट',
      'sign_out_confirm': 'तुमची खात्री आहे की तुम्ही साइन आउट करू इच्छिता?',
      'cancel': 'रद्द करा',
      'report_new_issue': 'नवीन तक्रार नोंदवा',
      'issue_category': 'समस्येचा प्रकार',
      'title_hint': 'समस्येचे शीर्षक (उदा. गल्ली क्र. ४ मधील खड्डे)',
      'desc_hint': 'समस्येबद्दल अधिक माहिती द्या...',
      'location': 'ठिकाण',
      'getting_location': 'स्थान शोधत आहे...',
      'submit_report': 'तक्रार सादर करा',
      'uploading': 'अपलोड होत आहे...',
      'success_msg': 'तक्रार यशस्वीरित्या नोंदवली गेली!',
    }
  };

  String translate(String key) {
    return _translations[_currentLocale.languageCode]?[key] ?? key;
  }

  Future<void> setLocale(String languageCode) async {
    if (_currentLocale.languageCode == languageCode) return;
    _currentLocale = Locale(languageCode);
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('language_code', languageCode);
  }

  Future<void> toggleLanguage() async {
    if (_currentLocale.languageCode == 'en') {
      await setLocale('hi');
    } else if (_currentLocale.languageCode == 'hi') {
      await setLocale('mr');
    } else {
      await setLocale('en');
    }
  }

  Future<void> _loadLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString('language_code') ?? 'en';
    _currentLocale = Locale(code);
    notifyListeners();
  }
}
