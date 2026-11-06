"""Verificación modelo-código (paso 3 de la evaluación).

Cruza cada mensaje de los diagramas de secuencia del Ciclo 2 con el código: el
mensaje m() que llega a un objeto de la clase X debe ser una operación de X.
Uso, desde la raíz del repo:  python docs/diagrams/ea/verificar_secuencias.py
  OK  = la operación existe en la clase receptora
  LIB = operación de una librería (Mongoose Model, Socket.io Server, notificaciones)
  FALTA / CLASE? = el modelo no coincide con el código (hay que corregir uno de los dos)
Los mensajes de retorno y las acciones del actor sobre la interfaz no se cuentan.
"""
import glob, os, re, sys
sys.path.insert(0, 'docs/diagrams/ea')
from ea_builder import PART_RE, MSG_RE, clean, read  # noqa

SRC = glob.glob('backend/src/**/*.ts', recursive=True) + glob.glob('frontend/src/**/*.ts*', recursive=True) \
    + glob.glob('mobile/**/lib/**/*.dart', recursive=True) + glob.glob('**/lib/**/*.dart', recursive=True)
SRC = [f for f in set(SRC) if 'node_modules' not in f and '.spec.' not in f]
TEXT = {f: open(f, encoding='utf-8', errors='ignore').read() for f in SRC}


MODULES = {'ApiClient': 'frontend/src/api/client.ts', 'Intent': 'backend/src/ai/moderator/intent.ts',
           'CanvasPolicy': 'backend/src/ai/moderator/canvas-policy.ts',
           'AuthorshipUtil': 'backend/src/diagrams/authorship.util.ts',
           'OperationValidator': 'backend/src/ai/validate-operations.ts'}
LIBS = ('Model<', 'Server', 'FlutterLocalNotificationsPlugin')


def class_files(name):
    if name in MODULES:
        return [f for f in TEXT if f.replace('\\', '/') == MODULES[name]]
    pat = re.compile(rf'\b(class|function|const|interface)\s+{re.escape(name)}\b')
    return [f for f, t in TEXT.items() if pat.search(t)]


def has_method(files, m):
    pat = re.compile(rf'(^|\s|\.)(async\s+)?{re.escape(m)}\s*(<[^>]*>)?\s*\(|\b{re.escape(m)}\s*[:=]\s*(async\s*)?(useCallback\()?\(|function\s+{re.escape(m)}\b', re.M)
    return any(pat.search(TEXT[f]) for f in files)


rows = []
for path in sorted(glob.glob('docs/diagrams/2do_parcial/pud/seq_*.plantuml') + glob.glob('docs/diagrams/2do_parcial/0[56]_*.plantuml')):
    lines = read(path)
    parts = {}
    for l in lines:
        m = PART_RE.match(l)
        if m:
            kind, q, bare, alias = m.groups()
            parts[alias or bare] = clean(q or bare)
    for l in lines:
        m = MSG_RE.match(l.strip())
        if not m:
            continue
        a, arrow, b, text = m.groups()
        if arrow.startswith('<'):
            a, b = b, a
        if '--' in arrow:
            continue  # return messages
        text = clean(text or '').replace('\n', ' ')
        mm = re.match(r'^([A-Za-z_][\w.]*)\s*\(', text)
        label = parts.get(b, b)
        cls = re.sub(r'\s.*', '', label.lstrip(':')).strip()
        if not mm:
            rows.append((os.path.basename(path), label, text, 'TEXTO'))
            continue
        meth = mm.group(1).split('.')[-1]
        if cls.startswith(LIBS):
            rows.append((os.path.basename(path), label, text, 'LIB'))
            continue
        files = class_files(cls)
        if not files:
            rows.append((os.path.basename(path), label, text, 'CLASE?'))
        elif has_method(files, meth):
            rows.append((os.path.basename(path), label, text, 'OK'))
        else:
            rows.append((os.path.basename(path), label, text, 'FALTA'))

from collections import Counter
print(Counter(r[3] for r in rows))
for r in rows:
    if r[3] != 'OK':
        print(f'{r[3]:7} {r[0]:32} {r[1][:28]:28} {r[2][:80]}')
