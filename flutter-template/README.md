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

## Asistente 100% offline (`flutter_gemma`)

Botón 🤖 en la barra superior. Corre completamente on-device (sin red)
usando el motor MediaPipe/LiteRT-LM de Google — el modelo real ejecuta
en el celular, no llama a ningún servidor.

**Importante:** `flutter_gemma` **no** acepta archivos `.gguf` (formato de
llama.cpp). Necesita el modelo empaquetado como `.task` o `.litertlm`
(formato MediaPipe/LiteRT de Google). Descarga el modelo recomendado
(Qwen2.5 1.5B Instruct, 1.6 GB, **sin necesitar cuenta/token de Hugging
Face**) desde:

```
https://huggingface.co/litert-community/Qwen2.5-1.5B-Instruct/resolve/main/Qwen2.5-1.5B-Instruct_multi-prefill-seq_q8_ekv1280.task
```

Guárdalo en el celular (o en la PC si pruebas con `flutter run -d chrome`
o `-d windows`), abre el asistente offline dentro de la app, toca
**"Seleccionar modelo (.task)"** y elige ese archivo. Se carga una sola
vez; las siguientes veces ya queda instalado.

### Por qué el filtro de palabras clave

Un modelo de ~1.5B parámetros corriendo en CPU **no es confiable** siguiendo
por sí solo la instrucción de "responde solo temas de ingeniería de
software" — a veces se pasa de estricto (rechaza preguntas válidas), a
veces de permisivo (responde temas ajenos). Se probó extensamente con
Ollama en PC antes de portarlo aquí (ver `lib/offline_guard.dart`): las
preguntas claramente ajenas al dominio se filtran localmente por palabra
clave **antes** de invocar al modelo — más rápido (0s) y 100% confiable
para los casos obvios, sin depender del juicio del modelo pequeño.

### Nota de rendimiento

En un celular de gama media, una respuesta de 2-3 oraciones toma unos
5-10 segundos en CPU. Por eso el prompt de sistema fuerza respuestas
breves — una respuesta larga puede tardar más de un minuto y no es
usable en una demo en vivo.
