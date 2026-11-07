"""Acomoda a mano, en Enterprise Architect, los diagramas del Ciclo 1 que el
diseño automático de ea_builder.py deja enredados, y los vuelve a exportar:

    python docs/diagrams/ea/ajustar_ciclo1.py

- Casos de uso: los 12 casos en una columna, el usuario a la izquierda y el
  Asistente de IA a la derecha, a la altura de CU10 y CU12.
- Paquetes: frontend → backend → servicios externos, de izquierda a derecha.
- Comunicación CU2 y CU11: el actor habla con dos objetos, así que el tercero
  se pone al costado para que los enlaces no se superpongan.
"""
import os

import win32com.client

HERE = os.path.dirname(os.path.abspath(__file__))
EAP = os.path.join(HERE, 'ciclo1.eap')
IMG = os.path.join(HERE, 'img', 'ciclo1')


def diagrams(pkg):
    for i in range(pkg.Diagrams.Count):
        yield pkg.Diagrams.GetAt(i)
    for i in range(pkg.Packages.Count):
        yield from diagrams(pkg.Packages.GetAt(i))


def objects(r, d):
    """{nombre del elemento: objeto del diagrama}"""
    out = {}
    for i in range(d.DiagramObjects.Count):
        o = d.DiagramObjects.GetAt(i)
        el = r.GetElementByID(o.ElementID)
        out[el.Name.replace('\r\n', ' ').replace('\n', ' ')] = o
    return out


def put(o, x, y, w=None, h=None):
    w = w if w is not None else o.right - o.left
    h = h if h is not None else o.top - o.bottom  # EA guarda top/bottom negativos
    o.left, o.right, o.top, o.bottom = int(x), int(x + w), -int(y), -int(y + h)
    o.Update()


def casos_de_uso(r, d):
    objs = objects(r, d)
    uc = sorted((n for n in objs if n.startswith('CU')), key=lambda n: int(n.split()[0][2:]))
    x, y0, step, w, h = 300, 70, 72, 200, 56
    for k, n in enumerate(uc):
        put(objs[n], x, y0 + k * step, w, h)
    last = y0 + (len(uc) - 1) * step + h
    put(objs['Herramienta CASE — Modelado UML'], x - 50, y0 - 40, w + 100, last - y0 + 70)
    put(objs['Usuario'], 90, y0 + 5 * step)
    # El colaborador solo participa en CU7: a la derecha, a su altura, sin cruzar líneas.
    put(objs['Usuario Colaborador'], 680, y0 + 6 * step - 10)
    ia = next(n for n in objs if n.startswith('Asistente de IA'))
    put(objs[ia], 680, y0 + 10 * step)


def paquetes(r, d):
    objs = objects(r, d)
    w, h = 200, 56
    put(objs['Frontend (React + Vite)'], 20, 40, 240, 4 * 90 + 30)
    # Chat → client ← Lienzo → socket: cada dependencia queda entre vecinos.
    for k, n in enumerate(['Panel de Chat IA', 'api/client.ts', 'Lienzo UML (React Flow)', 'api/socket.ts']):
        put(objs[n], 40, 80 + k * 90, w, h)
    put(objs['Backend (NestJS)'], 380, 40, 240, 3 * 90 + 30)
    for k, n in enumerate(['diagrams', 'generator', 'ai']):
        put(objs[n], 400, 80 + k * 90, w, h)
    put(objs['PostgreSQL'], 720, 80, w, h)
    put(objs['Google Gemini API'], 720, 260, w, h)


def tercero_al_costado(nombre):
    def ajustar(r, d):
        objs = objects(r, d)
        b, c = objs[':LienzoUML' if nombre == ':Inspector' else ':ChatPanel'], objs[nombre]
        put(c, b.right + 180, -b.top)
    return ajustar


AJUSTES = {
    'Diagrama General de Casos de Uso': casos_de_uso,
    'Diagrama de Paquetes del Sistema': paquetes,
    'CU2 ': tercero_al_costado(':Inspector'),
    'CU11 ': tercero_al_costado(':Web Speech API'),
}
ARCHIVO = {'Diagrama General de Casos de Uso': 'uc_general', 'Diagrama de Paquetes del Sistema': 'paquetes',
           'CU2 ': 'com_cu2', 'CU11 ': 'com_cu11'}


def main():
    r = win32com.client.Dispatch('EA.Repository')
    if not r.OpenFile(EAP):
        raise RuntimeError('No se pudo abrir ' + EAP)
    try:
        for d in diagrams(r.Models.GetAt(0)):
            for prefix, fn in AJUSTES.items():
                if d.Name.startswith(prefix) and (prefix.startswith('Diagrama') or d.Type == 'Collaboration'):
                    fn(r, d)
                    d.Update()
                    r.ReloadDiagram(d.DiagramID)
                    path = os.path.join(IMG, ARCHIVO[prefix] + '.png')
                    r.GetProjectInterface().PutDiagramImageToFile(d.DiagramGUID, path, 1)
                    print(d.Name, '->', path)
    finally:
        r.CloseFile()
        r.Exit()


if __name__ == '__main__':
    main()
