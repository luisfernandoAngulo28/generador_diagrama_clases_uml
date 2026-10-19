import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Notificaciones locales del visor UML en vivo: avisan de mensajes del chat
/// grupal, respuestas de la IA y cambios en el diagrama hechos por otros.
/// Si la plataforma no las soporta o el usuario las niega, fallan en
/// silencio: el visor sigue funcionando (y muestra su propio aviso en pantalla).
class LiveNotifications {
  LiveNotifications._();
  static final LiveNotifications instance = LiveNotifications._();

  final _plugin = FlutterLocalNotificationsPlugin();
  bool _ready = false;
  int _nextId = 1;

  static const _channel = AndroidNotificationDetails(
    'uml_live',
    'Diagrama en vivo',
    channelDescription:
        'Chat del equipo, respuestas de la IA y cambios del diagrama UML',
    importance: Importance.high,
    priority: Priority.high,
  );

  Future<void> init() async {
    if (_ready) return;
    try {
      await _plugin.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(),
          macOS: DarwinInitializationSettings(),
          linux: LinuxInitializationSettings(defaultActionName: 'Abrir'),
          windows: WindowsInitializationSettings(
            appName: 'Examen SW1',
            appUserModelId: 'Grupo43.ExamenSW1.VisorUml',
            guid: 'b6f1d6a4-6c2e-4f0e-9a51-2f6a4b8c3d21',
          ),
          web: WebInitializationSettings(),
        ),
      );
      // Android 13+ pide el permiso en tiempo de ejecución.
      await _plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.requestNotificationsPermission();
      _ready = true;
    } catch (e) {
      debugPrint('Notificaciones locales no disponibles: $e');
    }
  }

  Future<void> show(String title, String body) async {
    if (!_ready) return;
    try {
      await _plugin.show(
        id: _nextId++,
        title: title,
        body: body,
        notificationDetails: const NotificationDetails(
          android: _channel,
          iOS: DarwinNotificationDetails(),
          macOS: DarwinNotificationDetails(),
        ),
      );
    } catch (e) {
      debugPrint('No se pudo mostrar la notificación: $e');
    }
  }
}
