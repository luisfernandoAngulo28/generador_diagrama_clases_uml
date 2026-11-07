"""Acomoda a mano, en Enterprise Architect, el diagrama de despliegue del
Ciclo 2 (el diseño automático de ea_builder.py dispersa los nodos externos) y
lo vuelve a exportar:

    python docs/diagrams/ea/ajustar_ciclo2.py

Los dispositivos de los usuarios quedan a la izquierda, el servidor de AWS en
el centro y los servicios externos debajo, en una fila. Cada nodo se mueve con
todo lo que tiene adentro.
"""
import os

import win32com.client

HERE = os.path.dirname(os.path.abspath(__file__))
EAP = os.path.join(HERE, 'ciclo2.eap')
IMG = os.path.join(HERE, 'img')


def diagrams(pkg):
    for i in range(pkg.Diagrams.Count):
        yield pkg.Diagrams.GetAt(i)
    for i in range(pkg.Packages.Count):
        yield from diagrams(pkg.Packages.GetAt(i))


def rect(o):
    return o.left, -o.top, o.right, -o.bottom  # x0, y0, x1, y1 (y hacia abajo)


def contenido(objs, raiz):
    """Lo que está dentro de `raiz` en el diagrama original. Se calcula antes de
    mover nada: un nodo ya movido podría caer dentro del área vieja de otro."""
    x0, y0, x1, y1 = rect(raiz)
    return [o for o in objs if o.InstanceID != raiz.InstanceID and
            x0 <= rect(o)[0] and rect(o)[2] <= x1 and y0 <= rect(o)[1] and rect(o)[3] <= y1]


def mover(raiz, dentro, x, y):
    """Lleva el nodo `raiz` a (x, y) junto con lo que tenía adentro."""
    x0, y0, x1, y1 = rect(raiz)
    dx, dy = x - x0, y - y0
    for o in [raiz] + dentro:
        a, b, c, d = rect(o)
        o.left, o.right, o.top, o.bottom = int(a + dx), int(c + dx), -int(b + dy), -int(d + dy)
        o.Update()
    return x1 - x0, y1 - y0


def despliegue(r, d):
    objs = [d.DiagramObjects.GetAt(i) for i in range(d.DiagramObjects.Count)]
    por_nombre = {}
    for o in objs:
        el = r.GetElementByID(o.ElementID)
        por_nombre.setdefault(el.Name.split('\n')[0].strip(), o)

    def nodo(prefijo):
        return next(o for n, o in por_nombre.items() if n.startswith(prefijo))

    nombres = ('PC del usuario', 'Celular Android', 'AWS EC2', 'Amazon S3', 'Google Cloud', 'Equipo local')
    grupos = {n: (nodo(n), contenido(objs, nodo(n))) for n in nombres}

    def a(n, x, y):
        return mover(*grupos[n], x, y)

    w_pc, h_pc = a('PC del usuario', 20, 60)
    a('Celular Android', 20, 60 + h_pc + 40)
    xs = 20 + max(w_pc, 300) + 70
    w_vps, h_vps = a('AWS EC2', xs, 40)
    fila = 40 + h_vps + 60
    x = xs
    for n in ('Amazon S3', 'Google Cloud', 'Equipo local'):
        w, _ = a(n, x, fila)
        x += w + 50
    nota = next(o for o in objs if r.GetElementByID(o.ElementID).Type == 'Note')
    a, b, c, dd = rect(nota)
    nota.left, nota.right, nota.top, nota.bottom = 20, 20 + (c - a), -(fila + 230), -(fila + 230 + dd - b)
    nota.Update()


def main():
    r = win32com.client.Dispatch('EA.Repository')
    if not r.OpenFile(EAP):
        raise RuntimeError('No se pudo abrir ' + EAP)
    try:
        for d in diagrams(r.Models.GetAt(0)):
            if d.Name.startswith('Diagrama de Despliegue') and d.Type == 'Deployment':
                despliegue(r, d)
                d.Update()
                r.ReloadDiagram(d.DiagramID)
                path = os.path.join(IMG, '01_despliegue.png')
                r.GetProjectInterface().PutDiagramImageToFile(d.DiagramGUID, path, 1)
                print(d.Name, '->', path)
    finally:
        r.CloseFile()
        r.Exit()


if __name__ == '__main__':
    main()
