# 🚀 Reporte de Avance y Simulacro Completo — Examen SW1

**Fecha:** 20 de Septiembre de 2026  
**Meta:** Examen Práctico y Teórico (23 de Septiembre de 2026) — 100/100  
**Estado General:** **100% Funcional y Verificado End-to-End**

---

## 📊 Matriz de Verificación de Componentes

| Componente | Plataforma | Estado | Pruebas Realizadas |
|---|---|:---:|---|
| **Herramienta CASE Web** | VPS (DuckDNS + SSL) | ✅ OK | Login, modelado UML manual y por IA, guardado y validación de integridad. |
| **Generador Spring Boot** | Backend NestJS | ✅ OK | Generación de ZIP con Spring Boot 3.3.4, JPA, Swagger UI, Docker Compose y CORS. |
| **Base de Datos** | Docker (PostgreSQL 16) | ✅ OK | Generación automática de tablas y llaves foráneas a partir de las entidades. |
| **Backend en Ejecución** | Docker (Host Port 8085) | ✅ OK | Controladores REST operativos y respondiendo a llamadas HTTP GET/POST. |
| **Cliente Web Flutter** | Navegador Chrome | ✅ OK | Comunicación exitosa y visualización de registros en localhost:3001. |
| **Cliente Móvil Android** | Celular Físico (APK Release) | ✅ OK | **Conexión Wi-Fi exitosa (`192.168.0.7:8085`). Creación y listado de registros en vivo.** |

---

## 🛠️ Hitos Resueltos en la Sesión de Hoy

1. **Despliegue al Servidor de Producción:**
   - La plataforma en `https://diagramasw1pracial100.duckdns.org` está 100% activa con SSL y Docker.
2. **Simulacro Completo (Sistema de Restaurante):**
   - Se crearon las entidades `Mesa`, `Cliente`, `Pedido`, `Producto` con sus respectivas relaciones.
   - Se generó el ZIP, se extrajo y se levantó en Docker local.
3. **Resolución de Errores en la App Android:**
   - **Corrección de desbordamiento de teclado (`Overflowed by pixels`):** Implementación de `SingleChildScrollView` en el diálogo y en la pantalla principal.
   - **Eliminación de la pantalla roja (`_dependents.isEmpty`):** Se corrigió el flujo de cierre del diálogo y se compiló en modo **Release Oficial** (las aserciones de depuración quedan desactivadas).
   - **Permisos de red HTTP local:** Configurado `android:usesCleartextTraffic="true"` para que Android admita conexiones a IPs locales sin cifrado SSL.
   - **Firewall de Windows:** Creado el script `abrir_puerto_8085.bat` para autorizar el puerto con 1 clic.
4. **Verificación de Persistencia Real:**
   - Desde el celular se crearon los clientes:
     - `id: 1` ➔ **Carlos Mamani** (`70012345`)
     - `id: 2` ➔ **Carlos Mendez** (`77015435`)
   - Ambos registros fueron consultados directamente en PostgreSQL en la computadora, confirmando la integración total.

---

## 📁 Archivos Clave en el Proyecto

- **APK Release para el celular:** [`ExamenSW1.apk`](file:///d:/Universidad/SW1S22026/ExamenSW1/ExamenSW1.apk) (~281 MB)
- **Script para abrir el Firewall:** [`abrir_puerto_8085.bat`](file:///d:/Universidad/SW1S22026/ExamenSW1/abrir_puerto_8085.bat)
- **Código Flutter modificado:** [`flutter-template/lib/main.dart`](file:///d:/Universidad/SW1S22026/ExamenSW1/flutter-template/lib/main.dart)
- **Manifiesto Android con permisos:** [`flutter-template/android/app/src/main/AndroidManifest.xml`](file:///d:/Universidad/SW1S22026/ExamenSW1/flutter-template/android/app/src/main/AndroidManifest.xml)
