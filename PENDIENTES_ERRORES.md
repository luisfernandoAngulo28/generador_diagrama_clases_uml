# 🐛 Errores & Pendientes — Estado al 21 Sep 2026

**Examen:** 23 de Septiembre de 2026 ⏳ 2 días

> 📌 Este archivo se limpió el 21/09. Los errores críticos del 18-19 sep
> ya están **resueltos y verificados**. Se conservan abajo como historial
> por si vuelven a aparecer el día del examen, con su solución al lado.

---

## ✅ RESUELTOS (historial + solución rápida por si reaparecen)

### ~~🔴 CRÍTICO 1~~ — `nest build` colgaba el deploy en el VPS — **RESUELTO**
- **Qué pasaba:** `docker compose build` se congelaba en `npm run build` por OOM
  (EC2 `t3.micro` = 1 vCPU / 1 GB RAM, el kernel mataba `tsc` en silencio).
- **Solución aplicada:** compilar el backend en local y subir solo `dist/` por SCP.
  Producción ya está estable en **https://diagramasw1pracial100.duckdns.org** con SSL.
- **Si reaparece:**
  ```powershell
  cd backend
  npm run build
  scp -i ".deploy\diagramador-uml-key.pem" -r dist/ ubuntu@34.231.176.225:app/backend/
  ssh -i ".deploy\diagramador-uml-key.pem" ubuntu@34.231.176.225 "cd app && sudo docker compose -f docker-compose.prod.yml restart backend"
  ```

### ~~🔴 CRÍTICO 2~~ — Chat IA daba "Error al contactar al asistente" — **RESUELTO**
- **Qué pasaba:** un `deploy.sh` en paralelo reiniciaba el backend y cortaba
  las llamadas a Gemini. Además se agregó reintento automático ante errores
  503 transitorios de Gemini (commit `fe319ec`).
- **Regla de oro para el examen:** ❌ NUNCA hacer deploy antes/durante una demo.
- **Plan B si el AI falla igual:** usar `+ Clase` manual + inspector de atributos
  (clic en la clase). O el proveedor local Ollama (commit `1b1d1a2`).

### ~~🔴~~ — App Android: teclado desbordaba y pantalla roja — **RESUELTO**
- `BOTTOM OVERFLOWED BY PIXELS` → se envolvió el diálogo y la pantalla en
  `SingleChildScrollView`.
- Aserción `_dependents.isEmpty` → se corrigió el cierre del diálogo y se
  compiló en **Release** (sin aserciones de depuración).
- `usesCleartextTraffic="true"` en `AndroidManifest.xml` para HTTP a IP local.
- Firewall: `abrir_puerto_8085.bat` (correr como Administrador en red nueva).
- ✅ Verificado en celular físico: POST/GET reales persistidos en PostgreSQL.

---

## 🟡 A TENER PRESENTE EL DÍA DEL EXAMEN (no son bugs, son cuidados)

1. **IP Wi-Fi cambia por red.** Antes de la demo: `ipconfig` → anotar IPv4 →
   ponerla en la app (⚙️) como `http://<TU_IP>:8085`. En red nueva, correr
   `abrir_puerto_8085.bat` como Administrador.
2. **Prompts de IA cortos, uno por clase.** Un prompt largo hace que la IA
   cree atributos genéricos (`nuevoAtributo : String`). Si pasa, editar desde
   el **Inspector de clase** (panel derecho).
3. **Puerto 8080 ocupado.** Si tu PC ya usa 8080, en `docker-compose.yml` del
   ZIP generado cambiar el mapeo a `"8085:8080"`.

---

## 🟢 PENDIENTES REALES ANTES DE ENTREGAR

| Prioridad | Tarea | Estado |
|---|---|---|
| 🔴 Alta | Reemplazar las 2 imágenes de diagramas (secciones 4.3 y 6.3 del .docx) por **capturas reales de Enterprise Architect** — el docente lo pidió explícitamente | ⏳ Pendiente (lo haces tú en EA) |
| 🟢 Baja | Repasar chuleta teórica en voz alta (ver `CHULETA_TEORICA.md`) | ⏳ Pendiente |

> 🎯 **El examen es el 23. Casi todo está listo — foco en las 2 capturas de EA y el repaso teórico.**
