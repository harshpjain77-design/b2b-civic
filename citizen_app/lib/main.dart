import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';

import 'services/theme_service.dart';
import 'services/language_service.dart';
import 'utils/app_theme.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/signup_screen.dart';
import 'screens/mpin_setup_screen.dart';
import 'screens/home_screen.dart';
import 'screens/report_issue_screen.dart';
import 'screens/track_screen.dart';
import 'screens/my_issues_screen.dart';
import 'screens/map_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    ).timeout(const Duration(seconds: 10));
  } catch (e) {
    debugPrint('Firebase init error: $e');
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeService()),
        ChangeNotifierProvider(create: (_) => LanguageService()),
      ],
      child: const SmartCivicApp(),
    ),
  );
}

class SmartCivicApp extends StatelessWidget {
  const SmartCivicApp({super.key});

  @override
  Widget build(BuildContext context) {
    // ✅ FIX: actually use themeService to drive dark/light mode
    final themeService = context.watch<ThemeService>();
    final languageService = context.watch<LanguageService>();

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Smart Civic Mumbai',
      locale: languageService.currentLocale,
      theme:      AppTheme.lightTheme,
      darkTheme:  AppTheme.darkTheme,
      // ✅ FIX: was hardcoded ThemeMode.light — now respects user preference
      themeMode: themeService.isDarkMode ? ThemeMode.dark : ThemeMode.light,
      initialRoute: '/',
      routes: {
        '/':           (ctx) => const SplashScreen(),
        '/login':      (ctx) => const LoginScreen(),
        '/signup':     (ctx) => const SignupScreen(),
        '/mpin-setup': (ctx) => const MpinSetupScreen(),
        '/home':       (ctx) => const HomeScreen(),
        '/report':     (ctx) => const ReportIssueScreen(),
        '/track':      (ctx) => const TrackScreen(),
        '/myIssues':   (ctx) => const MyIssuesScreen(),
        '/map':        (ctx) => const MapScreen(),
      },
      onUnknownRoute: (settings) =>
          MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }
}