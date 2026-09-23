import { describe, expect, it } from 'vitest';
import { renderXmi } from './xmi.util.js';
import { parseXmi } from './xmi-import.util.js';
import type { UmlModel } from './uml.types.js';

describe('parseXmi', () => {
  it('round-trips a model exported by renderXmi', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'c1',
          name: 'Pedido',
          attributes: [
            { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
            { name: 'total', type: 'Double', visibility: 'private' },
          ],
          operations: [{ name: 'confirmar', returnType: 'void', visibility: 'public' }],
        },
        {
          id: 'c2',
          name: 'Cliente',
          attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
        },
      ],
      relations: [
        {
          id: 'r1',
          type: 'ONE_TO_MANY',
          sourceClassId: 'c2',
          targetClassId: 'c1',
          sourceRole: 'pedidos',
        },
        { id: 'r2', type: 'DEPENDENCY', sourceClassId: 'c1', targetClassId: 'c2' },
      ],
    };

    const xml = renderXmi('Ventas', model);
    const { name, model: parsed } = parseXmi(xml);

    expect(name).toBe('Ventas');
    expect(parsed.classes).toHaveLength(2);

    const pedido = parsed.classes.find((c) => c.name === 'Pedido');
    expect(pedido?.attributes).toEqual([
      { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
      { name: 'total', type: 'Double', visibility: 'private', isPrimaryKey: undefined },
    ]);
    expect(pedido?.operations).toEqual([
      { name: 'confirmar', returnType: 'void', visibility: 'public' },
    ]);

    expect(parsed.relations).toHaveLength(2);
    const oneToMany = parsed.relations.find((r) => r.type === 'ONE_TO_MANY');
    expect(oneToMany?.sourceRole).toBe('pedidos');
    const dependency = parsed.relations.find((r) => r.type === 'DEPENDENCY');
    expect(dependency).toBeTruthy();
  });

  it('infers a relation type from multiplicities when there is no name hint', () => {
    const foreignXmi = `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1">
  <uml:Model xmi:type="uml:Model" xmi:id="model_1" name="Externo">
    <packagedElement xmi:type="uml:Class" xmi:id="A" name="Autor">
      <ownedAttribute xmi:id="A_id" name="id" visibility="private" type="Long"/>
    </packagedElement>
    <packagedElement xmi:type="uml:Class" xmi:id="B" name="Libro">
      <ownedAttribute xmi:id="B_id" name="id" visibility="private" type="Long"/>
    </packagedElement>
    <packagedElement xmi:type="uml:Association" xmi:id="R1">
      <memberEnd xmi:idref="R1_src"/>
      <memberEnd xmi:idref="R1_tgt"/>
      <ownedEnd xmi:id="R1_src" type="A">
        <lowerValue xmi:type="uml:LiteralInteger" value="0"/>
        <upperValue xmi:type="uml:LiteralUnlimitedNatural" value="*"/>
      </ownedEnd>
      <ownedEnd xmi:id="R1_tgt" type="B">
        <lowerValue xmi:type="uml:LiteralInteger" value="0"/>
        <upperValue xmi:type="uml:LiteralUnlimitedNatural" value="*"/>
      </ownedEnd>
    </packagedElement>
  </uml:Model>
</xmi:XMI>`;

    const { model } = parseXmi(foreignXmi);
    expect(model.classes.map((c) => c.name)).toEqual(['Autor', 'Libro']);
    expect(model.relations).toEqual([
      expect.objectContaining({ type: 'MANY_TO_MANY', sourceClassId: 'A', targetClassId: 'B' }),
    ]);
  });

  it('rejects a file with no uml:Model element', () => {
    expect(() => parseXmi('<not-xmi/>')).toThrow(/XMI válido/);
  });

  it('rejects a file with no classes', () => {
    const empty = `<xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1">
  <uml:Model xmi:type="uml:Model" xmi:id="model_1" name="Vacio"></uml:Model>
</xmi:XMI>`;
    expect(() => parseXmi(empty)).toThrow(/No se encontraron clases/);
  });

  it('round-trips «enum», «abstract» and «interface» stereotypes', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'c1',
          name: 'Persona',
          stereotype: 'abstract',
          attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
        },
        {
          id: 'c2',
          name: 'Estado',
          stereotype: 'enum',
          attributes: [
            { name: 'ACTIVO', type: 'String', visibility: 'public' },
            { name: 'INACTIVO', type: 'String', visibility: 'public' },
          ],
        },
        {
          id: 'c3',
          name: 'Notificador',
          stereotype: 'interface',
          attributes: [],
          operations: [{ name: 'enviar', returnType: 'void', visibility: 'public' }],
        },
      ],
      relations: [],
    };

    const xml = renderXmi('Stereotypes', model);
    const { model: parsed } = parseXmi(xml);

    const persona = parsed.classes.find((c) => c.name === 'Persona');
    const estado = parsed.classes.find((c) => c.name === 'Estado');
    const notificador = parsed.classes.find((c) => c.name === 'Notificador');

    expect(persona?.stereotype).toBe('abstract');
    expect(estado?.stereotype).toBe('enum');
    expect(estado?.attributes.map((a) => a.name)).toEqual(['ACTIVO', 'INACTIVO']);
    expect(notificador?.stereotype).toBe('interface');
    expect(notificador?.operations).toEqual([
      { name: 'enviar', returnType: 'void', visibility: 'public' },
    ]);
  });

  it('parses Enterprise Architect exported XMI with nested packages', () => {
    const eaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmi:version="2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1">
  <uml:Model xmi:type="uml:Model" name="EA_Model" visibility="public">
    <packagedElement xmi:type="uml:Package" xmi:id="PKG1" name="Starter Class Diagram" visibility="public">
      <packagedElement xmi:type="uml:Class" xmi:id="C1" name="Cliente" visibility="public">
        <ownedAttribute xmi:type="uml:Property" xmi:id="A1" name="id" visibility="private">
          <type xmi:type="uml:PrimitiveType" href="http://schema.omg.org/spec/UML/2.1/uml.xml#Integer"/>
        </ownedAttribute>
        <ownedAttribute xmi:type="uml:Property" xmi:id="A2" name="nombre" visibility="private">
          <type xmi:type="uml:PrimitiveType" href="http://schema.omg.org/spec/UML/2.1/uml.xml#String"/>
        </ownedAttribute>
      </packagedElement>
      <packagedElement xmi:type="uml:Class" xmi:id="C2" name="Pedido" visibility="public">
        <ownedAttribute xmi:type="uml:Property" xmi:id="A3" name="id" visibility="private">
          <type xmi:type="uml:PrimitiveType" href="http://schema.omg.org/spec/UML/2.1/uml.xml#Integer"/>
        </ownedAttribute>
      </packagedElement>
    </packagedElement>
  </uml:Model>
</xmi:XMI>`;
    const { model } = parseXmi(eaXml);
    expect(model.classes).toHaveLength(2);
    const cliente = model.classes.find((c) => c.name === 'Cliente');
    expect(cliente?.attributes).toEqual([
      { name: 'id', type: 'Integer', visibility: 'private', isPrimaryKey: true },
      { name: 'nombre', type: 'String', visibility: 'private', isPrimaryKey: undefined },
    ]);
  });
});
