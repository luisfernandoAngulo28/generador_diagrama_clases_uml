# Plantilla Flutter — reto de la defensa en vivo

App mínima ya lista (paquete `http` instalado, cero configuración extra)
para probar cualquier backend generado por la herramienta CASE, **sin
recompilar** cuando cambie el modelo.

## Cómo usarla

1. Antes del examen, abre `lib/main.dart` y ajusta la constante `baseUrl`
   según dónde vayas a correr la app:

   | Dónde corre la app Flutter | `baseUrl` |
   |---|---|
   | Flutter Web (Chrome) en la misma PC que el backend | `http://localhost:8080` |
   | Emulador Android | `http://10.0.2.2:8080` (alias especial hacia el host) |
   | Celular físico en la misma WiFi que tu PC | `http://<IP-LAN-DE-TU-PC>:8080` (revisa tu IP con `ipconfig`) |

2. **Arranca la app *antes* de que el profesor te dé el modelo sorpresa**
   (con cualquier backend de prueba corriendo) para que el primer build
   —el lento— ya haya pasado. Los `hot reload` (`r`) posteriores son casi
   instantáneos.

3. Cuando tengas el backend generado corriendo, en la pantalla de la app:
   - Escribe el nombre del endpoint (ej. `clientes`, `barberos`) en el
     primer campo y toca **"Cargar lista (GET)"**.
   - Escribe un JSON válido en el segundo campo y toca **"Crear (POST)"**
     para insertar un registro de prueba.

No necesitas tocar el código para cambiar de dominio — todo se hace en
tiempo de ejecución.

## Arrancar

```bash
flutter run -d chrome     # más rápido para probar rápido
# o
flutter run                # en un emulador/celular conectado
```
