# Checklist del día de la defensa — martes 10/11/2026

**Grupo 43 — Luis Fernando Angulo Heredia · Elizabeth Peña Rivero**

## Antes del martes

- [ ] **Probar producción con la cuenta propia:** iniciar sesión en
      https://diagramasw1pracial100.duckdns.org → *Archivo → Mis diagramas*
      (deben estar los 13) → abrir uno → subir y descargar un adjunto.
- [ ] **Probar el celular:** la app Flutter contra producción: entrar a la sala,
      ver un cambio hecho desde la web y recibir la notificación.
- [ ] **Elegir el documento que se entrega.** Hay dos `.docx` en
      `docs/documento_final/`:
  - `Examen_Parcial_2_Grupo43_SW1.docx` / `.pdf`: el generado por los scripts,
    actualizado al **07/11** (142 páginas, con el redespliegue en Ohio).
  - `Examen_Parcial_2_Grupo43_SW1F.docx`: la copia de ustedes, del **05/11**.
    No tiene los cambios posteriores. Si le hicieron retoques a mano, hay que
    pasarlos a la versión nueva (o avisarme y los paso a las fuentes `.md`).
- [ ] **Carátulas:** imprimir **2**, cada una con:
  - "Segundo Examen Parcial", nombre de la aplicación, integrantes, Grupo 43,
    fecha de entrega;
  - QR 1 → repositorio de GitHub;
  - QR 2 → https://diagramasw1pracial100.duckdns.org
  - Escanear los dos QR con el celular antes de imprimir.
- [ ] **Ensayar** los cambios de [GUIA_CAMBIOS_EN_VIVO.md](GUIA_CAMBIOS_EN_VIVO.md)
      los dos, y repasar [GUIA_DEFENSA_2DO_PARCIAL.md](GUIA_DEFENSA_2DO_PARCIAL.md).
- [ ] **Saldo de AWS:** el servidor cuesta ≈ 0,40 USD por día. No apagarlo antes
      de la nota: los QR tienen que funcionar hasta el fin del semestre.

## Martes antes de las 08:00

- [ ] Subir el **PDF** elegido a la plataforma. Guardar captura de la subida.
- [ ] Abrir el sitio una vez más (debe cargar con candado HTTPS).

## Martes antes de las 16:00 (llevar la laptop cargada)

- [ ] Las 2 carátulas impresas.
- [ ] **Docker Desktop** abierto y la pila local levantada
      (`http://localhost`), ver la sección 0 de la guía de cambios en vivo.
- [ ] **Ollama** abierto, con el modelo `moderador-uml` cargado (hacerle una
      pregunta antes para que quede "caliente").
- [ ] Correr una vez `flutter analyze` (la primera tarda ~3 min) y
      `npx vitest run` en `backend/` (152 tests).
- [ ] **Enterprise Architect** abierto con `docs/diagrams/ea/ciclo2.eap`, y
      `ciclo1.eap` a mano (los diagramas del 1er Parcial).
- [ ] VS Code abierto en el repo, en la rama `demo-en-vivo`.
- [ ] Celular cargado, con la app instalada y la sesión iniciada.
- [ ] Datos móviles del celular como respaldo de internet (compartir conexión).

## Plan B

| Si falla… | Hacer… |
|---|---|
| Internet del aula | Compartir datos del celular; la pila local y Ollama funcionan sin internet (`AI_HYBRID_ORDER=local-first`) |
| AWS / el dominio | Mostrar la pila local en `http://localhost` y explicar la arquitectura de despliegue con el diagrama 01 y la guía de redespliegue |
| Gemini (límite o error 503) | El híbrido pasa solo a Ollama; mostrar el badge del proveedor que respondió |
| Un cambio en vivo se rompe | `git stash` y explicar el error |

## Después de las 16:00

- [ ] **No tocar nada** del repositorio ni del servidor hasta tener la nota.

## Después de la nota

- [ ] Regenerar el **token de DuckDNS** (quedó visible en una captura).
- [ ] Guardar en un lugar privado o borrar los `.csv` de claves de `D:\Descargas`.
- [ ] Cuando ya no hagan falta los QR (fin del semestre): respaldo y apagado
      con la sección *"Apagarlo otra vez"* de
      [deploy/GUIA_REDESPLIEGUE_AWS.md](deploy/GUIA_REDESPLIEGUE_AWS.md).
