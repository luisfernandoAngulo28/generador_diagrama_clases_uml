// Genera un backend Spring Boot de prueba con todos los casos de mapeo OMT
// (herencia con clase abstracta, N:M, composición, agregación, 1:1, enum) para
// compilarlo y levantarlo. Uso (desde backend/, después de `npm run build`):
//   node scripts-prueba/generar-prueba-omt.mjs ../generated-out/prueba-omt
import fs from 'node:fs';
import path from 'node:path';
import { GeneratorService } from '../dist/generator/generator.service.js';

const out = path.resolve(process.argv[2] ?? '../generated-out/prueba-omt');
const pk = { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true };
const a = (name, type) => ({ name, type, visibility: 'private' });
const cls = (id, name, attributes, stereotype) => ({ id, name, attributes, ...(stereotype ? { stereotype } : {}) });
const rel = (id, type, sourceClassId, targetClassId) => ({ id, type, sourceClassId, targetClassId });

const model = {
  classes: [
    cls('persona', 'Persona', [pk, a('nombre', 'String'), a('email', 'String')], 'abstract'),
    cls('cliente', 'Cliente', [a('nit', 'String')]),
    cls('empleado', 'Empleado', [a('cargo', 'String'), a('sueldo', 'Double')]),
    cls('pedido', 'Pedido', [pk, a('fecha', 'LocalDate'), a('estado', 'EstadoPedido'), a('total', 'Double')]),
    cls('linea', 'LineaPedido', [pk, a('cantidad', 'Integer'), a('precioUnitario', 'Double')]),
    cls('producto', 'Producto', [pk, a('nombre', 'String'), a('precio', 'Double')]),
    cls('categoria', 'Categoria', [pk, a('nombre', 'String')]),
    cls('perfil', 'PerfilCliente', [pk, a('preferencias', 'String')]),
    cls('estado', 'EstadoPedido', [a('PENDIENTE', 'String'), a('PAGADO', 'String'), a('ENVIADO', 'String')], 'enum'),
    cls('tienda', 'Tienda', [pk, a('nombre', 'String')]),
  ],
  relations: [
    rel('r1', 'INHERITANCE', 'cliente', 'persona'),
    rel('r2', 'INHERITANCE', 'empleado', 'persona'),
    rel('r3', 'MANY_TO_ONE', 'pedido', 'cliente'),          // un cliente tiene muchos pedidos
    rel('r4', 'COMPOSITION', 'pedido', 'linea'),            // el todo (rombo) es el origen: la línea no existe sin su pedido
    rel('r5', 'MANY_TO_ONE', 'linea', 'producto'),
    rel('r6', 'MANY_TO_MANY', 'producto', 'categoria'),     // tabla intermedia
    rel('r7', 'ONE_TO_ONE', 'perfil', 'cliente'),
    rel('r8', 'AGGREGATION', 'tienda', 'empleado'),         // la tienda (todo) agrupa empleados que existen sin ella
  ],
};

const files = new GeneratorService().generate(model, { projectName: 'pruebaomt' });
fs.rmSync(out, { recursive: true, force: true });
for (const [file, content] of Object.entries(files)) {
  const target = path.join(out, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
fs.writeFileSync(path.join(out, 'modelo-prueba.json'), JSON.stringify(model, null, 2));
console.log(`${Object.keys(files).length} archivos en ${out}`);
