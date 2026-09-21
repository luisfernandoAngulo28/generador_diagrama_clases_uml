# 🧠 Chuleta Teórica — Examen SW1 (23/09/2026)

> Para repasar en voz alta. Todo sale del caso **Licitación Ministerio de
> Salud** (`docs/Caso_Gestion_Ministerio_Salud.docx`) + el proceso **PUDS**.

---

## 🎯 EL PROBLEMA EN UNA FRASE

> "El cliente exige **6 meses**; la estimación técnica real es **12 meses**.
> No es un problema de trabajar más rápido: es una **brecha estructural de
> alcance contra tiempo**. Se resuelve **rediseñando el plan**, no forzando
> el alcance completo en la mitad del tiempo."

**El caso:** empresa gana licitación pública con el Ministerio de Salud para
**4 módulos**: (1) digitalizar historiales clínicos, (2) app móvil de reserva
de fichas, (3) telemedicina para crónicos, (4) reportes estadísticos gerenciales.

---

## 🔑 LA CARTA GANADORA: Ley de Brooks

> **"Agregar personal a un proyecto de software atrasado lo atrasa aún más."**

**Por qué:** cada persona nueva añade **curva de aprendizaje** + **canales de
comunicación** adicionales, sin productividad inmediata. Contratar en masa
para "comprimir" 12 meses en 6 **no es viable ni responsable** — menos con
datos clínicos reales.

👉 Si el docente pregunta "¿por qué no contratas 100 personas más?" → **Brooks**.

---

## 👥 ESTRATEGIA DE PERSONAL (5 puntos)

| # | Decisión | Frase clave |
|---|---|---|
| 1 | **Squads paralelos**, no un equipo gigante secuencial | "Menos camino crítico compartido, no más gente en el mismo camino" |
| 2 | **Reasignar antes que contratar** | Pausar proyectos ERP/MRP no críticos y mover seniors → más rápido y barato, mantiene conocimiento institucional |
| 3 | **Contratación selectiva, no masiva** | Solo donde hay brecha real de **dominio**: 2-3 especialistas en **HL7 FHIR** + 1 de **seguridad/cumplimiento en salud** |
| 4 | **Horas extra táctica, no estructural** | Solo primeras **6-8 semanas** y solo en el spike crítico. Sostenerlas 6 meses "quema" al equipo y baja la calidad |
| 5 | **Squads multifuncionales** (backend+frontend+QA) por módulo | Cada squad "dueño" de un módulo, dependencias mínimas |

> ⚠️ El cuello de botella **no es mano de obra genérica**, es **conocimiento
> de dominio específico** (el equipo actual es de ERP/MRP, no de salud).

---

## 💰 JUSTIFICACIÓN DE COSTOS

El sobrecosto (squads paralelos + contratación especializada + subcontratar
telemedicina) **NO se compara contra el presupuesto original**, sino contra
**el costo de NO cumplir**:

1. **Penalidades contractuales** por incumplir plazo (típicas en contratos públicos).
2. **Riesgo reputacional + inhabilitación** para futuras licitaciones del Estado.
3. **Costo de re-trabajo** por una entrega apurada y de baja calidad.

> "El sobrecosto no es un gasto discrecional: es el precio de convertir un
> **riesgo contractual y reputacional** en un **plan de entrega creíble**."

---

## 🏗️ ARQUITECTURA TECNOLÓGICA

La arquitectura **habilita** lo que la estrategia de personal necesita: equipos
en paralelo sin bloquearse.

- **Microservicios** (o monolito modular con límites claros) por dominio:
  Historiales · Reservas · Telemedicina · Reportes → cada uno desplegable
  solo, cada uno de un squad.
- **HL7 FHIR** para historiales clínicos (estándar, no modelo propietario) →
  interoperabilidad con hospitales + exigible en auditorías de salud.
- **App móvil multiplataforma** (Flutter / React Native) → un solo código base.
- **Telemedicina subcontratada** (proveedor WebRTC/SaaS ya certificado) → no
  construir video desde cero (no es lo diferenciador, ahorra meses).
- **Contenedores + CI/CD por servicio** (Docker/Kubernetes) → cada squad
  despliega sin esperar a los demás.
- **PostgreSQL** con **cifrado en reposo** y **control de acceso por rol**
  (datos clínicos sensibles).

---

## 🛡️ MITIGACIÓN DE RIESGOS

- **Comité de seguimiento quincenal** con el cliente → evitar *scope creep*.
- **Spike técnico temprano** (primeras 4 semanas) sobre la **migración de
  historiales** = el riesgo técnico más alto → validarlo ANTES de comprometer
  al resto del equipo.
- **Entregas incrementales** cada 2 semanas con **demo funcional** → detectar
  desalineación temprano, no al final.
- **Squad de seguridad transversal** → revisa los otros 3 módulos, no aislado.

---

## 🗺️ ROADMAP POR FASES (la clave del "6 meses")

> Se redefine qué significa "entrega en 6 meses":

- **Fase 1 = MVP (6 meses):** lo más visible e impactante →
  **historiales digitalizados + app de reservas**.
- **Fases posteriores (mismo contrato):** telemedicina + reportes avanzados.

👉 Evita a la vez **incumplir el plazo** y **entregar algo apurado y malo**.

---

## 📐 PROCESO DE DESARROLLO: PUDS (NO Scrum)

> ⚠️ **IMPORTANTE:** por indicación del docente, la documentación describe el
> proceso **solo con PUDS** (Proceso Unificado de Desarrollo de Software).
> **No menciones Scrum** como el proceso oficial.

**PUDS es:**
- **Dirigido por casos de uso** (los CU guían todo el desarrollo).
- **Centrado en la arquitectura**.
- **Iterativo e incremental**.

**4 Fases:** Inicio → Elaboración → Construcción → Transición.

**Flujos de trabajo** (se aplican en la Parte II del documento):
Requisitos → Análisis → Diseño → Implementación → Pruebas.

> Si preguntan por "gestión ágil", el ángulo aquí es **iterativo/incremental
> con entregas cada 2 semanas y demo al cliente**, enmarcado en PUDS.

---

## ⚡ PREGUNTAS RÁPIDAS (auto-test)

1. **¿Por qué no contratar más gente?** → Ley de Brooks.
2. **¿Cómo aceleras sin caer en Brooks?** → Squads paralelos, menos camino crítico compartido.
3. **¿A quién contratas sí o sí?** → Especialista HL7 FHIR + seguridad/cumplimiento en salud.
4. **¿Cómo justificas el sobrecosto?** → Contra el costo de NO cumplir (penalidades, reputación, re-trabajo).
5. **¿Qué entregas en 6 meses?** → MVP: historiales + reservas (Fase 1); el resto por fases.
6. **¿Qué haces primero técnicamente?** → Spike de migración de historiales (mayor riesgo).
7. **¿Qué proceso de desarrollo usas?** → PUDS (iterativo, incremental, dirigido por casos de uso).
8. **¿Por qué microservicios?** → Para que los squads trabajen en paralelo sin bloquearse.
