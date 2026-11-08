"""Pasa los diagramas de secuencia y de comunicación del 1er Parcial (Mermaid,
docs/diagrams/*.mmd) a PlantUML en docs/diagrams/1er_parcial/, con el mismo
formato que los del Ciclo 2, para que ea_builder.py los construya en
Enterprise Architect:

    python docs/diagrams/ea/convertir_ciclo1.py
    $env:EA_CICLO = "1"; python docs/diagrams/ea/ea_builder.py

El contenido (participantes y mensajes) es el del 1er Parcial, sin cambios;
solo se agrega la notación UML: estereotipos Boundary-Control-Entity, actores
y mensajes numerados.
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..'))
OUT = os.path.join(SRC, '1er_parcial')

CU = {
    1: 'Crear Clase UML', 2: 'Editar Clase UML', 3: 'Eliminar Clase UML',
    4: 'Crear Relación', 5: 'Guardar Diagrama', 6: 'Cargar Diagrama Compartido',
    7: 'Colaborar en Tiempo Real', 8: 'Generar Backend Spring Boot', 9: 'Exportar a XMI',
    10: 'Consultar Asistente de IA', 11: 'Dictar Comando por Voz', 12: 'Interpretar Foto de Pizarra',
}

# Rol de cada participante de las secuencias (patrón ECB del análisis).
BOUNDARY = ('LienzoUML', 'Inspector', 'ChatPanel')
CONTROL = ('Controller', 'Service', 'Gateway', 'api/client', 'api/socket')


def seq_kind(name):
    if name.startswith(BOUNDARY):
        return 'boundary'
    if any(k in name for k in CONTROL):
        return 'control'
    if 'PostgreSQL' in name:
        return 'database'
    return 'participant'  # servicios externos: Google Gemini, Web Speech API


def convert_seq(n):
    lines = open(os.path.join(SRC, f'seq-cu{n}.mmd'), encoding='utf-8').read().splitlines()
    out = [f'@startuml seq_cu{n}', '!include ../2do_parcial/pud/_seq.iuml',
           f'title CU{n} — {CU[n]}\\n<size:11>Diagrama de Secuencia · UML 2.5.1 · Ciclo 1 (1er Parcial)</size>']
    for l in lines[1:]:
        s = l.strip()
        m = re.match(r'(actor|participant)\s+(\w+)\s+as\s+(.+)$', s)
        if m:
            kind, alias, name = m.groups()
            if kind == 'actor':
                out.append(f'actor "{name}" as {alias}')
            else:
                out.append(f'{seq_kind(name)} ":{name}" as {alias}')
            continue
        m = re.match(r'(\w+)\s*(-->>|->>)\s*(\w+)\s*:\s*(.+)$', s)
        if m:
            a, arrow, b, msg = m.groups()
            out.append(f'{a} {"-->" if arrow == "-->>" else "->"} {b} : {msg}')
            continue
        m = re.match(r'Note over (\w+):\s*(.+)$', s)
        if m:
            out.append(f'note over {m.group(1)} : {m.group(2)}')
            continue
        if s:
            raise ValueError(f'seq-cu{n}: línea no reconocida: {s}')
    out.append('@enduml')
    return out


def convert_com(n):
    lines = open(os.path.join(SRC, f'com-cu{n}.mmd'), encoding='utf-8').read().splitlines()
    out = [f'@startuml com_cu{n}', '!include ../2do_parcial/pud/_com.iuml',
           f'title CU{n} — {CU[n]}\\n<size:11>Diagrama de Comunicación · UML 2.5.1 · patrón ECB · Ciclo 1 (1er Parcial)</size>']
    objs, links = [], {}
    for l in lines[1:]:
        s = l.strip()
        m = re.match(r'actor\(\((.+)\)\)$', s)
        if m:
            objs.append(f'actor "{m.group(1)}" as A')
            continue
        m = re.match(r'(\w+)\["«(\w+)»<br/>(.+)"\]$', s)
        if m:
            alias, stereo, name = m.groups()
            objs.append(f'object ":{name}" as {alias} <<{stereo}>>')
            continue
        m = re.match(r'(\w+)\s*--\s*"(.+)"\s*-->\s*(\w+)$', s)
        if m:
            a, msg, b = m.groups()
            a, b = ('A' if a == 'actor' else a), ('A' if b == 'actor' else b)
            key = (a, b) if (b, a) not in links else (b, a)
            arrow = '→' if key == (a, b) else '←'
            links.setdefault(key, []).append(f'{msg} {arrow}' if a != b else msg)
            continue
        if s:
            raise ValueError(f'com-cu{n}: línea no reconocida: {s}')
    out += [o for o in objs if not o.startswith('actor')] + [o for o in objs if o.startswith('actor')]
    for (a, b), msgs in links.items():
        out.append(f'{a} -down- {b} : "' + '\\n'.join(msgs) + '"')
    out.append('@enduml')
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    for n in CU:
        # Las secuencias ya no salen de Mermaid: las escribe secuencias_ciclo1.py con operaciones reales.
        for name, body in ((f'com_cu{n}', convert_com(n)),):
            with open(os.path.join(OUT, name + '.plantuml'), 'w', encoding='utf-8', newline='\n') as f:
                f.write('\n'.join(body) + '\n')
    print('12 diagramas de comunicación en', OUT)


if __name__ == '__main__':
    main()
