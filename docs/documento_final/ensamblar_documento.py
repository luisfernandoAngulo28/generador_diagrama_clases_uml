"""
Documento final del 2do Parcial con la estructura de "ciclos" (PUDS):
toma el documento del 1er Parcial (fuente/base_1er_parcial.md, sin tocar) y
le inserta el SEGUNDO CICLO en cada flujo de trabajo, igual que el formato
de referencia de la cátedra.

Uso (desde la raíz del repo):
    python docs/documento_final/ensamblar_documento.py
    powershell -ExecutionPolicy Bypass -File docs/documento_final/finalizar_con_word.ps1

Fuentes:
  fuente/base_1er_parcial.md   documento del 1er Parcial (convertido del .docx)
  fuente/ciclo2_pud.md         bloques "@@ nombre" del segundo ciclo
  docs/seccion1_*.md           fundamentación teórica del 2do Parcial (→ cap. 8)
  docs/seccion2_*.md           registro del desarrollo (→ Parte 2, cap. 7)
  docs/seccion3_*.md           mecanismo de aprendizaje (→ Parte 3, 3.3)
  docs/seccion_anexos.md       anexos del 2do Parcial
"""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

import build_documento as bd  # estilos, post-proceso y utilidades ya probados

ROOT = bd.ROOT
DOCS = bd.DOCS
FUENTE = bd.OUT_DIR / "fuente"
OUTPUT = bd.OUT_DIR / "Examen_Parcial_2_Grupo43_SW1.docx"

PAGE_BREAK = bd.PAGE_BREAK


# --------------------------------------------------------------------------
# Carátula (formato de la referencia: universidad, facultad, título, datos)
# --------------------------------------------------------------------------
def caratula() -> str:
    qr_repo = (bd.OUT_DIR / "img" / "qr_repositorio.png").as_posix()
    qr_prod = (bd.OUT_DIR / "img" / "qr_produccion.png").as_posix()
    return f"""
::: {{custom-style="Cover Institution"}}
UNIVERSIDAD AUTÓNOMA GABRIEL RENÉ MORENO
:::

::: {{custom-style="Cover Subject"}}
FACULTAD DE INGENIERÍA EN CIENCIAS DE LA COMPUTACIÓN Y TELECOMUNICACIONES
:::

::: {{custom-style="Cover Title"}}
SEGUNDO EXAMEN PARCIAL
:::

::: {{custom-style="Cover App"}}
"DIAGRAMADOR UML: HERRAMIENTA CASE COLABORATIVA CON MODERADOR IA"
:::

::: {{custom-style="Cover Subtitle"}}
Modelado de diagramas de clases UML 2.5 y generación de backends Spring Boot — Ciclo 1 y Ciclo 2
:::

::: {{custom-style="Cover Info"}}
**Grupo:** 43

**Integrantes:**

Elizabeth Rivero Peña — Registro: ⟨…⟩

Luis Fernando Angulo Heredia — Registro: ⟨…⟩

**Materia:** Ingeniería de Software I

**Sigla:** INF 422 ⟨verificar grupo⟩

**Docente:** Ing. Martínez Canedo Rolando Antonio

**Semestre:** 2026-2

**Fecha de entrega:** miércoles 11 de noviembre de 2026
:::

| ![]({qr_repo}){{width=1.3in}} | ![]({qr_prod}){{width=1.3in}} |
|:---:|:---:|
| **Repositorio (GitHub)** | **Aplicación en producción** |

{PAGE_BREAK}
{bd.TOC_FIELD}
"""


# --------------------------------------------------------------------------
# Utilidades
# --------------------------------------------------------------------------
def bloques_ciclo2() -> dict[str, str]:
    text = (FUENTE / "ciclo2_pud.md").read_text(encoding="utf-8")
    parts = re.split(r"^@@ (\w+)\s*$", text, flags=re.M)
    return {parts[i]: parts[i + 1].strip() + "\n" for i in range(1, len(parts), 2)}


def renumerar(md: str, origen: str, destino: str, titulo_h1: str) -> str:
    """Convierte una sección autónoma (# Sección N…, ## N.x) en un capítulo
    del documento (# destino. título, ## destino.x)."""
    md = bd.limpiar_seccion(md)
    md = re.sub(r"^# .*$", f"# {titulo_h1}", md, count=1, flags=re.M)
    md = re.sub(rf"^(#{{2,4}}) {re.escape(origen)}\.", rf"\1 {destino}.", md, flags=re.M)
    # Referencias cruzadas internas: "ver 2.4.2", "Sección 2.5" → nueva numeración
    md = re.sub(rf"\b(ver|Sección|sección) {re.escape(origen)}\.(\d)", rf"\1 {destino}.\2", md)
    return md


def quitar_referencias(md: str) -> str:
    """La bibliografía va unificada al final."""
    return re.split(r"^#{2,3} Referencias de esta sección.*$", md, flags=re.M)[0]


def figuras_rotadas(md: str) -> str:
    """![rot](png){width=…} → figura rotada 90° a página completa."""
    def repl(m: re.Match) -> str:
        path, width = bd.preparar_figura(ROOT / m.group(1))
        return f"{PAGE_BREAK}\n![]({path.as_posix()}){{width={width:.2f}in}}"
    return re.sub(r"!\[rot\]\(([^)]+)\)\{width=\"[\d.]+in\"\}", repl, md)


def insertar(doc: str, ancla: str, contenido: str, antes: bool = True) -> str:
    """Inserta contenido antes (o después) de la primera línea que empieza
    con `ancla`. Falla si el ancla no existe, para no perder contenido."""
    m = re.search(rf"^{re.escape(ancla)}.*$", doc, flags=re.M)
    if not m:
        raise SystemExit(f"Ancla no encontrada: {ancla!r}")
    pos = m.start() if antes else m.end()
    return doc[:pos] + "\n" + contenido.strip() + "\n\n" + doc[pos:]


def bibliografia(base_refs: str) -> str:
    refs = [l.strip() for l in base_refs.splitlines() if l.strip()]
    anexos = (DOCS / "seccion_anexos.md").read_text(encoding="utf-8")
    nuevas = anexos.split("## Anexo F. Bibliografía (APA 7)", 1)[1]
    refs += [l.strip() for l in nuevas.splitlines() if l.strip()]
    def clave(ref: str) -> str:
        # Título = lo que sigue a "(año). "; se compara normalizado para que
        # "OMG Unified Modeling Language (UML), versión 2.5.1" y "(OMG UML),
        # version 2.5.1" cuenten como la misma obra.
        titulo = ref.split("). ", 1)[-1]
        titulo = re.sub(r"\(.*?\)|versi[oó]n|version", "", titulo.lower())
        return re.sub(r"[^a-z]", "", titulo)[:22]

    vistas, unicas = set(), []
    for r in refs:
        k = clave(r)
        if k not in vistas:
            vistas.add(k)
            unicas.append(r)
    unicas.sort(key=lambda r: r.lower())
    return "# Bibliografía\n\n" + "\n\n".join(unicas) + "\n"


def anexos_2do() -> tuple[str, str]:
    """Anexo A (evidencias) y Anexos C-D del 2do Parcial."""
    md = bd.limpiar_seccion((DOCS / "seccion_anexos.md").read_text(encoding="utf-8"))
    anexo_a = md.split("## Anexo A.", 1)[1].split("## Anexo B.", 1)[0]
    c_d = md.split("## Anexo C.", 1)[1].split("## Anexo F.", 1)[0]
    # En este documento el registro del desarrollo es el capítulo 7 de la Parte 2
    c_d = re.sub(r"\b[Ss]ección 2\.(\d)", r"sección 7.\1", c_d)
    anexo_a = re.sub(r"\b[Ss]ección 2\.(\d)", r"sección 7.\1", anexo_a)
    # En este documento el registro del desarrollo es el capítulo 7 de la Parte 2
    c_d = re.sub(r"[Ss]ección 2\.(\d)", r"sección 7.", c_d)
    anexo_a = re.sub(r"[Ss]ección 2\.(\d)", r"sección 7.", anexo_a)
    return "## Anexo A." + anexo_a, "## Anexo C." + c_d


# --------------------------------------------------------------------------
# Ensamblado
# --------------------------------------------------------------------------
def ensamblar() -> Path:
    base = (FUENTE / "base_1er_parcial.md").read_text(encoding="utf-8")
    base = base.replace("](./media/", "](docs/documento_final/fuente/media/")
    # Carátula vieja del 1er Parcial → nueva
    base = base[base.index("**PARTE 1"):]
    b = bloques_ciclo2()

    # Correcciones mínimas de vigencia (lo demás del ciclo 1 queda intacto)
    base = base.replace(
        "A diferencia de un sistema con roles y autenticación, esta herramienta no distingue perfiles de acceso",
        "En el primer ciclo, a diferencia de un sistema con roles y autenticación, la herramienta no distinguía perfiles de acceso",
    )
    base = base.replace(
        "el lienzo no requiere registro ni inicio de sesión: cualquier persona con el enlace puede abrir la herramienta y comenzar a modelar de inmediato.",
        "en el primer ciclo el lienzo no requería registro; desde el segundo ciclo se inicia sesión para que el equipo y el Moderador IA sepan quién es cada integrante (ver 3.2.8).",
    )

    # PARTE 1 — capítulo 8: fundamentación teórica del 2do Parcial
    teoria = renumerar(
        (DOCS / "seccion1_fundamentacion_teorica_2do_parcial.md").read_text(encoding="utf-8"),
        "1", "8", "8. Fundamentación teórica del Segundo Parcial",
    )
    base = insertar(base, "**PARTE 2", quitar_referencias(teoria))

    # PARTE 2 — Perfil
    base = insertar(base, "## 1.2 Descripción del problema", b["perfil_intro"])
    base = insertar(base, "## 1.3 Objetivo General", b["perfil_problema"])
    base = insertar(base, "## 1.4 Objetivos Específicos", b["perfil_objetivo"])
    base = insertar(base, "## 1.5 Alcance", b["perfil_especificos"])
    base = insertar(base, "# 2. Captura De Requisitos", b["alcance"])
    # Requisitos
    base = insertar(base, "## 2.2 Priorizar Casos De Uso", b["actores"])
    base = insertar(base, "## 2.3 Detallar Caso De Uso", b["priorizar"])
    base = insertar(base, "## 2.4 Estructurar Modelo De Caso De Uso", b["detallar"])
    base = insertar(base, "# 3. Análisis", b["estructurar"])
    # Análisis
    base = insertar(base, "## 3.2. Análisis de caso de uso", b["paquetes"])
    base = insertar(base, "## 3.3. Análisis de clase", b["comunicacion"])
    base = insertar(base, "## 3.4. Análisis de paquete", b["clases_analisis"])
    base = insertar(base, "# 4. Diseño", b["analisis_paquete"])
    # Diseño
    base = insertar(base, "### 4.1.2 Diseño lógico de arquitectura", b["despliegue"])
    base = insertar(base, "## 4.2 Diseño de datos lógicos", b["diseno_logico"])
    base = insertar(base, "## 4.3 Diseño de casos de uso", b["datos"])
    base = insertar(base, "# 5. Implementación", b["secuencias"])
    # Implementación y pruebas
    base = insertar(base, "# 6. Pruebas", b["implementacion"])
    registro = renumerar(
        (DOCS / "seccion2_registro_del_desarrollo.md").read_text(encoding="utf-8"),
        "2", "7", "7. Registro del desarrollo (evidencia del proceso)",
    )
    base = insertar(base, "**PARTE 3", b["pruebas"] + "\n\n" + registro)

    # PARTE 3 — manual del ciclo 2 y mecanismo de aprendizaje
    aprendizaje = renumerar(
        (DOCS / "seccion3_aprendizaje_del_usuario.md").read_text(encoding="utf-8"),
        "3", "3.3", "3.3. Mecanismo de aprendizaje del usuario (Segundo Parcial)",
    )
    base = insertar(base, "# Anexos", b["manual"] + "\n\n" + aprendizaje)

    # Anexos: A actualizado, B (estándar del 1er Parcial) se conserva, C y D nuevos
    anexo_a, anexo_c_d = anexos_2do()
    base = re.sub(
        r"^## Anexo A\. Evidencia del sistema en funcionamiento\n.*?(?=^## Anexo B)",
        lambda _: anexo_a.strip() + "\n\n",
        base, count=1, flags=re.M | re.S,
    )
    refs_idx = base.index("**Referencias**")
    base_refs = base[refs_idx + len("**Referencias**"):]
    base = base[:refs_idx] + anexo_c_d.strip() + "\n\n" + bibliografia(base_refs)

    # "**PARTE N --- Título**" → portadilla centrada en su propia página
    base = re.sub(
        r"^\*\*(PARTE \d+) --- (.+?)\*\*\s*$",
        lambda m: f'::: {{custom-style="Parte"}}\n{m.group(1)}\n:::\n\n'
        f'::: {{custom-style="Parte Titulo"}}\n{m.group(2)}\n:::\n',
        base, flags=re.M,
    )

    md = caratula() + "\n\n" + figuras_rotadas(base)
    bd.BUILD.mkdir(parents=True, exist_ok=True)
    master = bd.BUILD / "examen_parcial_2.md"
    master.write_text(md, encoding="utf-8")
    return master


def main():
    master = ensamblar()
    ref = bd.construir_referencia()
    subprocess.run(
        [
            "pandoc", str(master),
            "-f", "markdown+fenced_divs+raw_attribute+pipe_tables+grid_tables+task_lists",
            "-t", "docx",
            "--reference-doc", str(ref),
            "--resource-path", str(ROOT),
            "-o", str(OUTPUT),
        ],
        check=True,
    )
    bd.post_procesar(OUTPUT)
    print(f"Documento generado: {OUTPUT}")


if __name__ == "__main__":
    main()
