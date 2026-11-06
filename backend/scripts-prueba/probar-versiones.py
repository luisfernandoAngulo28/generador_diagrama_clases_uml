"""Prueba de punta a punta del historial de versiones contra la pila LOCAL.
Uso: python backend/scripts-prueba/probar-versiones.py  (lee el usuario de prueba de
backend/scripts-prueba/usuario-prueba-local.md, que no se sube a git)."""
import json
import pathlib
import re
import urllib.request

BASE = 'http://localhost'
cred = pathlib.Path(__file__).with_name('usuario-prueba-local.md').read_text(encoding='utf-8')
email = re.search(r'Correo: (\S+)', cred).group(1)
password = re.search(r'Contraseña: (\S+)', cred).group(1)


def call(method, path, body=None, token=None):
    req = urllib.request.Request(BASE + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Content-Type': 'application/json',
                                          **({'Authorization': f'Bearer {token}'} if token else {})})
    with urllib.request.urlopen(req) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def klass(cid, name, *attrs):
    return {'id': cid, 'name': name, 'position': {'x': 0, 'y': 0},
            'attributes': [{'name': 'id', 'type': 'Long', 'visibility': 'private', 'isPrimaryKey': True},
                           *[{'name': a, 'type': 'Double', 'visibility': 'private'} for a in attrs]]}


def versions(d, token):
    return call('GET', f'/diagrams/{d}/versions', token=token)


token = call('POST', '/auth/login', {'email': email, 'password': password})['token']
d = call('POST', '/diagrams', {'name': 'Prueba versiones', 'model': {'classes': [klass('c1', 'Pedido')], 'relations': []}}, token)['id']
call('PATCH', f'/diagrams/{d}', {'model': {'classes': [klass('c1', 'Pedido', 'total'), klass('c2', 'Cliente')], 'relations': []}}, token)
call('PATCH', f'/diagrams/{d}', {'model': {'classes': [klass('c1', 'Pedido', 'total'), klass('c2', 'Cliente'), klass('c3', 'Producto')], 'relations': []}}, token)
call('PATCH', f'/diagrams/{d}', {'source': 'AI', 'model': {'classes': [klass('c1', 'Pedido', 'total'), klass('c2', 'Cliente'), klass('c3', 'Producto'), klass('c4', 'Factura')], 'relations': []}}, token)

print('1) Crear + 2 guardados manuales seguidos + 1 cambio de la IA:')
for v in versions(d, token):
    print(f"   v{v['number']} {v['author']['userName']} {v['source']:6} clases={v['classCount']} cambios={v['changesCount']} | {v['summary']}")

v1 = next(v for v in versions(d, token) if v['number'] == 1)
restored = call('POST', f'/diagrams/{d}/versions/{v1["id"]}/restore', token=token)
print(f"2) Restaurar v1 -> el diagrama vuelve a {len(restored['model']['classes'])} clase(s): {[c['name'] for c in restored['model']['classes']]}")
for v in versions(d, token):
    print(f"   v{v['number']} {v['source']:6} clases={v['classCount']} restoredFrom={v.get('restoredFrom')} | {v['summary']}")
print('3) Bitácora (lo último):')
for h in call('GET', f'/diagrams/{d}/history', token=token)[:4]:
    print('   ' + h['summary'])
print('diagramId', d)
