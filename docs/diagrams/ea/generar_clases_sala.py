"""Genera docs/diagrams/2do_parcial/09_clases_sala.plantuml: el diagrama de clases
de diseño de la sala colaborativa (web, servidor y móvil) a partir de los
diagramas de secuencia. Cada objeto de una secuencia es instancia de una clase
de este diagrama, y cada mensaje que recibe es una de sus operaciones; las
dependencias «use» salen de quién envía mensajes a quién.

Uso, desde la raíz del repo:  python docs/diagrams/ea/generar_clases_sala.py
"""
import glob
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ea_builder import MSG_RE, PART_RE, clean, read  # noqa: E402

LIBS = ('Model<', 'Server', 'FlutterLocalNotificationsPlugin')
# Already modelled with their attributes in 04_clases_motor_ia: shown here by name only.
IN_04 = {'AiService', 'HybridAiProvider', 'GeminiProvider', 'OllamaProvider', 'ModeratorService', 'Intent'}
LAYER = {
    'Frontend web (React)': ['LoginPage', 'AuthProvider', 'ApiClient', 'App', 'ChatPanel', 'ClassInspector', 'HistoryPanel'],
    'Backend (NestJS)': ['JwtAuthGuard', 'AuthController', 'AuthService', 'UsersService', 'DiagramsController',
                         'DiagramsService', 'SessionsService', 'DiagramsGateway', 'ChatGateway', 'ModeratorService',
                         'AiService', 'HybridAiProvider', 'GeminiProvider', 'OllamaProvider', 'Intent', 'CanvasPolicy',
                         'AuthorshipUtil'],
    'App móvil (Flutter)': ['_LiveDiagramPage', 'CaseApi', 'LiveRoom', 'LiveNotifications'],
}
STEREO = {'ApiClient': 'utility', 'Intent': 'utility', 'CanvasPolicy': 'utility', 'AuthorshipUtil': 'utility',
          'LoginPage': 'component', 'App': 'component', 'ChatPanel': 'component', 'ClassInspector': 'component',
          'HistoryPanel': 'component', 'AuthProvider': 'component', '_LiveDiagramPage': 'widget',
          'ChatGateway': 'gateway', 'DiagramsGateway': 'gateway', 'AuthController': 'controller',
          'DiagramsController': 'controller', 'JwtAuthGuard': 'guard'}


SIGNATURE = {'saveDiagram': 'isAuto, source', 'updateDiagram': 'id, name, model, source',
             'update': 'id, dto, user, source', 'show': 'title, body'}


def class_of(label):
    name = re.sub(r'\s.*', '', label.lstrip(':')).strip()
    return name


ops, deps = {}, set()
for path in sorted(glob.glob('docs/diagrams/2do_parcial/pud/seq_*.plantuml') +
                   glob.glob('docs/diagrams/2do_parcial/0[56]_*.plantuml')):
    lines = read(path)
    parts = {}
    for l in lines:
        m = PART_RE.match(l)
        if m:
            kind, q, bare, alias = m.groups()
            parts[alias or bare] = (kind, clean(q or bare))
    for l in lines:
        m = MSG_RE.match(l.strip())
        if not m:
            continue
        a, arrow, b, text = m.groups()
        if arrow.startswith('<'):
            a, b = b, a
        if '--' in arrow or a not in parts or b not in parts:
            continue
        text = clean(text or '').replace('\n', ' ')
        mm = re.match(r'^([A-Za-z_][\w.]*)\s*\(([^)]*)\)', text)
        if not mm:
            continue
        src, dst = class_of(parts[a][1]), class_of(parts[b][1])
        if dst.startswith(LIBS) or parts[b][0] == 'actor':
            continue
        name = mm.group(1).split('.')[-1]
        params = re.sub(r'\{[^}]*\}', 'obj', mm.group(2))
        known = ops.setdefault(dst, {})
        # a call with literal arguments ('AI', true) doesn't name the parameters: keep a named one
        literal = bool(re.search(r"['\"]|\btrue\b|\bfalse\b|\d", params))
        if name not in known or (not literal and re.search(r"'|\btrue\b|\bfalse\b", known[name])):
            known[name] = SIGNATURE.get(name, params) if literal else params
        if parts[a][0] != 'actor' and src != dst and not src.startswith(LIBS):
            deps.add((src, dst))

out = ["@startuml 09_clases_sala",
       "' Generado por docs/diagrams/ea/generar_clases_sala.py a partir de los diagramas de secuencia.",
       "!include _estilo.iuml",
       "hide empty members",
       "title Diagrama de Clases de Diseño — Sala colaborativa (web, servidor y móvil)\\n"
       "<size:11>UML 2.5.1 · cada operación es un mensaje recibido en los diagramas de secuencia · "
       "las clases del motor de IA se detallan en el diagrama del motor</size>"]
placed = set()
for layer, names in LAYER.items():
    out.append(f'package "{layer}" {{')
    for n in names:
        if n not in ops and n not in {d for _, d in deps} and n not in {s for s, _ in deps}:
            continue
        placed.add(n)
        st = f' <<{STEREO[n]}>>' if n in STEREO else ''
        if n in IN_04:
            out.append(f'  class {n}{st}')
            continue
        out.append(f'  class {n}{st} {{')
        for op, params in sorted(ops.get(n, {}).items()):
            vis = '-' if op.startswith('_') else '+'
            out.append(f'    {vis} {op}({params})')
        out.append('  }')
    out.append('}')
missing = (set(ops) | {d for _, d in deps}) - placed
assert not missing, f'clases sin capa: {missing}'
for s, d in sorted(deps):
    out.append(f'{s} ..> {d} : <<use>>')
out.append('@enduml')
dst = 'docs/diagrams/2do_parcial/09_clases_sala.plantuml'
open(dst, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(dst, len(placed), 'clases,', sum(len(v) for v in ops.values()), 'operaciones,', len(deps), 'dependencias')
