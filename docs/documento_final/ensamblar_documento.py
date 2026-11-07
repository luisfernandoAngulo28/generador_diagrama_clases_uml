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
    logo = (bd.OUT_DIR / "img" / "logo_ficct.png").as_posix()
    return f"""
::: {{custom-style="Cover Institution"}}
![]({logo}){{width=0.72in height=1in}}
:::

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

Angulo Heredia Luis Fernando — Registro: 215001958

Peña Rivero Elizabeth — Registro: 215053745

**Materia:** Ingeniería de Software I

**Sigla:** INF422-SB

**Docente:** Ing. Rolando Martínez

**Semestre:** 2026-2

**Fecha de entrega:** martes 10 de noviembre de 2026
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
# Orden final del documento (08/11/2026)
# --------------------------------------------------------------------------
# Perfil del Proyecto → Parte I (fundamentación) → Parte II (los flujos de
# trabajo del PUDS, numerados desde 1) → Parte III (mecanismo de uso) →
# Bibliografía → Anexos (grupo, estándar, evidencias, metodología).
CAPS_PARTE2 = {
    "2": "Flujo de Trabajo: Captura de Requisitos",
    "3": "Flujo de Trabajo: Análisis",
    "4": "Flujo de Trabajo: Diseño",
    "5": "Flujo de Trabajo: Implementación",
    "6": "Flujo de Trabajo: Prueba",
    "7": "Registro del desarrollo (evidencia del proceso)",
}


def _bloques(texto: str, patron: str) -> list[str]:
    """Parte `texto` antes de cada línea que cumple `patron` (multilínea)."""
    return re.split(rf"(?m)^(?={patron})", texto)


def _perfil_al_inicio(base: str) -> str:
    ini = base.index("# 1. Perfil\n")
    fin = base.index("# 2. Captura De Requisitos")
    perfil, base = base[ini:fin], base[:ini] + base[fin:]
    cabeza, *secs = _bloques(perfil, r"## 1\.\d[ .]")
    grupos: dict[str, str] = {}
    for s in secs:
        grupos.setdefault(re.match(r"## 1\.(\d)", s).group(1), "")
        grupos[re.match(r"## 1\.(\d)", s).group(1)] += s
    # Introducción, Objetivo general, Objetivos específicos, Problema, Alcance
    orden = ["1", "3", "4", "2", "5"]
    nuevo = cabeza.replace("# 1. Perfil", "# 1. Perfil del Proyecto", 1)
    for k, viejo in enumerate(orden, 1):
        nuevo += re.sub(rf"(?m)^(#+ )1\.{viejo}(\.?)", rf"\g<1>1.{k}\2", grupos[viejo])
    p1 = base.index("**PARTE 1")
    return base[:p1] + nuevo.rstrip() + "\n\n" + base[p1:]


def _diseno_en_orden(base: str) -> str:
    """Diseño: arquitectura, casos de uso (con el diseño detallado) y datos."""
    ini = base.index("# 4. Diseño\n")
    fin = base.index("# 5. Implementación")
    cap = base[ini:fin]
    cabeza, *secs = _bloques(cap, r"## 4\.\d ")
    s = {re.match(r"## 4\.(\d)", x).group(1): x for x in secs}
    detallado = s["4"].replace("## 4.4 Diseño detallado del Segundo Ciclo", "### 4.2.2 Diseño detallado del Segundo Ciclo", 1)
    casos = s["3"].replace("## 4.3 Diseño de casos de uso", "## 4.2 Diseño de casos de uso", 1)
    casos = casos.replace("### 4.3.1 Diagrama de secuencia", "### 4.2.1 Diagrama de secuencia", 1)
    datos = s["2"].replace("## 4.2 Diseño de datos lógicos", "## 4.3 Diseño de datos lógicos", 1)
    nuevo = cabeza + s["1"] + casos + detallado + datos
    nuevo = nuevo.replace("está en la sección 4.4)", "está en la sección 4.2.2)")
    return base[:ini] + nuevo + base[fin:]


def _restar(m: re.Match) -> str:
    return m.group(1) + str(int(m.group(2)) - 1) + m.group(3)


def _parte2_desde_uno(base: str) -> str:
    """Los capítulos 2-7 de la Parte II pasan a 1-6, y con ellos sus
    referencias (en la Parte II, en la Parte I cuando dicen «de la Parte 2»,
    y en los anexos)."""
    p2, p3 = base.index("**PARTE 2"), base.index("**PARTE 3")
    an = base.index("# Anexos")
    antes, parte2, medio, anexos = base[:p2], base[p2:p3], base[p3:an], base[an:]

    def titulos(m: re.Match) -> str:
        return f"# {int(m.group(1)) - 1}. {CAPS_PARTE2[m.group(1)]}"
    parte2 = re.sub(r"(?m)^# ([2-7])\. .*$", titulos, parte2)
    parte2 = re.sub(r"(?m)^(#{2,4} )([2-7])((?:\.\d+)+\.?)", _restar, parte2)

    # "capítulo 7 de la Parte 1" (el PUDS) no se toca: solo cambia la Parte II.
    refs = (r"(\(ver |[Ss]ecci(?:ón|ones) |detalle en |[Cc]apítulo |SYS-08 en el capítulo )"
            r"([2-7])((?:\.\d+)*)(?![\d.]*\s+de la Parte 1)")
    parte2 = re.sub(refs, _restar, parte2)
    parte2 = parte2.replace("prueba completa en 2.4.7", "prueba completa en 6.4.7")
    de_parte2 = r"((?:[Ss]ección|capítulo) )([2-7])((?:\.\d+)*)(?= de la Parte 2)"
    antes = re.sub(de_parte2, _restar, antes)
    antes = re.sub(r"(Parte 2, sección )([2-7])((?:\.\d+)*)", _restar, antes)
    anexos = re.sub(de_parte2, _restar, anexos)
    # En los anexos, "capítulo 7" y "sección 7.x" son el registro del desarrollo
    # (Parte II); "sección 3.x" es la Parte III y no cambia.
    anexos = re.sub(r"(\(ver |[Ss]ecci(?:ón|ones) |[Cc]apítulo )(7)((?:\.\d+)*)(?![\d.]*\s+de la Parte)",
                    _restar, anexos)
    return antes + parte2 + medio + anexos


def _parte1_desde_uno(base: str) -> str:
    """Los capítulos 2-8 de la Parte I pasan a 1-7 (el Perfil va antes, sin parte)."""
    p1, p2 = base.index("**PARTE 1"), base.index("**PARTE 2")
    antes, parte1, resto = base[:p1], base[p1:p2], base[p2:]
    parte1 = re.sub(r"(?m)^(#{1,4} )([2-8])((?:\.\d+)*\.?)(?= )", _restar, parte1)
    parte1 = re.sub(r"((?:mencionad[ao]s?|descrita|descritos?) en )([2-8])((?:\.\d+)+)", _restar, parte1)
    resto = re.sub(r"([Cc]apítulo )([2-8])((?:\.\d+)*)(?= de la Parte 1)", _restar, resto)
    return antes + parte1 + resto


def _bibliografia_y_anexos(base: str) -> str:
    """Bibliografía antes de los anexos; el Anexo A pasa a ser el del grupo
    y las evidencias pasan a ser el Anexo C (como en el formato de referencia)."""
    bib = base.index("# Bibliografía")
    base, biblio = base[:bib], base[bib:]
    an = base.index("# Anexos")
    antes, anexos = base[:an], base[an:]
    cabeza, *secs = _bloques(anexos, r"## Anexo [A-F]")
    s = {re.match(r"## Anexo ([A-F])", x).group(1): x for x in secs}
    grupo = re.sub(r"^## Anexo C\.", "## Anexo A.", s["C"])
    evid = re.sub(r"^## Anexo A\.", "## Anexo C.", s["A"])
    evid = re.sub(r"(?m)^### A\.(\d+)", r"### C.\1", evid)
    otros = "".join(v for k, v in s.items() if k not in "ABCD")
    anexos = cabeza + grupo + s["B"] + evid + s["D"] + otros

    def renombrar(texto: str) -> str:
        texto = re.sub(r"\bA\.(\d+) a A\.(\d+)", r"C.\1 a C.\2", texto)
        texto = re.sub(r"\b(Figura |[Ss]ecciones |[Ss]ección )A\.(\d+[ab]?)", r"\1C.\2", texto)
        texto = re.sub(r"(Pruebas; )Anexo A\b", r"\1Anexo C", texto)
        texto = texto.replace("| 7.4; Anexo A |", "| 6.4; Anexo C |")
        # Dos figuras de la Parte I llevaban un rótulo de anexo del 1er Parcial
        return re.sub(r"(\*{1,2})Anexo A\.[12] --- ", r"\1Figura --- ", texto)
    return renombrar(antes).rstrip() + "\n\n" + biblio.rstrip() + "\n\n" + renombrar(anexos).rstrip() + "\n"


def _parte3_desde_uno(base: str) -> str:
    """Parte III: "3.1." → "1.", "3.2.8" → "2.8"... como las otras partes."""
    p3, bib = base.index("**PARTE 3"), base.index("# Bibliografía")
    antes, parte3, resto = base[:p3], base[p3:bib], base[bib:]
    parte3 = re.sub(r"(?m)^(#{1,4} )3\.(\d+(?:\.\d+)*\.?)(?= )", r"\1\2", parte3)
    parte3 = re.sub(r"\(ver 3\.(\d+(?:\.\d+)*)\)", r"(ver \1)", parte3)
    parte3 = re.sub(r"descrito en la sección 3\.1\b", "descrito en el capítulo 1 de esta parte", parte3)
    parte3 = re.sub(r"descritos en la sección 3\.1\b", "descritos en el capítulo 1 de esta parte", parte3)
    resto = re.sub(r"de la sección 3\.3 \(", "del capítulo 3 de la Parte 3 (", resto)
    return antes + parte3 + resto


def reordenar(base: str) -> str:
    base = _perfil_al_inicio(base)
    base = _diseno_en_orden(base)
    base = _parte2_desde_uno(base)
    base = _parte1_desde_uno(base)
    base = _parte3_desde_uno(_bibliografia_y_anexos(base))
    return base


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
    base = reordenar(base)

    # "**PARTE N --- Título**" → portadilla "Parte I – Título" en su propia
    # página; el estilo "Parte" tiene nivel de esquema 1 y entra al índice.
    titulos_partes = {
        "1": "Parte I – Fundamentación Teórica",
        "2": "Parte II – Proceso de Desarrollo",
        "3": "Parte III – Mecanismo para que el Usuario Utilice la Aplicación",
    }
    base = re.sub(
        r"^\*\*PARTE (\d+) --- (.+?)\*\*\s*$",
        lambda m: f'::: {{custom-style="Parte"}}\n{titulos_partes[m.group(1)]}\n:::\n',
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
