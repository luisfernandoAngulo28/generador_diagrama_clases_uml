import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'uml_live_models.dart';

/// Cliente REST de la herramienta CASE (NestJS), distinto del backend
/// Spring Boot generado que consume el resto de la app.
class CaseApi {
  CaseApi._();
  static final CaseApi instance = CaseApi._();

  static const _kUrlKey = 'case_api_url';
  static const _kTokenKey = 'case_api_token';
  static const _kUserKey = 'case_api_user';

  /// Producción (DuckDNS + SSL); en web local se usa el backend de desarrollo.
  static const defaultUrl = kIsWeb
      ? 'http://localhost:3000'
      : 'https://diagramasw1pracial100.duckdns.org';

  String baseUrl = defaultUrl;
  String? token;
  String? userName;
  String? userId;

  bool get isLoggedIn => token != null;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    baseUrl = prefs.getString(_kUrlKey) ?? defaultUrl;
    token = prefs.getString(_kTokenKey);
    final user = prefs.getString(_kUserKey);
    if (user != null) {
      final json = jsonDecode(user) as Map;
      userName = json['name'] as String?;
      userId = json['id'] as String?;
    }
  }

  Future<void> setBaseUrl(String url) async {
    baseUrl = url.trim().replaceAll(RegExp(r'/+$'), '');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kUrlKey, baseUrl);
  }

  Future<void> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email.trim(), 'password': password}),
    );
    if (res.statusCode >= 300) {
      throw CaseApiException(_errorMessage(res, 'Credenciales inválidas'));
    }
    final json = jsonDecode(res.body) as Map;
    final user = json['user'] as Map;
    token = json['token'] as String;
    userName = user['name'] as String?;
    userId = user['id'] as String?;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kTokenKey, token!);
    await prefs.setString(_kUserKey, jsonEncode(user));
  }

  Future<void> logout() async {
    token = null;
    userName = null;
    userId = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kTokenKey);
    await prefs.remove(_kUserKey);
  }

  Future<List<({String id, String name, DateTime? updatedAt})>>
  listDiagrams() async {
    final list = await _get('/diagrams') as List;
    return [
      for (final d in list.whereType<Map>())
        (
          id: '${d['id']}',
          name: '${d['name'] ?? 'Diagrama'}',
          updatedAt: DateTime.tryParse('${d['updatedAt']}')?.toLocal(),
        ),
    ];
  }

  Future<UmlDiagramView> getDiagram(String id) async =>
      UmlDiagramView.fromApi(await _get('/diagrams/$id') as Map);

  Future<dynamic> _get(String path) async {
    final res = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: {if (token != null) 'Authorization': 'Bearer $token'},
    );
    if (res.statusCode == 401) {
      await logout();
      throw CaseApiException('La sesión expiró. Vuelve a iniciar sesión.');
    }
    if (res.statusCode >= 300) {
      throw CaseApiException(_errorMessage(res, 'Error ${res.statusCode}'));
    }
    return jsonDecode(res.body);
  }

  String _errorMessage(http.Response res, String fallback) {
    try {
      final message = (jsonDecode(res.body) as Map)['message'];
      return message is List ? message.join('\n') : '${message ?? fallback}';
    } catch (_) {
      return fallback;
    }
  }
}

class CaseApiException implements Exception {
  final String message;
  CaseApiException(this.message);
  @override
  String toString() => message;
}
