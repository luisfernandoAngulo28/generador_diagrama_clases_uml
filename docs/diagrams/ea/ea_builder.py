"""Construye en Enterprise Architect (por automatización COM) los diagramas del
Ciclo 2 a partir de sus fuentes PlantUML, y exporta cada uno como PNG.

Uso (con EA instalado):  python docs/diagrams/ea/ea_builder.py [nombre ...]
El proyecto queda en docs/diagrams/ea/ciclo2.eap y las imágenes en
docs/diagrams/ea/img/. Los diagramas se pueden abrir y retocar en EA.
"""
import os
import re
import shutil
import uuid
import sys

import win32com.client

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..', '2do_parcial'))
EAP = os.path.join(HERE, 'ciclo2.eap')
IMG = os.path.join(HERE, 'img')
BASE = r'C:\Program Files (x86)\Sparx Systems\EA\EABase.eap'


def clean(text):
    text = re.sub(r'<<\s*([^<>]+?)\s*>>', r'«\1»', text)  # stereotypes survive
    text = re.sub(r'<[^>]+>', '', text)                  # <size:11>, <b>…
    return ea_text(text.replace('\\n', '\n').strip().strip('"').strip())


def title_of(lines, default):
    for l in lines:
        m = re.match(r'\s*title\s+(.*)', l)
        if m:
            return clean(m.group(1)).split('\n')[0]
    return default


def read(path):
    out = []
    for l in open(path, encoding='utf-8').read().splitlines():
        if l.strip().startswith("'") or l.strip().startswith('!include') or l.strip().startswith('skinparam'):
            continue
        out.append(l.rstrip())
    return out


class EA:
    def __init__(self, fresh):
        if fresh or not os.path.exists(EAP):
            shutil.copy(BASE, EAP)
        self.r = win32com.client.Dispatch('EA.Repository')
        if not self.r.OpenFile(EAP):
            raise RuntimeError('No se pudo abrir ' + EAP)
        self.model = self.r.Models.GetAt(0)

    def package(self, name):
        for i in range(self.model.Packages.Count):
            p = self.model.Packages.GetAt(i)
            if p.Name == name:
                return p
        p = self.model.Packages.AddNew(name, 'Package')
        p.Update()
        self.model.Packages.Refresh()
        return p

    def drop_diagram(self, pkg, name):
        """Re-running replaces the diagram and the elements created for it."""
        for i in reversed(range(pkg.Packages.Count)):
            if pkg.Packages.GetAt(i).Name == name:
                pkg.Packages.Delete(i)
        pkg.Packages.Refresh()
        sub = pkg.Packages.AddNew(name, 'Package')
        sub.Update()
        pkg.Packages.Refresh()
        return sub

    def sql(self, s):
        self.r.Execute(s)

    def export(self, diagram, name):
        os.makedirs(IMG, exist_ok=True)
        self.r.ReloadDiagram(diagram.DiagramID)
        path = os.path.join(IMG, name + '.png')
        self.r.GetProjectInterface().PutDiagramImageToFile(diagram.DiagramGUID, path, 1)
        return path

    def close(self):
        self.r.CloseFile()
        self.r.Exit()


# ---------------------------------------------------------------- secuencia
PART_RE = re.compile(r'^\s*(actor|participant|boundary|control|entity|database|collections)\s+(?:"([^"]+)"|(\S+))(?:\s+as\s+(\S+))?')
MSG_RE = re.compile(r'^\s*([\w]+)\s*(-+>+|<-+)\s*([\w]+)\s*(?::\s*(.*))?$')
Y0, STEP = 135, 35  # EA draws message k at Y0 + STEP*k (in frame coordinates)
FRAG_OP = {'alt': 0, 'opt': 1, 'break': 2, 'par': 3, 'loop': 4, 'critical': 5, 'group': 0}


def build_sequence(ea, pkg, name, lines):
    title = title_of(lines, name)
    sub = ea.drop_diagram(pkg, title)
    d = sub.Diagrams.AddNew(title, 'Sequence')
    d.Update()

    parts, order = {}, []
    for l in lines:
        m = PART_RE.match(l)
        if m:
            kind, quoted, bare, alias = m.groups()
            parts[alias or bare] = {'kind': kind, 'label': clean(quoted or bare)}
            order.append(alias or bare)

    x = 30
    for key in order:
        p = parts[key]
        w = max(90, min(190, 8 * max(len(s) for s in p['label'].split('\n')) + 20))
        p['x'], p['w'] = x, w
        x += w + 45
    notes_x = x

    # Parse into messages (by index) plus fragments and notes anchored to message indices.
    msgs, frags, notes, stack, in_note = [], [], [], [], None
    for l in lines:
        s = l.strip()
        if in_note is not None:
            if s == 'end note':
                notes.append((len(msgs), '\n'.join(in_note)))
                in_note = None
            else:
                in_note.append(clean(s))
            continue
        if not s or s.startswith(('@', 'title', 'autonumber')) or PART_RE.match(l):
            continue
        m = re.match(r'^(alt|opt|par|loop|break|critical|group)\b\s*(.*)$', s)
        if m:
            stack.append({'op': m.group(1), 'ops': [(clean(m.group(2)), len(msgs))], 'members': set()})
            continue
        m = re.match(r'^else\b\s*(.*)$', s)
        if m and stack:
            stack[-1]['ops'].append((clean(m.group(1)), len(msgs)))
            continue
        if s == 'end' and stack:
            f = stack.pop()
            f['last'] = len(msgs) - 1
            f['depth'] = len(stack)
            frags.append(f)
            if stack:
                stack[-1]['members'] |= f['members']
            continue
        m = re.match(r'^note\s+(?:right|left|over)\s*(?:of\s+)?(\w+)?\s*(?::\s*(.*))?$', s)
        if m:
            if m.group(2) is None:
                in_note = []
            else:
                notes.append((len(msgs), clean(m.group(2))))
            continue
        m = re.match(r'^\.\.\.(.*)\.\.\.$', s)
        if m:
            notes.append((len(msgs), clean(m.group(1))))
            continue
        m = MSG_RE.match(s)
        if m:
            a, arrow, b, text = m.groups()
            if arrow.startswith('<'):
                a, b = b, a
            msgs.append((a, b, clean(text or '').replace('\n', ' '), '--' in arrow))
            for f in stack:
                f['members'] |= {a, b}

    # EA lays messages out itself: arrow k at y = Y0 + STEP*k (diagram coordinates).
    Y = lambda k: Y0 + STEP * k
    end_y = Y(len(msgs)) + 40

    objs = {}
    for key in order:
        p = parts[key]
        if p['kind'] == 'actor':
            el = sub.Elements.AddNew(p['label'].replace('\n', ' '), 'Actor')
        else:
            el = sub.Elements.AddNew(p['label'].replace('\n', ' '), 'Sequence')
            if p['kind'] in ('boundary', 'control', 'entity'):
                el.Stereotype = p['kind']
        el.Update()
        o = d.DiagramObjects.AddNew(f"l={p['x']};r={p['x'] + p['w']};t=40;b={end_y};", '')
        o.ElementID = el.ElementID
        o.Update()
        objs[key] = el

    for k, (a, b, text, ret) in enumerate(msgs):
        c = objs[a].Connectors.AddNew(text, 'Sequence')
        c.SupplierID = objs[b].ElementID
        c.SequenceNo = k + 1
        c.DiagramID = d.DiagramID
        c.Update()
        y = Y(k)
        ea.sql(f"UPDATE t_connector SET PtStartY={-y}, PtEndY={-(y + 15 if a == b else y)}, "
               f"PDATA4='{1 if ret else 0}', PDATA1='Synchronous', PDATA3='Call' "
               f"WHERE Connector_ID={c.ConnectorID}")

    for f in frags:
        first, last, depth = f['ops'][0][1], f['last'], f['depth']
        top = Y(first) - 26 + 5 * depth
        bottom = Y(last) + (28 if msgs[last][0] == msgs[last][1] else 12) - 4 * depth
        members = [k for k in f['members'] if k in parts]
        left = min(parts[k]['x'] for k in members) - 14 + 7 * depth
        right = max(parts[k]['x'] + parts[k]['w'] for k in members) + 14 - 7 * depth
        el = sub.Elements.AddNew(f['ops'][0][0] if f['op'] == 'par' else '', 'InteractionFragment')
        el.Subtype = FRAG_OP[f['op']]
        el.Update()
        # Operands are written the way EA stores them (the Partitions API crashes EA 13.5
        # with several unnamed operands).
        starts = [top] + [Y(i) - 20 for _, i in f['ops'][1:]] + [bottom]
        desc = ''
        for i, (guard, _) in enumerate(f['ops']):
            guard = guard.replace(' = ', ': ').replace('=', ':').replace(';', ',')
            guard = guard if guard and f['op'] != 'par' else '<anonymous>'
            desc = f"@PAR;Name={guard};Size={max(10, starts[i + 1] - starts[i])};@ENDPAR;" + desc  # EA lists the bottom operand first
        ea.sql("INSERT INTO t_xref (XrefID, Name, Type, Visibility, Partition, Client, Description) VALUES "
               f"('{{{uuid.uuid4()}}}'.upper(), 'Partitions', 'element property', 'Public', '0', "
               f"'{el.ElementGUID}', '{desc.replace(chr(39), chr(39) * 2)}')".replace("}'.upper()", "}'"))
        o = d.DiagramObjects.AddNew(f'l={left};r={right};t={top};b={bottom};', '')
        o.ElementID = el.ElementID
        o.Update()

    # Notes go in a column to the right so they never cover a message.
    for idx, text in notes:
        el = sub.Elements.AddNew('', 'Note')
        el.Notes = text.replace('\n', '\r\n')
        el.Update()
        yy = Y(max(0, idx - 1)) - 10
        h = 16 * (text.count('\n') + 1) + 14
        w = max(160, min(280, 7 * max(len(t) for t in text.split('\n')) + 20))
        o = d.DiagramObjects.AddNew(f'l={notes_x};r={notes_x + w};t={yy};b={yy + h};', '')
        o.ElementID = el.ElementID
        o.Update()
    d.Update()
    return d


# ---------------------------------------------------------------- estructurales
LEAF_RE = re.compile(
    r'^(abstract class|class|interface|enum|actor|usecase|object|component|artifact|database|cloud|node|package|rectangle|frame|folder)\s+'
    r'(?:"([^"]+)"|\[([^\]]+)\]|\(([^)]+)\)|([\w.:]+))'
    r'(?:\s+as\s+([\w.]+))?\s*(?:<<\s*([^>]+?)\s*>>)?\s*(?:as\s+([\w.]+))?\s*(#\w+)?\s*(\{)?\s*(\})?\s*$')
UC_SHORT_RE = re.compile(r'^\(([^)]+)\)\s+as\s+(\w+)')
COMP_SHORT_RE = re.compile(r'^\[([^\]]+)\]\s+as\s+(\w+)')
ARROW = r'(?:<\|?|\*|o|\(|\))?[-.]+(?:left|right|up|down)?[-.]*(?:\|?>|\*|o|\(|\))?'
REL_RE = re.compile(r'^("[^"]+"|[\w.:]+)\s*(?:"([^"]*)")?\s*(' + ARROW + r')\s*(?:"([^"]*)")?\s*("[^"]+"|[\w.:]+)\s*(?::\s*(.*))?$')
CONTAINERS = {'package', 'rectangle', 'node', 'frame', 'folder', 'component', 'cloud', 'database'}
VIS = {'+': 'Public', '-': 'Private', '#': 'Protected', '~': 'Package'}


def ea_text(t):
    t = t.replace('→', '->').replace('←', '<-').replace('…', '...').replace('·', '-').replace('≠', '!=')
    return t.encode('cp1252', 'replace').decode('cp1252')


def parse_struct(lines):
    root = {'kind': 'root', 'children': [], 'name': ''}
    nodes, rels, notes = {}, [], []
    stack = [root]
    cur_class, in_note, skip_block = None, None, 0
    for raw in lines:
        s = raw.strip()
        if not s or s.startswith(('@', 'title', 'hide', 'left to right', 'top to bottom', 'show')):
            continue
        if skip_block:
            skip_block += s.count('{') - s.count('}')
            continue
        if in_note is not None:
            if s == 'end note':
                notes.append(in_note)
                in_note = None
            else:
                in_note['text'].append(clean(s))
            continue
        if cur_class is not None:
            if s == '}':
                cur_class = None
            elif s not in ('--', '..', '__', '=='):
                cur_class['members'].append(s)
            continue
        m = re.match(r'^note\s+(right|left|top|bottom)\s+of\s+([\w.]+)\s*(?::\s*(.*))?$', s)
        if m:
            note = {'side': m.group(1), 'target': m.group(2), 'text': []}
            if m.group(3) is None:
                in_note = note
            else:
                note['text'] = [clean(m.group(3))]
                notes.append(note)
            continue
        if s == '}':
            if len(stack) > 1:
                stack.pop()
            continue
        if re.match(r'^\w+\s*\{$', s) and not LEAF_RE.match(s):  # skinparam blocks
            skip_block = 1
            continue
        m = LEAF_RE.match(s)
        if m:
            kind, q, b, p, bare, alias1, stereo, alias2, _, opened, closed = m.groups()
            name = clean(q or b or p or bare)
            alias = alias1 or alias2 or (bare if bare else name)
            node = {'kind': kind, 'name': name, 'stereo': stereo, 'members': [], 'children': []}
            nodes[alias] = node
            nodes.setdefault(name, node)
            stack[-1]['children'].append(node)
            if opened and not closed:
                if kind in CONTAINERS:
                    stack.append(node)
                else:
                    cur_class = node
            continue
        m = UC_SHORT_RE.match(s) or COMP_SHORT_RE.match(s)
        if m:
            kind = 'usecase' if s.startswith('(') else 'component'
            node = {'kind': kind, 'name': clean(m.group(1)), 'stereo': None, 'members': [], 'children': []}
            nodes[m.group(2)] = node
            stack[-1]['children'].append(node)
            continue
        m = REL_RE.match(s)
        if m:
            a, ma, arrow, mb, b, label = m.groups()
            rels.append({'a': a.strip('"'), 'b': b.strip('"'), 'arrow': arrow, 'ma': ma, 'mb': mb,
                         'label': clean(label or '')})
    return root, nodes, rels, notes


def text_w(lines, px=7, pad=24, lo=90, hi=340):
    return max(lo, min(hi, px * max((len(l) for l in lines), default=0) + pad))


ICONS = {'boundary', 'control', 'entity'}


def measure(n):
    """Drawn size (w, h); also sets the grid cell (cw, ch), wider for icons with a label below."""
    size = _measure(n)
    if size:
        n['cw'], n['ch'] = size
        if (n.get('stereo') or '') in ICONS and n['kind'] in ('class', 'object'):
            n['cw'], n['ch'] = max(70, text_w(n['name'].split('\n'), 7, 10, 70, 260)), 86
            size = (60, 60)
    return size


def _measure(n):
    k = n['kind']
    lines = n['name'].split('\n')
    if k in CONTAINERS and n['children']:
        return None
    if k in ('class', 'abstract class', 'interface', 'enum'):
        rows = [n['name']] + n['members']
        h = 34 + (14 if n['stereo'] or k != 'class' else 0) + 15 * len(n['members']) + (8 if n['members'] else 6)
        return text_w(rows, 6.4, 30, 110, 420), h
    if k == 'actor':
        return 70, 70
    if k == 'usecase':
        return text_w(lines, 6.6, 40, 120, 230), 52
    if k == 'object':
        return text_w(lines, 7, 30, 110, 260), 48
    if k in ('artifact', 'database', 'cloud', 'node', 'package', 'rectangle', 'component', 'frame', 'folder'):
        return text_w(lines + ([n['stereo'] or 'database'] if k == 'database' else []), 7.5, 50, 140, 320), 34 + 15 * len(lines)
    return 120, 50


ADJ = {}  # id(node) -> ids of related nodes, set per diagram


def connected_order(kids):
    """Breadth-first from the most connected element, so related elements sit next to each other."""
    if len(kids) < 3:
        return kids
    ids = {id(k): k for k in kids}
    deg = lambda k: len(ADJ.get(id(k), ()) & ids.keys())
    out, seen = [], set()
    for start in sorted(kids, key=deg, reverse=True):
        if id(start) in seen:
            continue
        queue = [start]
        seen.add(id(start))
        while queue:
            k = queue.pop(0)
            out.append(k)
            for j in sorted(ADJ.get(id(k), ()) & ids.keys(), key=lambda i: -deg(ids[i])):
                if j not in seen:
                    seen.add(j)
                    queue.append(ids[j])
    return out


def layout(n, cols=None):
    """Sets n['w'], n['h'] and children's relative 'x', 'y'."""
    size = measure(n)
    if size:
        n['w'], n['h'] = size
        return
    n['cw'] = n['ch'] = None
    kids = n['children'] = connected_order(n['children'])
    for c in kids:
        layout(c)
    if not cols:
        cols = max(1, round(len(kids) ** 0.5 + 0.25))
    pad, gap = 18, 28
    head = 26 + 15 * (n['name'].count('\n') + 1) + (14 if n.get('stereo') else 0)  # room for the frame's own name
    widths, heights = [0] * cols, [0] * ((len(kids) + cols - 1) // cols)
    for i, c in enumerate(kids):
        widths[i % cols] = max(widths[i % cols], c.get('cw') or c['w'])
        heights[i // cols] = max(heights[i // cols], c.get('ch') or c['h'])
    for i, c in enumerate(kids):
        c['x'] = pad + sum(widths[:i % cols]) + gap * (i % cols)
        c['y'] = head + sum(heights[:i // cols]) + gap * (i // cols)
    n['w'] = 2 * pad + sum(widths) + gap * (cols - 1)
    n['h'] = head + pad + sum(heights) + gap * (len(heights) - 1)


def hint_layout(root, nodes, rels):
    """Communication diagrams: place objects following -down-/-up-/-left-/-right- hints."""
    pos, taken = {}, set()
    dirs = {'down': (0, 1), 'up': (0, -1), 'right': (1, 0), 'left': (-1, 0)}
    leaves = root['children']
    def place(n, cell):
        shift = 0
        while cell in taken or (cell[0], round(cell[1])) in taken:
            shift += 1
            # siblings of a fan-out go right and alternate half a row, so their labels don't overlap
            cell = (cell[0] + 1, round(cell[1]) + (0.5 if shift % 2 else 0))
        pos[id(n)] = cell
        taken.add(cell)
    for r in rels:
        a, b = nodes.get(r['a']), nodes.get(r['b'])
        if not a or not b:
            continue
        d = next((v for k, v in dirs.items() if k in r['arrow']), (1, 0))
        if id(a) not in pos:
            place(a, (0, 0) if not pos else (max(c[0] for c in taken) + 1, 0))
        if id(b) not in pos:
            ax, ay = pos[id(a)]
            place(b, (ax + d[0], ay + d[1]))
    for n in leaves:
        if id(n) not in pos:
            place(n, (max((c[0] for c in taken), default=-1) + 1, 0))
    minx = min(c[0] for c in taken)
    miny = min(c[1] for c in taken)
    for n in leaves:
        n['w'], n['h'] = measure(n)
        cx, cy = pos[id(n)]
        n['x'], n['y'] = 20 + (cx - minx) * 320, 20 + (cy - miny) * 175


EA_TYPE = {'class': 'Class', 'abstract class': 'Class', 'interface': 'Interface', 'enum': 'Enumeration',
           'actor': 'Actor', 'usecase': 'UseCase', 'object': 'Object', 'component': 'Component',
           'artifact': 'Artifact', 'node': 'Node', 'rectangle': 'Boundary', 'frame': 'Boundary',
           'folder': 'Boundary', 'cloud': 'Component', 'database': 'Artifact', 'package': 'Boundary'}


def add_members(el, n):
    for line in n['members']:
        vis = VIS.get(line[0], 'Public')
        body = line[1:].strip() if line[0] in VIS else line.strip()
        body = re.sub(r'\{(static|abstract)\}\s*', '', body)
        if '(' in body:
            name = body[:body.index('(')].strip()
            # the parameter list ends at the parenthesis matching the first "(" (a return
            # type may have its own parentheses, e.g. "(answer, operations)")
            start, depth = body.index('('), 0
            for end in range(start, len(body)):
                depth += {'(': 1, ')': -1}.get(body[end], 0)
                if depth == 0:
                    break
            params = body[start + 1:end]
            ret = body[end + 1:].lstrip(' :').strip()
            op = el.Methods.AddNew(ea_text(name), ea_text(ret))
            op.Visibility = vis
            op.Update()
            for pos, p in enumerate([x.strip() for x in params.split(',') if x.strip() and x.strip() != '...']):
                pn, _, pt = p.partition(':')
                prm = op.Parameters.AddNew(ea_text(pn.strip()), ea_text(pt.strip()))
                prm.Position = pos
                prm.Update()
            if params.strip() == '...':
                op.Notes = 'ver firma completa en el código'
                op.Update()
        else:
            name, _, rest = body.partition(':')
            default = ''
            if '=' in rest:
                rest, default = rest.split('=', 1)
            at = el.Attributes.AddNew(ea_text(name.strip()), ea_text(rest.strip()))
            at.Visibility = vis
            if default.strip():
                at.Default = ea_text(default.strip())
            at.Update()


def build_struct(ea, pkg, name, lines, dtype):
    title = title_of(lines, name)
    sub = ea.drop_diagram(pkg, title)
    d = sub.Diagrams.AddNew(ea_text(title), dtype)
    d.Update()
    # show operation parameters as "name: type" (EA's default shows the type only)
    style = d.ExtendedStyle or ''
    d.ExtendedStyle = re.sub(r'OpParams=\d', 'OpParams=3', style) if 'OpParams=' in style else style + 'OpParams=3;'
    d.Update()
    root, nodes, rels, notes = parse_struct(lines)

    if dtype == 'Collaboration':
        hint_layout(root, nodes, rels)
        top_kids = root['children']
    else:
        actors = [c for c in root['children'] if c['kind'] == 'actor']
        others = [c for c in root['children'] if c['kind'] != 'actor']
        chain = {}

        def walk(n, ancestors):
            chain[id(n)] = ancestors + [id(n)]
            for c in n.get('children', []):
                walk(c, ancestors + [id(n)])
        walk(root, [])
        ADJ.clear()
        for r in rels:
            a, b = nodes.get(r['a']), nodes.get(r['b'])
            if a and b:
                for i in chain.get(id(a), []):
                    for j in chain.get(id(b), []):
                        if i != j:
                            ADJ.setdefault(i, set()).add(j)
                            ADJ.setdefault(j, set()).add(i)
        others = connected_order(others)
        for c in others:
            layout(c)
        targets = {r['b'] for r in rels}
        right = [a for a in actors if any(nodes.get(t) is a for t in targets)]
        left = [a for a in actors if a not in right]
        y = 30
        for a in left:
            a['w'], a['h'] = measure(a)
            a['x'], a['y'] = 20, y
            y += 130
        x0 = 150 if left else 20
        # other root elements in rows of up to 3 (tallest first keeps the page compact)
        x, y, row_h, col = x0, 20, 0, 0
        per_row = 1 if len(others) == 1 else (2 if len(others) <= 4 else 3)
        for c in others:
            if col == per_row:
                x, y, row_h, col = x0, y + row_h + 40, 0, 0
            c['x'], c['y'] = x, y
            x += c['w'] + 40
            row_h = max(row_h, c['h'])
            col += 1
        maxx = max((c['x'] + c['w'] for c in others), default=x0)
        y = 30
        for a in right:
            a['w'], a['h'] = measure(a)
            a['x'], a['y'] = maxx + 60, y
            y += 130
        top_kids = actors + others

    objs, rects = {}, {}
    z = [1000]

    def create(n, owner_pkg, ox, oy, depth):
        x, y = ox + n['x'], oy + n['y']
        if n.get('cw') and n['cw'] > n['w']:
            x += (n['cw'] - n['w']) / 2  # icon centred in its cell
        k = n['kind']
        # Containers are drawn as frames (Boundary): an EA package would list its contents on top.
        if False:
            p = owner_pkg.Packages.AddNew(ea_text(n['name']), 'Package')
            p.Update()
            owner_pkg.Packages.Refresh()
            el = p.Element
            if n['stereo']:
                el.Stereotype = n['stereo']
                el.Update()
            child_pkg = p
        else:
            t = EA_TYPE.get(k, 'Class')
            el = owner_pkg.Elements.AddNew(ea_text(n['name'].replace('\n', ' ') if k not in ('artifact', 'database') else n['name']), t)
            stereo = n['stereo']
            if k == 'database':
                stereo = stereo or 'database'
            if k == 'cloud':
                stereo = stereo or 'servicio externo'
            if stereo:
                el.Stereotype = ea_text(stereo)
            if k == 'abstract class':
                el.Abstract = '1'
            el.Update()
            add_members(el, n)
            el.Update()
            child_pkg = owner_pkg
        w, h = n['w'], n['h']
        o = d.DiagramObjects.AddNew(f'l={int(x)};r={int(x + w)};t={int(y)};b={int(y + h)};', '')
        o.ElementID = el.ElementID
        # z-order: EA draws a lower Sequence on top, so frames go behind what they contain
        o.Sequence = 100 - 10 * depth if n.get('children') else 1
        o.Update()
        objs[id(n)] = el
        rects[id(n)] = (x, y, w, h)
        for c in n.get('children', []):
            create(c, child_pkg, x, y, depth + 1)

    for n in top_kids:
        create(n, sub, 0, 0, 0)

    by_alias = {k: objs[id(v)] for k, v in nodes.items() if id(v) in objs}
    if dtype == 'Collaboration':  # one link per pair of objects, with all its messages
        merged = {}
        for r in rels:
            key = frozenset((id(nodes.get(r['a'])), id(nodes.get(r['b']))))
            if key in merged:
                merged[key]['label'] += ' / ' + r['label']
            else:
                merged[key] = dict(r)
        rels = list(merged.values())
    for r in rels:
        a, b = by_alias.get(r['a']), by_alias.get(r['b'])
        if not a or not b:
            continue
        arrow = re.sub(r'left|right|up|down', '', r['arrow'])
        label = r['label'].replace('\n', ' ')
        st = re.search(r'(?:<<|«)\s*([^>»]+?)\s*(?:>>|»)', label)
        stereo = st.group(1) if st else None
        label = re.sub(r'(?:<<|«)[^>»]+(?:>>|»)', '', label).strip(' ,')
        client, supplier, ctype, sub_t, direction = a, b, 'Association', None, 'Unspecified'
        cm, sm = r['ma'], r['mb']
        if '|>' in arrow or '<|' in arrow:
            ctype = 'Realisation' if '.' in arrow else 'Generalization'
            if arrow.startswith('<|'):
                client, supplier, cm, sm = b, a, sm, cm
        elif arrow.startswith(('*', 'o')) or arrow.endswith(('*', 'o')):
            ctype = 'Aggregation'
            sub_t = 'Strong' if '*' in arrow else 'Weak'
            whole_left = arrow.startswith(('*', 'o'))
            client, supplier = (b, a) if whole_left else (a, b)
            cm, sm = (sm, cm) if whole_left else (cm, sm)
        elif '(' in arrow or ')' in arrow:
            ctype = 'Usage'
        elif dtype == 'Component' and arrow.strip('-') == '' and b.Type == 'Component' and a.Type == 'Interface':
            client, supplier, ctype = b, a, 'Realisation'
        elif '.' in arrow:
            ctype = 'Dependency' if '>' in arrow or dtype != 'Deployment' else 'Dependency'
            if arrow.startswith('<'):
                client, supplier = b, a
        elif '>' in arrow or arrow.startswith('<'):
            direction = 'Source -> Destination'
            if arrow.startswith('<'):
                client, supplier = b, a
        if dtype == 'Collaboration':
            ctype, direction = 'Association', 'Unspecified'
        c = client.Connectors.AddNew(ea_text(label), ctype)
        c.SupplierID = supplier.ElementID
        if sub_t:
            c.Subtype = sub_t
        if stereo:
            c.Stereotype = ea_text(stereo)
        c.Direction = direction
        if cm:
            c.ClientEnd.Cardinality = cm
        if sm:
            c.SupplierEnd.Cardinality = sm
        c.Update()
        if ctype == 'Aggregation':
            c.SupplierEnd.Aggregation = 2 if sub_t == 'Strong' else 1
            c.SupplierEnd.Update()
            c.Update()

    # Notes go in a row under the diagram, linked to their element, so they never cover it.
    nx, ny = 20, max((y + h for x, y, w, h in rects.values()), default=0) + 40
    for nt in notes:
        tgt = nodes.get(nt['target'])
        if not tgt or id(tgt) not in rects:
            continue
        text = '\n'.join(nt['text'])
        nw = text_w(nt['text'], 6.3, 20, 140, 300)
        nh = 16 * len(nt['text']) + 16
        el = sub.Elements.AddNew('', 'Note')
        el.Notes = ea_text(text).replace('\n', '\r\n')
        el.Update()
        o = d.DiagramObjects.AddNew(f'l={int(nx)};r={int(nx + nw)};t={int(ny)};b={int(ny + nh)};', '')
        o.ElementID = el.ElementID
        o.Update()
        nx += nw + 30
        c = el.Connectors.AddNew('', 'NoteLink')
        c.SupplierID = objs[id(tgt)].ElementID
        c.Update()
    d.Update()
    return d


# ---------------------------------------------------------------- estados y actividad
def _put(d, el, x, y, w, h, seq=1):
    o = d.DiagramObjects.AddNew(f'l={x};r={x + w};t={y};b={y + h};', '')
    o.ElementID = el.ElementID
    o.Sequence = seq
    o.Update()


def _el(sub, name, etype, subtype=None, stereo=None):
    el = sub.Elements.AddNew(ea_text(name), etype)
    if subtype is not None:
        el.Subtype = subtype
    if stereo:
        el.Stereotype = stereo
    el.Update()
    return el


def _flow(a, b, ctype, name='', guard=''):
    c = a.Connectors.AddNew(ea_text(name), ctype)
    c.SupplierID = b.ElementID
    if guard:
        c.TransitionGuard = ea_text(guard)
    c.Update()
    return c


def _behaviors(st, lines):
    """State behaviours shown in the state's compartment: entry / do / exit and internal transitions."""
    for pos, text in enumerate(lines):
        m = st.Methods.AddNew(ea_text(text), '')
        m.Pos = pos
        m.Update()
    st.Update()


def build_states(ea, pkg, name, lines):
    title = title_of(lines, name)
    sub = ea.drop_diagram(pkg, title)
    d = sub.Diagrams.AddNew(ea_text(title), 'Statechart')
    d.Update()
    ini = _el(sub, '', 'StateNode', 3)
    active = _el(sub, 'ACTIVE', 'State')
    ini2 = _el(sub, '', 'StateNode', 3)
    colab = _el(sub, 'Colaborando', 'State')
    _behaviors(colab, [
        'entry / status = ACTIVE',
        'do / sincronizar diagrama y chat en la sala',
        'join-diagram [participante nuevo] / $push participante (online)',
        'join-diagram [participante conocido] / online = true, lastSeenAt = ahora',
        'lock-class, unlock-class / saveLocks(activeLocks)',
        'disconnect [quedan usuarios conectados] / online = false, liberar sus locks',
    ])
    paused = _el(sub, 'PAUSED', 'State')
    _behaviors(paused, ['entry / status = PAUSED'])
    closed = _el(sub, 'CLOSED', 'State')
    fin = _el(sub, '', 'StateNode', 4)

    _put(d, ini, 389, 15, 22, 22)
    _put(d, active, 120, 90, 560, 260, 50)
    _put(d, ini2, 145, 140, 20, 20)
    _put(d, colab, 200, 130, 460, 200)
    _put(d, paused, 160, 470, 480, 80)
    _put(d, closed, 760, 470, 200, 70)
    _put(d, fin, 1010, 494, 22, 22)

    _flow(ini, active, 'StateFlow', 'join-diagram [no existe sesión abierta] / crear sesión, participante online')
    _flow(ini2, colab, 'StateFlow')
    down = _flow(active, paused, 'StateFlow', 'disconnect [nadie conectado en la sala]\r\n/ status = PAUSED, liberar locks')
    up = _flow(paused, active, 'StateFlow', 'join-diagram / reanudar la MISMA sesión,\r\nemitir session:init-state (chat + bitácora)')
    _flow(closed, fin, 'StateFlow')

    for target, text, x, y, w in [
        (paused, 'La sesión conserva participantes, historial de chat y bitácora.\r\n'
                 'Pausar y reanudar es lo que permite continuar el trabajo otro día\r\n'
                 '"exactamente donde se quedó".', 120, 600, 420),
        (closed, 'Estado definido en el esquema; las consultas lo excluyen ($ne CLOSED).\r\n'
                 'Aún sin transición implementada (cierre manual previsto).', 600, 600, 400),
    ]:
        n = _el(sub, '', 'Note')
        n.Notes = ea_text(text)
        n.Update()
        _put(d, n, x, y, w, 64)
        c = n.Connectors.AddNew('', 'NoteLink')
        c.SupplierID = target.ElementID
        c.Update()
    d.Update()
    # the two transitions between ACTIVE and PAUSED run side by side, not on top of each other
    for c, dx in ((down, -150), (up, 150)):
        l = d.DiagramLinks.AddNew('', '')
        l.ConnectorID = c.ConnectorID
        l.Geometry = f'SX={dx};SY=0;EX={dx};EY=0;EDGE=0;$LLB=;LLT=;LMT=;LMB=;LRT=;LRB=;IRHS=;ILHS=;'
        l.Update()
    return d


def build_activity(ea, pkg, name, lines):
    title = title_of(lines, name)
    sub = ea.drop_diagram(pkg, title)
    d = sub.Diagrams.AddNew(ea_text(title), 'Activity')
    d.Update()
    N = {}

    def action(key, text, cx, y, w=230, h=48):
        N[key] = _el(sub, text, 'Action')
        _put(d, N[key], cx - w // 2, y, w, h)

    def diamond(key, text, cx, y, etype='Decision'):
        N[key] = _el(sub, text, etype)
        _put(d, N[key], cx - 15, y, 30, 30)

    def node(key, subtype, cx, y):
        N[key] = _el(sub, '', 'StateNode', subtype)
        _put(d, N[key], cx - 12, y, 24, 24)

    node('start', 100, 420, 20)
    action('recibir', 'Recibir pregunta + modelo + prompts (completo para Gemini, lite para Ollama)', 420, 70, 300, 52)
    diamond('dProv', '¿AI_PROVIDER?', 420, 150)
    action('gem', 'cadena = [Gemini]', 130, 220, 170)
    action('oll', 'cadena = [Ollama]', 330, 220, 170)
    diamond('dOrder', '¿AI_HYBRID_ORDER?', 640, 225)
    action('cf', 'orden = [Gemini, Ollama]', 540, 290, 180)
    action('lf', 'orden = [Ollama, Gemini]', 760, 290, 180)
    diamond('mOrder', '', 640, 365, 'MergeNode')
    action('sinKey', 'quitar Gemini si no hay GEMINI_API_KEY', 640, 420, 260)
    action('breaker', 'quitar proveedores con circuit breaker abierto (si todos lo están, intentar igual)', 640, 490, 300, 52)
    action('filtrada', 'cadena = orden filtrado', 640, 565, 200)
    diamond('mProv', '', 420, 640, 'MergeNode')
    diamond('mLoop', '', 420, 700, 'MergeNode')
    action('tomar', 'tomar el siguiente proveedor de la cadena', 420, 755, 280)
    diamond('dOllama', '¿es Ollama en modo hybrid?', 420, 835)
    action('conTimeout', 'llamar con timeout (20 s si va primero, 60 s si es respaldo) y AbortController', 240, 900, 300, 52)
    action('sinTimeout', 'llamar sin timeout', 610, 905, 180)
    diamond('mLlamada', '', 420, 985, 'MergeNode')
    diamond('dResp', '¿respondió?', 420, 1040)
    action('used', 'providerUsed = proveedor', 200, 1100, 220)
    action('validar', 'validateOperations(resultado)', 200, 1170, 220)
    action('devolver', 'devolver respuesta + providerUsed', 200, 1240, 240)
    node('fin1', 101, 200, 1315)
    diamond('dTimeout', '¿fue timeout?', 640, 1105)
    action('registrar', 'registrar "sin respuesta en N ms" (no abre el breaker: el modelo pudo estar cargando en RAM)', 520, 1170, 260, 62)
    action('abrir', 'abrir circuit breaker 30 s', 800, 1175, 200)
    diamond('mFallo', '', 640, 1260, 'MergeNode')
    diamond('dQuedan', '¿quedan proveedores?', 640, 1320)
    action('error503', 'lanzar 503 "Ningún proveedor de IA respondió"', 640, 1390, 300)
    node('fin2', 101, 640, 1465)

    F = lambda a, b, g='': _flow(N[a], N[b], 'ControlFlow', guard=g)
    F('start', 'recibir'); F('recibir', 'dProv')
    F('dProv', 'gem', 'gemini'); F('dProv', 'oll', 'ollama'); F('dProv', 'dOrder', 'hybrid')
    F('dOrder', 'cf', 'cloud-first'); F('dOrder', 'lf', 'local-first')
    F('cf', 'mOrder'); F('lf', 'mOrder'); F('mOrder', 'sinKey'); F('sinKey', 'breaker'); F('breaker', 'filtrada')
    F('gem', 'mProv'); F('oll', 'mProv'); F('filtrada', 'mProv'); F('mProv', 'mLoop'); F('mLoop', 'tomar')
    F('tomar', 'dOllama'); F('dOllama', 'conTimeout', 'sí'); F('dOllama', 'sinTimeout', 'no')
    F('conTimeout', 'mLlamada'); F('sinTimeout', 'mLlamada'); F('mLlamada', 'dResp')
    F('dResp', 'used', 'sí'); F('used', 'validar'); F('validar', 'devolver'); F('devolver', 'fin1')
    F('dResp', 'dTimeout', 'no'); F('dTimeout', 'registrar', 'sí'); F('dTimeout', 'abrir', 'error: caído / sin red')
    F('registrar', 'mFallo'); F('abrir', 'mFallo'); F('mFallo', 'dQuedan')
    F('dQuedan', 'mLoop', 'sí'); F('dQuedan', 'error503', 'no'); F('error503', 'fin2')
    d.Update()
    return d


DTYPE = {'com': 'Collaboration', 'uc': 'Use Case', 'paquetes': 'Package', 'clases': 'Logical',
         '03': 'Logical', '04': 'Logical', '01': 'Deployment', '02': 'Component'}
PKG = {'sequence': 'Diseño - Secuencia', 'Collaboration': 'Análisis - Comunicación', 'Use Case': 'Requisitos - Casos de uso',
       'Package': 'Análisis - Paquetes', 'Logical': 'Análisis y Diseño - Clases', 'Deployment': 'Diseño - Despliegue',
       'Component': 'Implementación - Componentes', 'states': 'Diseño - Estados', 'activity': 'Diseño - Actividad'}


def kind_of(name):
    if name.startswith(('seq_', '05', '06')):
        return 'sequence'
    if name.startswith('07'):
        return 'states'
    if name.startswith('08'):
        return 'activity'
    for prefix, t in DTYPE.items():
        if name.startswith(prefix):
            return t
    return None


def main(names):
    ea = EA(fresh=not names)
    try:
        files = []
        for root, _, fs in os.walk(SRC):
            for f in fs:
                if f.endswith('.plantuml'):
                    files.append(os.path.join(root, f))
        for path in sorted(files):
            name = os.path.splitext(os.path.basename(path))[0]
            if names and name not in names:
                continue
            lines = read(path)
            kind = kind_of(name)
            if kind is None:
                continue
            pkg = ea.package(PKG[kind])
            print(name, flush=True)
            if kind == 'sequence':
                d = build_sequence(ea, pkg, name, lines)
            elif kind == 'states':
                d = build_states(ea, pkg, name, lines)
            elif kind == 'activity':
                d = build_activity(ea, pkg, name, lines)
            else:
                d = build_struct(ea, pkg, name, lines, kind)
            print(name, '->', ea.export(d, name))
    finally:
        ea.close()


if __name__ == '__main__':
    main(sys.argv[1:])
